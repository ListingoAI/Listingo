import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import openai from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { brandName, sampleDescriptions, customInstructions, forbiddenWords, preferredWords } = body

    if (!sampleDescriptions || sampleDescriptions.length === 0) {
      return NextResponse.json({ error: 'Dodaj przynajmniej jeden przykładowy opis' }, { status: 400 })
    }

    // Analizuj styl za pomocą AI
    const analysisPrompt = `Przeanalizuj poniższe opisy produktów i określ styl pisania autora.

OPISY:
${sampleDescriptions.map((d: string, i: number) => `--- OPIS ${i + 1} ---\n${d}\n`).join('\n')}

Przeanalizuj i zwróć JSON:
{
  "detected_tone": "opis tonu w 3-5 słowach (np. 'Profesjonalny z nutą ciepła')",
  "detected_style": "opis stylu w 2-3 zdaniach (np. 'Średniej długości zdania. Częste listy punktowane. Pytania retoryczne do czytelnika.')",
  "summary": "Podsumowanie stylu w 2-3 zdaniach po polsku"
}

Odpowiedz WYŁĄCZNIE czystym JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Jesteś ekspertem od analizy stylu pisania. Odpowiadaj po polsku.' },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    // Zapisz/aktualizuj w bazie (upsert)
    const { error: dbError } = await supabase
      .from('brand_voices')
      .upsert({
        user_id: user.id,
        brand_name: brandName || null,
        sample_descriptions: sampleDescriptions.filter((s: string) => s.trim()),
        detected_tone: analysis.detected_tone || null,
        detected_style: analysis.detected_style || null,
        custom_instructions: customInstructions || null,
        forbidden_words: forbiddenWords || [],
        preferred_words: preferredWords || [],
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ error: 'Błąd zapisu' }, { status: 500 })
    }

    return NextResponse.json({
      detected_tone: analysis.detected_tone,
      detected_style: analysis.detected_style,
      summary: analysis.summary,
    })

  } catch (error: any) {
    console.error('Brand Voice Error:', error)
    return NextResponse.json({ error: 'Błąd analizy stylu' }, { status: 500 })
  }
}
