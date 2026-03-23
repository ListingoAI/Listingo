"use client"

import { motion } from "framer-motion"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqItems = [
  {
    question: "Czy opisy są unikalne?",
    answer:
      "Tak. Każdy opis jest generowany od nowa przez AI. Nie kopiujemy z żadnej bazy gotowych tekstów. Możesz wygenerować 10 opisów tego samego produktu i każdy będzie inny i unikalny.",
  },
  {
    question: "Jak działa generowanie ze zdjęcia?",
    answer:
      "Wrzucasz zdjęcie produktu (JPG, PNG lub WebP). Nasz AI (GPT-4 Vision) analizuje obraz, rozpoznaje produkt, wyciąga widoczne cechy — kolor, materiał, typ — i na tej podstawie generuje pełny opis. Im lepsze zdjęcie, tym lepszy opis.",
  },
  {
    question: "Co to jest Brand Voice?",
    answer:
      "Brand Voice to pamięć AI o stylu Twojej marki. Wklejasz 3-5 swoich najlepszych opisów, a AI analizuje ton, styl i słownictwo. Każdy kolejny wygenerowany opis będzie brzmiał spójnie z Twoją marką — jakby pisał ten sam copywriter.",
  },
  {
    question: "Jak działa Quality Score?",
    answer:
      "Quality Score (0-100) ocenia Twój opis pod kątem SEO, czytelności, długości i mocy sprzedażowej. Dostajesz konkretne wskazówki: „Dodaj więcej słów kluczowych w tytule” lub „Rozbuduj sekcję o materiałach”. Cel: zawsze 90+.",
  },
  {
    question: "Pod jakie platformy generujecie opisy?",
    answer:
      "Allegro, Shopify, WooCommerce, OLX i format ogólny. Każda platforma ma inne wymagania — długość tytułu, formatowanie HTML, optymalne słowa kluczowe. Dostosowujemy automatycznie.",
  },
  {
    question: "Ile kosztuje jeden opis?",
    answer:
      "Free: 0 zł (5 opisów/mies). Starter: 0,99 zł za opis (100/mies za 99 zł). Pro: nielimitowane za 249 zł — przy 500 opisach to 0,50 zł za opis. Im więcej generujesz, tym taniej.",
  },
  {
    question: "Czy mogę generować masowo?",
    answer:
      "Tak, w planie Pro. Wrzucasz plik CSV z nazwami i cechami produktów. AI generuje opisy dla wszystkich na raz. Eksportujesz gotowy CSV do importu na Allegro lub Shopify.",
  },
  {
    question: "Mogę anulować subskrypcję?",
    answer:
      "Tak. Zero zobowiązań, zero ukrytych opłat. Anulujesz jednym kliknięciem w Ustawieniach. Nie pobieramy kolejnych opłat. Twoje wygenerowane opisy zostają na koncie.",
  },
] as const

export function FAQSection() {
  return (
    <section id="faq" className="px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            FAQ
          </span>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Często zadawane pytania
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Nie znalazłeś odpowiedzi? Napisz do nas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-12"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`item-${index + 1}`}
                className="rounded-xl border border-border/50 bg-card/30 px-6 transition-all data-[state=open]:border-emerald-500/30 data-[state=open]:bg-emerald-500/5 not-last:border-b-0"
              >
                <AccordionTrigger className="py-4 text-left font-medium text-foreground transition-colors hover:text-emerald-400 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
