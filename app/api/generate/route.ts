import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from 'openai'
import { runGenerateListing } from '@/lib/generation/run-generate-listing'
import { PRODUCT_IMAGE_VISION_UPGRADE_MESSAGE } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {}
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Musisz być zalogowany' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil nie znaleziony' }, { status: 404 })
    }

    if (profile.credits_used >= profile.credits_limit) {
      return NextResponse.json(
        {
          error: 'Wykorzystałeś limit opisów w tym miesiącu.',
          upgradeRequired: true,
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const result = await runGenerateListing(supabase, user.id, profile, body, {
      skipCreditCharge: false,
      imageAnalysisPrecomputed: null,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Generate Error:', error)
    const message = error instanceof Error ? error.message : String(error)

    if (message === 'Dodaj nazwę, cechy lub zdjęcie produktu.') {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (message === PRODUCT_IMAGE_VISION_UPGRADE_MESSAGE) {
      return NextResponse.json(
        { error: message, upgradeRequired: true },
        { status: 403 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI zwróciło nieprawidłowy format. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    if (message.includes('JSON')) {
      return NextResponse.json(
        { error: 'AI zwróciło nieprawidłowy format. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    if (
      message.includes('Odpowiedź AI została ucięta') ||
      message.includes('Model odmówił odpowiedzi') ||
      message.includes('Brak odpowiedzi z AI (pusty content)')
    ) {
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (message.includes('Nie udało się zapisać opisu')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error:
            'Błąd uwierzytelnienia OpenAI — sprawdź klucz OPENAI_API_KEY w zmiennych środowiskowych.',
        },
        { status: 502 }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Limit zapytań do OpenAI — odczekaj chwilę i spróbuj ponownie.' },
        { status: 429 }
      )
    }

    if (error instanceof APIConnectionError || error instanceof APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: 'Brak połączenia z OpenAI. Sprawdź internet i spróbuj ponownie.' },
        { status: 503 }
      )
    }

    if (error instanceof APIError) {
      if (error.status === 404) {
        return NextResponse.json(
          {
            error:
              'Model AI nie został znaleziony — sprawdź OPENAI_DESCRIPTION_MODEL i dostępność modelu na koncie OpenAI.',
          },
          { status: 502 }
        )
      }
      const short = error.message.length > 280 ? `${error.message.slice(0, 277)}…` : error.message
      return NextResponse.json({ error: `OpenAI: ${short}` }, { status: 502 })
    }

    return NextResponse.json(
      { error: 'Błąd generowania opisu. Spróbuj ponownie za chwilę.' },
      { status: 500 }
    )
  }
}
