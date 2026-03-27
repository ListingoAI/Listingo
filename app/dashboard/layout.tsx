"use client"

import { Camera, FileText, LayoutDashboard, Menu, Mic2, Settings2, Video, Zap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ListingoBoltMark } from "@/components/shared/ListingoBoltMark"
import { useUser } from "@/hooks/useUser"
import { planLabel } from "@/lib/plans"
import type { Profile } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

const NAV_LINKS = [
  { href: "/dashboard",              label: "Dashboard",    icon: LayoutDashboard, sublabel: "Przegląd konta" },
  { href: "/dashboard/generate",     label: "AI Sales Hub", icon: Zap,             sublabel: "Generuj opisy i posty" },
  { href: "/dashboard/photo-studio", label: "Photo Studio", icon: Camera,          sublabel: "Packshot AI",       newBadge: true },
  { href: "/dashboard/video-studio", label: "Video Studio", icon: Video,           sublabel: "Film produktowy",   newBadge: true },
  { href: "/dashboard/descriptions", label: "Moje opisy",   icon: FileText,        sublabel: "Biblioteka opisów" },
  { href: "/dashboard/brand",        label: "Brand Voice",  icon: Mic2,            sublabel: "Ton i styl marki" },
  { href: "/dashboard/settings",     label: "Ustawienia",   icon: Settings2,       sublabel: "Plan i konto" },
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
        className="flex items-center gap-2"
      >
        <ListingoBoltMark className="h-7 w-auto" />
        <span className="bg-linear-to-r from-emerald-400 to-emerald-500 bg-clip-text text-xl font-bold text-transparent">
          Listingo
        </span>
      </Link>
      <div className="mb-7 mt-4 h-px bg-white/6" />

      <nav className="flex-1 space-y-0.5">
        {NAV_LINKS.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={
                active
                  ? "flex w-full items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-3 py-2.5 text-sm font-medium text-emerald-300 shadow-sm shadow-emerald-500/10 transition-all"
                  : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/80 transition-all hover:bg-white/5 hover:text-foreground"
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {"newBadge" in item && item.newBadge ? (
                <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-400">
                  NOWE
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Plan aktywny
          </p>
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                plan === "free"
                  ? "bg-secondary text-foreground"
                  : plan === "starter"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : plan === "scale"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-purple-500/20 text-purple-400"
              }`}
            >
              {planLabel(plan)}
            </span>
            <span className="text-xs text-muted-foreground">
              {creditsUsed}/{creditsLimit}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{
                width: `${Math.min(100, (creditsUsed / safeLimit) * 100)}%`,
              }}
            />
          </div>
          {plan !== "scale" ? (
            <Link
              href="/dashboard/settings"
              onClick={onLinkClick}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/18 hover:text-emerald-300"
            >
              Upgrade ↑
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-white/6 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300 ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-background">
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
            className="w-full text-left text-xs text-muted-foreground/50 transition-colors hover:text-red-400/90"
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
    <div className="relative flex min-h-screen bg-background">
      <div
        className="dashboard-atmosphere pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />
      <aside className="relative z-10 hidden w-64 flex-col border-r border-white/10 bg-card/55 p-5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <SidebarBody {...sidebarProps} />
        </div>
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-64 border-r border-white/6 bg-card p-5"
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

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <div className="sticky top-0 z-40 border-b border-white/10 bg-background/85 px-4 py-3 shadow-[0_0_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden">
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
              <ListingoBoltMark className="h-6 w-auto" />
              <span className="bg-linear-to-r from-emerald-400 to-emerald-500 bg-clip-text text-base font-bold text-transparent">
                Listingo
              </span>
            </Link>
            <div
              className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/20"
              aria-hidden
            />
          </div>
        </div>

        <main className="relative mx-auto w-full max-w-6xl flex-1 p-6 lg:p-8">
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
