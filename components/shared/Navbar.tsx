"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "#funkcje", label: "Funkcje" },
  { href: "#jak-dziala", label: "Jak działa" },
  { href: "#cennik", label: "Cennik" },
  { href: "#faq", label: "FAQ" },
] as const

function LogoLink({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 transition-opacity hover:opacity-80",
        className
      )}
    >
      <span className="text-2xl" aria-hidden>
        ⚡
      </span>
      <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
        Listingo
      </span>
    </Link>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <header
      className={cn(
        "fixed top-0 z-50 h-16 w-full border-b transition-colors",
        scrolled
          ? "border-border/50 bg-background/80 backdrop-blur-lg"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <LogoLink />

        <nav
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex md:items-center md:gap-8"
          aria-label="Główna nawigacja"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Zaloguj się
          </Link>
          <Link
            href="/register"
            className="cta-primary-shimmer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
          >
            <span>Zacznij za darmo →</span>
          </Link>
        </div>

        <div className="flex md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
              >
                {mobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-sm">
              <SheetHeader className="text-left">
                <SheetTitle className="sr-only">Menu nawigacji</SheetTitle>
                <LogoLink onNavigate={closeMobile} />
              </SheetHeader>

              <nav
                className="flex flex-col gap-4"
                aria-label="Menu mobilne"
              >
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    className="text-lg font-medium text-foreground transition-colors hover:text-emerald-400"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <Separator />

              <div className="flex flex-col gap-4">
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Zaloguj się
                </Link>
                <Button
                  asChild
                  className="cta-primary-shimmer w-full rounded-lg bg-emerald-500 text-black hover:scale-105 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
                >
                  <Link href="/register" onClick={closeMobile}>
                    <span>Zacznij za darmo →</span>
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Navbar
