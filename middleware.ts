import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Niezalogowany user nie wejdzie na dashboard
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Niezalogowany user nie wejdzie na onboarding
  if (!session && request.nextUrl.pathname.startsWith('/onboarding')) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Zalogowany user nie potrzebuje strony logowania
  if (session && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register'
  )) {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/login',
    '/register',
  ],
}
