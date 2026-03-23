import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import openai from '@/lib/openai'
import { getSystemPrompt } from '@/lib/prompts/description-generator'

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
    const { productName, category, features, platform, tone } = body

    if (!productName?.trim() || !features?.trim()) {
      return NextResponse.json({ error: 'Nazwa produktu i cechy są wymagane' }, { status: 400 })
    }

    // 5. GENERUJ Z OPENAI
    const systemPrompt = getSystemPrompt(platform || 'allegro', tone || 'profesjonalny')

    const userPrompt = `Wygeneruj opis produktu:

NAZWA: ${productName.trim()}
KATEGORIA: ${category || 'Ogólna'}
PLATFORMA: ${platform || 'allegro'}
TON: ${tone || 'profesjonalny'}

CECHY PRODUKTU:
${features.trim()}

Odpowiedz WYŁĄCZNIE czystym JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('Brak odpowiedzi z AI')
    }

    const result = JSON.parse(content)

    // 6. ZAPISZ DO BAZY
    const { data: description } = await supabase
      .from('descriptions')
      .insert({
        user_id: user.id,
        product_name: productName.trim(),
        category: category || null,
        features: features.trim(),
        platform: platform || 'allegro',
        tone: tone || 'profesjonalny',
        source_type: 'form',
        seo_title: result.seoTitle,
        short_description: result.shortDescription,
        long_description: result.longDescription,
        tags: result.tags || [],
        meta_description: result.metaDescription,
        quality_score: result.qualityScore || 0,
        quality_tips: (result.qualityTips || []).map((t: any) => JSON.stringify(t)),
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
      ...result,
      descriptionId: description?.id || null,
      creditsRemaining: profile.credits_limit - profile.credits_used - 1,
    })

  } catch (error: any) {
    console.error('Generate Error:', error)

    if (error.message?.includes('JSON')) {
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
