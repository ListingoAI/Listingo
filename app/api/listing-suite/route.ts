import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { analyzeProductImage } from '@/lib/generation/analyze-product-image'
import { formatProductImageAnalysisForFeaturesField } from '@/lib/generation/product-image-analysis'
import { runGenerateListing } from '@/lib/generation/run-generate-listing'
import {
  LISTING_SUITE_BUNDLE_CREDIT_COST,
  LISTING_SUITE_SCENE_IDS,
  LISTING_SUITE_SCENE_LABELS,
  type ListingSuiteSceneId,
} from '@/lib/listing-suite/constants'
import { runPhotoStudioPremiumScene } from '@/lib/photo-studio-premium/run-scene'
import { runProductVideo } from '@/lib/video-studio/run-product-video'

export const runtime = 'nodejs'
export const maxDuration = 300

async function mapInChunks<T, R>(items: T[], chunkSize: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = items.slice(i, i + chunkSize)
    const part = await Promise.all(batch.map((item, j) => fn(item, i + j)))
    out.push(...part)
  }
  return out
}

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
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Musisz być zalogowany.' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profil nie znaleziony.' }, { status: 404 })
    }

    if (profile.plan === 'free') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Listing na gotowo wymaga planu Growth lub Scale.',
        },
        { status: 403 }
      )
    }

    const creditsRemainingBefore = profile.credits_limit - profile.credits_used
    if (creditsRemainingBefore < LISTING_SUITE_BUNDLE_CREDIT_COST) {
      return NextResponse.json(
        {
          ok: false,
          error: `Pakiet wymaga ${LISTING_SUITE_BUNDLE_CREDIT_COST} kredytów. Pozostało: ${creditsRemainingBefore}.`,
          upgradeRequired: true,
          creditsRemaining: creditsRemainingBefore,
        },
        { status: 403 }
      )
    }

    const body = (await req.json()) as { imageBase64?: string; platform?: string; tone?: string }
    const raw = String(body.imageBase64 ?? '').trim()
    if (!raw) {
      return NextResponse.json({ ok: false, error: 'Brak zdjęcia produktu.' }, { status: 400 })
    }

    const imageAnalysis = await analyzeProductImage(raw)
    const productName = (imageAnalysis.detectedProductName ?? '').trim() || 'Produkt'
    const featuresText = formatProductImageAnalysisForFeaturesField(imageAnalysis)

    const productHintForVideo = [
      productName,
      ...(imageAnalysis.visibleAttributes ?? []).slice(0, 6),
    ]
      .filter(Boolean)
      .join('. ')

    const sceneIds = [...LISTING_SUITE_SCENE_IDS] as ListingSuiteSceneId[]

    const imageResults = await mapInChunks(sceneIds, 2, async (sceneId) => {
      const r = await runPhotoStudioPremiumScene({
        imageBase64: raw,
        scene: sceneId,
        productDescription: productHintForVideo,
      })
      return {
        sceneId,
        label: LISTING_SUITE_SCENE_LABELS[sceneId],
        url: r.resultImage,
        note: r.note,
      }
    })

    const video = await runProductVideo({
      imageBase64: raw,
      scene: 'packshot-rotate',
      productDescription: productHintForVideo,
      aspectRatio: '16:9',
      duration: 5,
    })

    const platform = typeof body.platform === 'string' && body.platform.trim() ? body.platform.trim() : 'allegro'
    const tone = typeof body.tone === 'string' && body.tone.trim() ? body.tone.trim() : 'profesjonalny'

    const generateResult = await runGenerateListing(
      supabase,
      user.id,
      profile,
      {
        productName,
        category: '',
        features: featuresText,
        imageBase64: raw,
        platform,
        tone,
        productRating: null,
      },
      {
        skipCreditCharge: true,
        imageAnalysisPrecomputed: imageAnalysis,
      }
    )

    const { error: creditErr } = await supabase
      .from('profiles')
      .update({ credits_used: profile.credits_used + LISTING_SUITE_BUNDLE_CREDIT_COST })
      .eq('id', user.id)

    if (creditErr) {
      console.error('[listing-suite] credits update failed', creditErr)
      return NextResponse.json(
        { ok: false, error: 'Nie udało się zapisać kredytów. Skontaktuj się z pomocą.' },
        { status: 500 }
      )
    }

    const creditsRemaining =
      profile.credits_limit - profile.credits_used - LISTING_SUITE_BUNDLE_CREDIT_COST

    return NextResponse.json({
      ok: true,
      bundleCreditsCharged: LISTING_SUITE_BUNDLE_CREDIT_COST,
      creditsRemaining,
      images: imageResults,
      video: {
        url: video.videoUrl,
        scene: video.scene,
        modelUsed: video.modelUsed,
      },
      description: generateResult,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Nie udało się wygenerować pakietu.'
    console.error('[listing-suite]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
