import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { runGenerateListing } from '@/lib/generation/run-generate-listing'

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

    return NextResponse.json(
      { error: 'Błąd generowania opisu. Spróbuj ponownie za chwilę.' },
      { status: 500 }
    )
  }
}
