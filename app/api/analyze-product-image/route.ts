import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { analyzeProductImage } from '@/lib/generation/analyze-product-image'
import {
  mergeProductImageAnalyses,
  type ProductImageAnalysis,
} from '@/lib/generation/product-image-analysis'

export const runtime = 'nodejs'

const MAX_IMAGE_CHARS = 12 * 1024 * 1024
const MAX_IMAGES = 5

function normalizeImages(body: { imageBase64?: string; images?: string[] }): string[] {
  const raw = body.images
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => String(x ?? '').trim()).filter((s) => s.length > 0)
  }
  const single = String(body.imageBase64 ?? '').trim()
  return single ? [single] : []
}

export async function POST(req: Request) {
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
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Musisz być zalogowany.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, credits_used, credits_limit')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profil nie znaleziony.' }, { status: 404 })
    }

    const body = (await req.json()) as { imageBase64?: string; images?: string[] }
    const images = normalizeImages(body)

    if (images.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Brak zdjęć (images lub imageBase64).' },
        { status: 400 }
      )
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { ok: false, error: `Maksymalnie ${MAX_IMAGES} zdjęć na jedną weryfikację.` },
        { status: 400 }
      )
    }

    for (const raw of images) {
      if (raw.length > MAX_IMAGE_CHARS) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Jedno ze zdjęć jest zbyt duże. Użyj mniejszych plików (ok. max 5 MB każde).',
          },
          { status: 400 }
        )
      }
    }

    const n = images.length
    const creditsRemainingBefore = profile.credits_limit - profile.credits_used
    if (creditsRemainingBefore < n) {
      return NextResponse.json(
        {
          ok: false,
          error: `Weryfikacja ${n} ${n === 1 ? 'zdjęcia' : 'zdjęć'} wymaga ${n} ${n === 1 ? 'kredytu' : 'kredytów'}. Pozostało: ${creditsRemainingBefore}.`,
          upgradeRequired: true,
          creditsRemaining: creditsRemainingBefore,
        },
        { status: 403 }
      )
    }

    const analyses: ProductImageAnalysis[] = []
    for (const raw of images) {
      analyses.push(await analyzeProductImage(raw))
    }

    const merged = mergeProductImageAnalyses(analyses)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ credits_used: profile.credits_used + n })
      .eq('id', user.id)

    if (updateErr) {
      console.error('[analyze-product-image] credits update', updateErr)
      return NextResponse.json(
        { ok: false, error: 'Nie udało się zapisać kredytów. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    const creditsRemaining = profile.credits_limit - profile.credits_used - n

    return NextResponse.json({
      ok: true,
      creditsCharged: n,
      creditsRemaining,
      ...merged,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Nie udało się przeanalizować zdjęcia.'
    console.error('[analyze-product-image]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
