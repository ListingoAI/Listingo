import type { NextRequest } from 'next/server'

import { handleAuthCallback } from '@/lib/supabase/auth-callback'

/** Standardowa ścieżka Supabase (Redirect URLs): …/auth/callback?code=… */
export async function GET(request: NextRequest) {
  return handleAuthCallback(request)
}
