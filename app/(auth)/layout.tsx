import Link from "next/link"

import { ListingoBoltMark } from "@/components/shared/ListingoBoltMark"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-linear-to-br from-emerald-950 via-background to-background p-12 lg:flex">
          <div
            className="pointer-events-none absolute top-0 right-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 translate-y-1/2 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-2xl"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <ListingoBoltMark className="h-8 w-auto" />
                <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
                  Listingo
                </span>
              </Link>
            </div>

            <div className="flex flex-1 flex-col justify-center">
              <h2 className="mb-6 text-3xl font-bold text-foreground">
                Twórz opisy produktów, które sprzedają
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      5 darmowych opisów na start
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Bez karty kredytowej, bez zobowiązań
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      Gotowe w 30 sekund
                    </p>
                    <p className="text-sm text-muted-foreground">
                      AI generuje tytuł SEO, opis i tagi automatycznie
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      Zoptymalizowane pod Allegro
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Każdy opis dopasowany do wymagań platformy
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-auto border-t border-emerald-500/10 pt-8">
              <p className="italic text-foreground">
                „Listingo zaoszczędził mi 20 godzin w pierwszym miesiącu. Teraz
                opisy produktów to moja ulubiona część pracy.”
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-400">
                  AK
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Anna Kowalska
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sprzedawca na Allegro, 500+ produktów
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
