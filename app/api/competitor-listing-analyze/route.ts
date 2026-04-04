import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  analyzeCompetitorListing,
  assertPublicHttpUrl,
  fetchListingPageText,
  type PreparedListingContent,
} from '@/lib/generation/competitor-listing-analysis'

export const runtime = 'nodejs'

const MIN_ANALYZE_CHARS = 45

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

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()

    const plan = profile?.plan ?? 'free'
    if (plan !== 'pro' && plan !== 'scale') {
      return NextResponse.json(
        { error: 'Analiza konkurencji jest dostępna w planach Pro i Scale.' },
        { status: 403 }
      )
    }

    const body = (await req.json()) as { url?: string; pastedText?: string }
    const urlRaw = typeof body.url === 'string' ? body.url.trim() : ''
    const pasted = typeof body.pastedText === 'string' ? body.pastedText.trim() : ''

    if (!urlRaw && pasted.length < MIN_ANALYZE_CHARS) {
      return NextResponse.json(
        {
          error: `Podaj adres URL lub wklej treść oferty (min. ok. ${MIN_ANALYZE_CHARS} znaków).`,
        },
        { status: 400 }
      )
    }

    if (urlRaw) {
      try {
        assertPublicHttpUrl(urlRaw)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Nieprawidłowy URL.'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    let prepared: PreparedListingContent

    if (!urlRaw) {
      prepared = {
        text: pasted.slice(0, 50_000),
        titleTag: '',
        source: 'paste',
      }
    } else {
      const fetched = await fetchListingPageText(urlRaw)
      const pastedBlock = pasted.length >= MIN_ANALYZE_CHARS ? pasted : ''

      if (fetched.ok && fetched.text.length >= 200) {
        let text = fetched.text
        if (pastedBlock) {
          text += '\n\n--- Treść dodatkowo wklejona przez użytkownika ---\n' + pastedBlock.slice(0, 25_000)
        }
        prepared = {
          text: text.slice(0, 50_000),
          titleTag: fetched.titleTag,
          source: 'fetch',
          url: urlRaw,
          fetchOk: true,
        }
      } else if (pastedBlock) {
        prepared = {
          text: pastedBlock.slice(0, 50_000),
          titleTag: fetched.titleTag,
          source: 'paste',
          url: urlRaw,
          fetchOk: false,
          fetchError: fetched.error ?? 'Pobranie strony nie powiodło się lub było niekompletne.',
        }
      } else if (fetched.text.length >= MIN_ANALYZE_CHARS) {
        prepared = {
          text: fetched.text.slice(0, 50_000),
          titleTag: fetched.titleTag,
          source: 'fetch',
          url: urlRaw,
          fetchOk: false,
          fetchError:
            fetched.error ??
            'Fragment tekstu z strony — pełna treść może ładować się w przeglądarce. Rozważ wklejkę.',
        }
      } else {
        return NextResponse.json(
          {
            error:
              fetched.error ??
              'Za mało treści do analizy. Wklej tytuł i opis oferty w pole poniżej i spróbuj ponownie.',
          },
          { status: 400 }
        )
      }
    }

    const analysis = await analyzeCompetitorListing(prepared)
    return NextResponse.json({ ok: true, analysis, meta: { source: prepared.source, url: prepared.url } })
  } catch (e: unknown) {
    console.error('[competitor-listing-analyze]', e)
    const message = e instanceof Error ? e.message : 'Błąd analizy.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
