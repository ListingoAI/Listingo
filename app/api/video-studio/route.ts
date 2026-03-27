import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { runProductVideo } from '@/lib/video-studio/run-product-video'

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
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()

    if (!profile || profile.plan === 'free') {
      return NextResponse.json(
        { error: 'Video Studio dostępne od planu Growth lub Scale' },
        { status: 403 }
      )
    }

    const { imageBase64, scene, productDescription, aspectRatio = '16:9', duration = 5 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Brak zdjęcia produktu' }, { status: 400 })
    }

    try {
      const result = await runProductVideo({
        imageBase64,
        scene: typeof scene === 'string' ? scene : 'packshot-rotate',
        productDescription: productDescription?.trim(),
        aspectRatio: aspectRatio === '9:16' || aspectRatio === '1:1' ? aspectRatio : '16:9',
        duration: typeof duration === 'number' ? duration : 5,
      })
      return NextResponse.json(result)
    } catch (inner: unknown) {
      const msg = inner instanceof Error ? inner.message : String(inner)
      if (msg.includes('Za dużo zapytań')) {
        return NextResponse.json({ error: msg }, { status: 429 })
      }
      if (msg.includes('Nie udało się wygenerować')) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (msg.includes('Brak klucza')) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      throw inner
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Video Studio Error:', msg)

    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined

    if (msg.includes('rate') || status === 429) {
      return NextResponse.json({ error: 'Za dużo zapytań. Poczekaj chwilę.' }, { status: 429 })
    }

    return NextResponse.json(
      { error: 'Błąd generowania wideo. Spróbuj inną scenę lub wróć za chwilę.' },
      { status: 500 }
    )
  }
}
