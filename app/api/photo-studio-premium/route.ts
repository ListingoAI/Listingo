import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { runPhotoStudioPremiumScene } from '@/lib/photo-studio-premium/run-scene'

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
        {
          error: 'Photo Studio Premium wymaga planu Growth lub Scale',
        },
        { status: 403 }
      )
    }

    const { imageBase64, scene, productDescription, customPrompt } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Brak zdjęcia' }, { status: 400 })
    }

    const result = await runPhotoStudioPremiumScene({
      imageBase64,
      scene: typeof scene === 'string' ? scene : 'allegro-main',
      productDescription: productDescription,
      customPrompt: scene === 'custom' ? customPrompt?.trim() : undefined,
    })

    return NextResponse.json({
      resultImage: result.resultImage,
      scene: result.scene,
      ...(result.note ? { note: result.note } : {}),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Photo Studio Error:', msg)

    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined

    if (msg.includes('rate') || status === 429) {
      return NextResponse.json({ error: 'Za dużo zapytań. Poczekaj minutę.' }, { status: 429 })
    }

    return NextResponse.json(
      { error: 'Błąd generowania. Spróbuj inną scenę lub wróć za chwilę.' },
      { status: 500 }
    )
  }
}
