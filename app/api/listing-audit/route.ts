import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { generateListingAudit } from '@/lib/generation/listing-audit'

export const runtime = 'nodejs'
const LISTING_AUDIT_CREDIT_COST = 1

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
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Musisz być zalogowany.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, credits_used, credits_limit')
      .eq('id', user.id)
      .single()
    if (!profile) {
      return NextResponse.json({ error: 'Profil nie znaleziony.' }, { status: 404 })
    }

    const creditsRemainingBefore = profile.credits_limit - profile.credits_used
    if (creditsRemainingBefore < LISTING_AUDIT_CREDIT_COST) {
      return NextResponse.json(
        {
          error: `Analiza oferty wymaga ${LISTING_AUDIT_CREDIT_COST} kredytu. Pozostało: ${creditsRemainingBefore}.`,
          upgradeRequired: true,
          creditsRemaining: creditsRemainingBefore,
        },
        { status: 403 }
      )
    }

    const body = (await req.json()) as {
      productName?: string
      category?: string
      features?: string
      platform?: string
      listing?: {
        seoTitle?: string
        shortDescription?: string
        longDescription?: string
        tags?: string[]
        metaDescription?: string
      }
    }

    const listing = body.listing
    const longDescription = typeof listing?.longDescription === 'string' ? listing.longDescription : ''
    if (!longDescription.trim() && !(listing?.seoTitle ?? '').trim()) {
      return NextResponse.json(
        { error: 'Brak treści listingu do analizy.' },
        { status: 400 }
      )
    }

    const audit = await generateListingAudit({
      platformSlug: typeof body.platform === 'string' && body.platform.trim() ? body.platform.trim() : 'allegro',
      productName: typeof body.productName === 'string' ? body.productName : '',
      category: typeof body.category === 'string' ? body.category : '',
      features: typeof body.features === 'string' ? body.features : '',
      seoTitle: typeof listing?.seoTitle === 'string' ? listing.seoTitle : '',
      shortDescription: typeof listing?.shortDescription === 'string' ? listing.shortDescription : '',
      longDescriptionHtml: longDescription,
      tags: Array.isArray(listing?.tags) ? listing.tags.map((t) => String(t)) : [],
      metaDescription: typeof listing?.metaDescription === 'string' ? listing.metaDescription : '',
    })

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ credits_used: profile.credits_used + LISTING_AUDIT_CREDIT_COST })
      .eq('id', user.id)
    if (updateErr) {
      console.error('listing-audit: credits update failed', updateErr)
      return NextResponse.json(
        { error: 'Nie udało się zapisać kredytów. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    const creditsRemaining = profile.credits_limit - profile.credits_used - LISTING_AUDIT_CREDIT_COST
    return NextResponse.json({
      audit,
      creditsCharged: LISTING_AUDIT_CREDIT_COST,
      creditsRemaining,
    })
  } catch (e: unknown) {
    console.error('listing-audit:', e)
    const msg = e instanceof Error ? e.message : 'Błąd analizy.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
