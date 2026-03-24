import Link from "next/link"

import { ListingoBoltMark } from "@/components/shared/ListingoBoltMark"

function IconX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

const productLinks = [
  { href: "#funkcje", label: "Funkcje" },
  { href: "#cennik", label: "Cennik" },
  { href: "#faq", label: "FAQ" },
  { href: "#jak-dziala", label: "Demo" },
] as const

const companyLinks = [
  { href: "#", label: "O nas" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Kontakt" },
  { href: "#", label: "Kariera" },
] as const

const legalLinks = [
  { href: "/regulamin", label: "Regulamin" },
  { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
  { href: "#", label: "RODO" },
  { href: "#", label: "Cookies" },
] as const

const linkClass =
  "text-sm text-muted-foreground transition-colors hover:text-foreground"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/20">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <ListingoBoltMark className="h-7 w-auto shrink-0" />
              <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
                Listingo
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI generator opisów produktów dla e-commerce
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="X (Twitter)"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <IconX className="size-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <IconLinkedIn className="size-4" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <IconYouTube className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Produkt
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Firma
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Prawne
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 Listingo. Wszelkie prawa zastrzeżone.
            </p>
            <p className="text-sm text-muted-foreground">
              🇵🇱 Zbudowane w Polsce
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
