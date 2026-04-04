import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const VALID_ACTIONS = new Set(['copy_raw', 'copy_edited', 'retry', 'refine'])
const VALID_FIELDS = new Set(['seoTitle', 'shortDescription', 'longDescription', 'tags', 'meta', 'all'])

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
    const { descriptionId, action, field, editDiff } = body as {
      descriptionId?: string
      action?: string
      field?: string
      editDiff?: string
    }

    if (!descriptionId || typeof descriptionId !== 'string') {
      return NextResponse.json({ error: 'Missing descriptionId' }, { status: 400 })
    }
    if (!action || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (field && !VALID_FIELDS.has(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    const { data: desc } = await supabase
      .from('descriptions')
      .select('id, user_id, platform, prompt_version')
      .eq('id', descriptionId)
      .single()

    if (!desc || desc.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await supabase.from('description_feedback').insert({
      description_id: descriptionId,
      user_id: user.id,
      platform: desc.platform,
      prompt_version: desc.prompt_version ?? null,
      action,
      field: field ?? null,
      edit_diff: editDiff ?? null,
    })

    if (action === 'copy_raw' && field === 'all') {
      await supabase
        .from('descriptions')
        .update({ copied_all_at: new Date().toISOString() })
        .eq('id', descriptionId)
        .is('copied_all_at', null)
    }

    if (action === 'retry' || action === 'refine') {
      await supabase
        .from('descriptions')
        .update({ high_quality: false, copied_all_at: null })
        .eq('id', descriptionId)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
