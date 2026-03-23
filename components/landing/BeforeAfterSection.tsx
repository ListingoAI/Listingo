"use client"

import { motion } from "framer-motion"

const badDescription = `Koszulka męska.

Materiał: bawełna.
Rozmiary: S, M, L, XL, XXL.
Kolory: czarny, biały, szary.

Dostawa 2-3 dni robocze.
Zwroty do 14 dni.`

const goodTags = [
  "koszulka oversize",
  "bawełna organiczna",
  "męska",
  "polska produkcja",
  "premium",
] as const

const listItems = [
  "Certyfikowana bawełna OEKO-TEX® — bezpieczna dla skóry",
  "Oversize fit — wygoda na co dzień i na wyjście",
  "5 rozmiarów (S-XXL) — znajdź swój idealny",
  "Produkcja Polska — wspieraj lokalnych twórców",
] as const

export function BeforeAfterSection() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">
          Poczuj różnicę
        </h2>
        <p className="mt-4 text-center text-lg text-muted-foreground">
          Ten sam produkt. Dwa zupełnie różne opisy.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6"
          >
            <h3 className="mb-4 text-lg font-semibold text-red-400">
              ❌ Typowy opis
            </h3>
            <p className="mb-4 text-sm text-red-400">Score: 34/100</p>
            <div className="mb-4 h-2 w-full rounded-full bg-secondary">
              <div className="h-full w-[34%] rounded-full bg-red-500" />
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {badDescription}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/10"
          >
            <p className="mb-4 text-lg font-semibold text-emerald-400">
              ✅ Opis z Listingo
            </p>
            <p className="mb-4 text-sm text-emerald-400">Score: 96/100</p>
            <div className="mb-4 h-2 w-full rounded-full bg-secondary">
              <div className="h-full w-[96%] rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm leading-relaxed text-foreground">
              <h3 className="mt-4 mb-2 text-base font-semibold text-foreground first:mt-0">
                Koszulka Męska Oversize — Premium Bawełna Organiczna
              </h3>
              <p>
                Poczuj wyjątkowy komfort dzięki 100% bawełnie organicznej o
                gramaturze 200g/m². Nasz bestseller w kroju oversize, który
                idealnie leży bez obciskania.
              </p>
              <h4 className="mt-3 mb-1 text-sm font-semibold text-emerald-400">
                ✨ Dlaczego pokochasz tę koszulkę?
              </h4>
              <ul className="list-none space-y-1.5 pl-0">
                {listItems.map((item) => (
                  <li key={item} className="text-sm text-foreground">
                    <span className="text-emerald-400">✓ </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {goodTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Obie treści dotyczą tego samego produktu. Różnica? AI które rozumie
          SEO i psychologię sprzedaży.
        </p>
      </div>
    </section>
  )
}
