"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useUser } from "@/hooks/useUser"
import type { Profile } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", emoji: "📊" },
  { href: "/dashboard/generate", label: "Generuj opis", emoji: "✨" },
  { href: "/dashboard/descriptions", label: "Moje opisy", emoji: "📋" },
  { href: "/dashboard/brand", label: "Brand Voice", emoji: "🎨" },
  { href: "/dashboard/settings", label: "Ustawienia", emoji: "⚙️" },
] as const

function getInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "?"
  return fullName
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function creditsBarColor(pct: number): string {
  if (pct < 50) return "bg-emerald-500"
  if (pct <= 80) return "bg-yellow-500"
  return "bg-red-500"
}

function SidebarBody({
  pathname,
  profile,
  user,
  creditsUsed,
  creditsLimit,
  plan,
  onLinkClick,
}: {
  pathname: string
  profile: Profile | null
  user: User | null
  creditsUsed: number
  creditsLimit: number
  plan: string
  onLinkClick?: () => void
}) {
  const safeLimit = Math.max(creditsLimit, 1)
  const pct = (creditsUsed / safeLimit) * 100
  const barColor = creditsBarColor(pct)

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className="mb-8 flex items-center gap-2"
      >
        <span className="text-2xl" aria-hidden>
          ⚡
        </span>
        <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
          Listingo
        </span>
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV_LINKS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={
                active
                  ? "flex items-center gap-3 rounded-xl border-l-2 border-emerald-500 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400"
                  : "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground"
              }
            >
              <span aria-hidden>{item.emoji}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="space-y-3 rounded-xl border border-border/50 bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Twój plan</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                plan === "free"
                  ? "bg-secondary text-foreground"
                  : plan === "starter"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-purple-500/20 text-purple-400"
              }`}
            >
              {plan === "free"
                ? "Free"
                : plan === "starter"
                  ? "Starter"
                  : "Pro"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Kredyty</span>
              <span className="text-foreground">
                {creditsUsed}/{creditsLimit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{
                  width: `${Math.min(100, (creditsUsed / safeLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
          {plan !== "pro" ? (
            <Link
              href="/dashboard/settings"
              onClick={onLinkClick}
              className="block text-center text-xs text-emerald-400 hover:underline"
            >
              Przejdź na wyższy plan →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-border/50 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-400">
            {getInitials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? "Użytkownik"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email ?? user?.email ?? ""}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button
            type="submit"
            className="w-full text-left text-xs text-muted-foreground transition-colors hover:text-red-400"
          >
            Wyloguj się
          </button>
        </form>
      </div>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, loading } = useUser()
  const pathname = usePathname()

  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? 5
  const plan = profile?.plan ?? "free"

  const sidebarProps = {
    pathname,
    profile,
    user,
    creditsUsed,
    creditsLimit,
    plan,
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 flex-col border-r border-border/50 bg-card/30 p-6 lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <SidebarBody {...sidebarProps} />
        </div>
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 border-r border-border/50 bg-card p-6"
        >
          <SheetTitle className="sr-only">Menu nawigacji dashboardu</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col">
            <SidebarBody
              {...sidebarProps}
              onLinkClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="sticky top-0 z-40 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-lg lg:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 hover:bg-secondary/50"
              aria-label="Otwórz menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <span className="text-lg" aria-hidden>
                ⚡
              </span>
              <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-base font-bold text-transparent">
                Listingo
              </span>
            </Link>
            <div
              className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/20"
              aria-hidden
            />
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 p-6 lg:p-8">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
                aria-label="Ładowanie"
              />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
