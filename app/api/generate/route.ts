import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildCategoryContextForPrompt } from '@/lib/allegro/category-prompt'
import { parseCategoryField } from '@/lib/allegro/category-selection'
import { buildSmartTitleTrimmingUserBlock } from '@/lib/generation/smart-title-trimming'
import { getDescriptionChatModel } from '@/lib/generation/description-model'
import { sanitizeGenerateResult } from '@/lib/generation/sanitize-generate-result'
import openai from '@/lib/openai'
import { getPlatformProfile } from '@/lib/platforms'
import {
  DESCRIPTION_PROMPT_VERSION,
  getSystemPrompt,
  getToneReinforcementUserBlock,
  normalizeToneKey,
} from '@/lib/prompts/description-generator'
import type { QualityTip } from '@/lib/types'

function isRefinementBlockingTip(tip: QualityTip): boolean {
  if (tip.type !== 'warning' && tip.type !== 'error') return false
  const x = tip.text.toLowerCase()
  return (
    /dodaj więcej wariant|słów kluczowych|tag(i|ów)? seo|hashtag|backend/i.test(x) ||
    /opis długi|ok\.\s*\d+\s*słów|min\.\s*\d+\s*słów|rozważ\s+(dopisanie|rozbudow)/i.test(x) ||
    /meta\b|meta description/i.test(x) ||
    /wezwania|cta|działania/i.test(x) ||
    (/tytuł/i.test(x) && /słowo kluczowe|seo|fraza|słab/i.test(x))
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. STWÓRZ KLIENTA SUPABASE
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }) } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }) } catch {}
          },
        },
      }
    )

    // 2. SPRAWDŹ AUTH
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    // 3. SPRAWDŹ KREDYTY
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil nie znaleziony' }, { status: 404 })
    }

    if (profile.credits_used >= profile.credits_limit) {
      return NextResponse.json({
        error: 'Wykorzystałeś limit opisów w tym miesiącu.',
        upgradeRequired: true,
      }, { status: 403 })
    }

    // 4. WALIDACJA INPUTU
    const body = await req.json()
    const {
      productName,
      category,
      features,
      platform,
      tone,
      brandVoice,
      refinementOf,
      refinementInstruction,
    } = body as {
      productName?: string
      category?: string
      features?: string
      platform?: string
      tone?: string
      brandVoice?: { tone?: string; style?: string }
      refinementOf?: {
        seoTitle?: string
        shortDescription?: string
        longDescription?: string
        tags?: string[]
        metaDescription?: string
      }
      refinementInstruction?: string
    }

    if (!productName?.trim() || !features?.trim()) {
      return NextResponse.json({ error: 'Nazwa produktu i cechy są wymagane' }, { status: 400 })
    }

    // 5. GENERUJ Z OPENAI
    const platformSlug = (platform || 'allegro') as string
    const platformProfileForTrim = getPlatformProfile(platformSlug)
    const smartTitleBlock = buildSmartTitleTrimmingUserBlock(
      productName.trim(),
      platformProfileForTrim.titleMaxChars,
      platformProfileForTrim.name,
      platformSlug
    )

    const toneKey = normalizeToneKey(tone || 'profesjonalny')
    const toneReinforcementBlock = getToneReinforcementUserBlock(toneKey)

    const systemPrompt = getSystemPrompt(
      platformSlug,
      toneKey,
      brandVoice
    )

    const catParsed = parseCategoryField(
      typeof category === 'string' ? category : ''
    )

    let categoryBlock: string
    if (catParsed.type === 'category') {
      categoryBlock = buildCategoryContextForPrompt(catParsed.selection)
    } else if (catParsed.type === 'custom') {
      categoryBlock = buildCategoryContextForPrompt(catParsed.selection)
    } else if (catParsed.type === 'legacy') {
      categoryBlock = `KATEGORIA (wcześniejszy zapis tekstowy): „${catParsed.label}". Traktuj jako ogólny kontekst branżowy.`
    } else {
      categoryBlock = buildCategoryContextForPrompt(null)
    }

    const featureLines = features.trim().split('\n').filter((l: string) => l.trim())
    const structured: string[] = []
    const freeform: string[] = []
    for (const line of featureLines) {
      if (/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]+\s*:/.test(line.trim())) {
        structured.push(line.trim())
      } else {
        freeform.push(line.trim())
      }
    }

    let featuresBlock = ''
    if (structured.length > 0) {
      featuresBlock += `SPECYFIKACJA (dane strukturalne — UŻYWAJ TYLKO TYCH WARTOŚCI):\n${structured.join('\n')}\n`
    }
    if (freeform.length > 0) {
      featuresBlock += `${structured.length > 0 ? '\n' : ''}DODATKOWE CECHY:\n${freeform.join('\n')}\n`
    }

    const MAX_REFINE_LONG = 14_000
    const longRef =
      typeof refinementOf?.longDescription === 'string'
        ? refinementOf.longDescription.length > MAX_REFINE_LONG
          ? `${refinementOf.longDescription.slice(0, MAX_REFINE_LONG)}\n…[ucięto do ${MAX_REFINE_LONG} zn.]`
          : refinementOf.longDescription
        : ''

    const refinementBlock =
      refinementOf &&
      typeof refinementInstruction === 'string' &&
      refinementInstruction.trim()
        ? `

--- POPRZEDNI WYNIK DO ULEPSZENIA (nie kopiuj ślepo — popraw zgodnie z poleceniem; zachowaj zgodność z CECHAMI) ---
seoTitle: ${String(refinementOf.seoTitle ?? '')}
shortDescription: ${String(refinementOf.shortDescription ?? '')}
longDescription (HTML): ${longRef}
tags: ${JSON.stringify(refinementOf.tags ?? [])}
metaDescription: ${String(refinementOf.metaDescription ?? '')}

POLECENIE POPRAWY (Quality Score / użytkownik):
${refinementInstruction.trim()}
`
        : ''

    const userPrompt = `Wygeneruj opis produktu:

NAZWA: ${productName.trim()}
${categoryBlock}
PLATFORMA: ${platformSlug}
TON: ${toneKey}

${featuresBlock}
WAŻNE: Nie wymyślaj parametrów ani cech, których nie ma powyżej. Bazuj WYŁĄCZNIE na podanych danych.
${smartTitleBlock}
${refinementBlock}
${toneReinforcementBlock}

Odpowiedz WYŁĄCZNIE czystym JSON.`

    const isRefinement =
      Boolean(refinementOf) &&
      typeof refinementInstruction === 'string' &&
      refinementInstruction.trim().length > 0

    const chatModel = getDescriptionChatModel(profile.plan as string, {
      isRefinement,
    })

    const temperature = isRefinement ? 0.34 : 0.68
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('Brak odpowiedzi z AI')
    }

    const platformProfile = getPlatformProfile(platformSlug)
    const raw = JSON.parse(content) as Record<string, unknown>
    let sanitized = sanitizeGenerateResult(raw, platformProfile)

    // Refinement autopilot: jeśli po 1. próbie nadal są kluczowe warningi, zrób 1 dodatkowy przebieg.
    const blockingTips = sanitized.qualityTips.filter(isRefinementBlockingTip)
    if (isRefinement && blockingTips.length > 0) {
      const retryPrompt = `${userPrompt}

--- WALIDACJA PO 1 PRÓBIE (musisz poprawić i zwrócić NOWY JSON) ---
Pierwsza wersja nadal ma luki:
${blockingTips.map((t) => `• [${t.type}] ${t.text}`).join('\n')}

Zasady retry:
- Napraw KAŻDY punkt powyżej, nie psując sekcji oznaczonych jako sukces.
- Jeśli problem dotyczy tags: rozszerz listę o nowe, sensowne frazy i usuń duplikaty znaczeniowe.
- Jeśli problem dotyczy długości opisu: dobij wymagane minimum słów.
- Dopilnuj limitów platformy i formatu (HTML/plain text).
Odpowiedz WYŁĄCZNIE czystym JSON.`

      try {
        const retryCompletion = await openai.chat.completions.create({
          model: chatModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: retryPrompt },
          ],
          temperature: 0.24,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        })
        const retryContent = retryCompletion.choices[0].message.content
        if (retryContent) {
          const retryRaw = JSON.parse(retryContent) as Record<string, unknown>
          const retrySanitized = sanitizeGenerateResult(retryRaw, platformProfile)
          const retryBlocking = retrySanitized.qualityTips.filter(isRefinementBlockingTip).length
          const currentBlocking = blockingTips.length
          if (
            retryBlocking < currentBlocking ||
            (retryBlocking === currentBlocking &&
              retrySanitized.qualityScore > sanitized.qualityScore)
          ) {
            sanitized = retrySanitized
          }
        }
      } catch (retryErr) {
        console.warn('Refinement retry skipped:', retryErr)
      }
    }

    // 6. ZAPISZ DO BAZY
    const { data: description } = await supabase
      .from('descriptions')
      .insert({
        user_id: user.id,
        product_name: productName.trim(),
        category: category || null,
        features: features.trim(),
        platform: platformSlug,
        tone: tone || 'profesjonalny',
        source_type: 'form',
        seo_title: sanitized.seoTitle,
        short_description: sanitized.shortDescription,
        long_description: sanitized.longDescription,
        tags: sanitized.tags,
        meta_description: sanitized.metaDescription,
        quality_score: sanitized.qualityScore,
        quality_tips: sanitized.qualityTips.map((t: QualityTip) => JSON.stringify(t)),
        prompt_version: DESCRIPTION_PROMPT_VERSION,
      })
      .select()
      .single()

    // 7. AKTUALIZUJ KREDYTY
    await supabase
      .from('profiles')
      .update({ credits_used: profile.credits_used + 1 })
      .eq('id', user.id)

    // 8. ZWRÓĆ WYNIK
    return NextResponse.json({
      seoTitle: sanitized.seoTitle,
      shortDescription: sanitized.shortDescription,
      longDescription: sanitized.longDescription,
      tags: sanitized.tags,
      metaDescription: sanitized.metaDescription,
      qualityScore: sanitized.qualityScore,
      qualityTips: sanitized.qualityTips,
      promptVersion: DESCRIPTION_PROMPT_VERSION,
      platformLimits: {
        slug: platformProfile.slug,
        titleMaxChars: platformProfile.titleMaxChars,
        shortDescMax: platformProfile.charLimits.shortDesc,
        metaDescMax: platformProfile.charLimits.metaDesc,
        longDescMinWords: platformProfile.charLimits.longDescMinWords,
      },
      descriptionId: description?.id || null,
      creditsRemaining: profile.credits_limit - profile.credits_used - 1,
    })

  } catch (error: unknown) {
    console.error('Generate Error:', error)
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('JSON')) {
      return NextResponse.json(
        { error: 'AI zwróciło nieprawidłowy format. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Błąd generowania opisu. Spróbuj ponownie za chwilę.' },
      { status: 500 }
    )
  }
}
