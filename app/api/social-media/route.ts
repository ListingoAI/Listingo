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
          set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch {} },
          remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productName, shortDescription, platform } = await req.json()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Jesteś ekspertem od social media marketingu. Na podstawie nazwy i opisu produktu, stwórz gotowe posty na social media.

ZASADY:
- Pisz po polsku
- Używaj emoji naturalnie
- Każdy post inny ton i hook
- Hashtagi PL + EN mix
- CTA w każdym poście

Odpowiedz JSON:
{
  "instagram": {
    "caption": "Treść posta z emoji i CTA",
    "hashtags": ["#tag1", "#tag2", "..."],
    "bestTime": "Wtorek 18:00-20:00",
    "tip": "Wskazówka"
  },
  "facebook": {
    "post": "Treść posta FB (dłuższa, konwersacyjna)",
    "cta": "Wezwanie do działania",
    "tip": "Wskazówka"
  },
  "tiktok": {
    "hookLine": "Pierwszy zdanie które zatrzyma scrollowanie",
    "scriptOutline": "Zarys scenariusza 15-30s",
    "hashtags": ["#tag1"],
    "tip": "Wskazówka"
  }
}`
        },
        {
          role: 'user',
          content: `Produkt: ${productName}\nOpis: ${shortDescription}\nPlatforma sprzedaży: ${platform}`
        }
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Social Media Error:', error)
    return NextResponse.json({ error: 'Błąd generowania postów' }, { status: 500 })
  }
}
