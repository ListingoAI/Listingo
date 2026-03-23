"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

import { cn } from "@/lib/utils"

type TabId = "form" | "image" | "url"

const tabs: { id: TabId; label: string }[] = [
  { id: "form", label: "📝 Z formularza" },
  { id: "image", label: "📸 Ze zdjęcia" },
  { id: "url", label: "🔍 Z URL konkurencji" },
]

function BrowserChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 shadow-2xl shadow-emerald-500/5 ring-1 ring-emerald-500/10">
      <div className="flex h-8 items-center gap-2 border-b border-border/50 bg-card/80 px-4">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/60" aria-hidden />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" aria-hidden />
          <div className="h-3 w-3 rounded-full bg-green-500/60" aria-hidden />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          listingo.pl/dashboard/generate
        </span>
      </div>
      {children}
    </div>
  )
}

function FormTabContent() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Dane produktu
        </h3>
        <div className="mb-3 rounded-lg bg-secondary/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Nazwa produktu:</p>
          <p className="text-sm text-foreground">Portfel męski skórzany RFID</p>
        </div>
        <div className="mb-3 rounded-lg bg-secondary/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Kategoria:</p>
          <p className="text-sm text-foreground">💎 Biżuteria i zegarki</p>
        </div>
        <div className="mb-3 rounded-lg bg-secondary/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Cechy:</p>
          <p className="text-sm text-foreground">
            Skóra naturalna, RFID, 12 slotów na karty...
          </p>
        </div>
        <div className="mb-3 rounded-lg bg-secondary/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Platforma:</p>
          <p className="text-sm text-foreground">🛒 Allegro</p>
        </div>
        <div className="rounded-lg bg-emerald-500 p-3 text-center text-sm font-medium text-white">
          ✨ Generuj opis
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold text-emerald-400">
          Wygenerowany opis
        </h3>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-3 text-sm font-semibold text-emerald-400">
            📊 Quality Score: 94/100
          </p>
          <div className="mb-4 h-2 w-full rounded-full bg-secondary">
            <div className="h-full w-[94%] rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground">Tytuł SEO:</p>
          <p className="mb-3 text-sm font-medium text-foreground">
            Portfel Męski Skórzany z Ochroną RFID | Skóra Naturalna
          </p>
          <p className="text-xs text-muted-foreground">Tagi:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {["skórzany", "portfel rfid", "męski", "prezent"].map((tag) => (
              <span
                key={tag}
                className="inline rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ImageTabContent() {
  return (
    <div className="flex flex-col items-center p-6 text-center">
      <div className="flex h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50">
        <span className="mb-2 text-4xl" aria-hidden>
          📸
        </span>
        <p className="text-muted-foreground">Przeciągnij zdjęcie tutaj</p>
        <p className="text-sm text-muted-foreground">
          lub kliknij żeby wybrać
        </p>
      </div>
      <span className="my-4 text-2xl text-emerald-400" aria-hidden>
        ↓
      </span>
      <p className="text-sm text-muted-foreground">
        AI analizuje zdjęcie → rozpoznaje produkt → generuje opis
      </p>
      <span className="mt-4 rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-400">
        Dostępne od planu Starter
      </span>
    </div>
  )
}

function UrlTabContent() {
  return (
    <div className="p-6">
      <div className="mb-4 rounded-lg bg-secondary/30 p-3">
        <p className="text-xs text-muted-foreground">
          URL produktu konkurencji:
        </p>
        <p className="text-sm text-foreground">
          https://allegro.pl/oferta/portfel-meski...
        </p>
      </div>
      <p className="my-4 text-center text-2xl text-emerald-400" aria-hidden>
        ↓
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-red-400">❌ Ich opis</p>
          <p className="text-xs text-red-400">Score: 58/100</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Krótki, bez SEO, nudny...
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-400">
            ✅ Twój nowy opis
          </p>
          <p className="text-xs text-emerald-400">Score: 92/100</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Rozbudowany, SEO, przekonujący...
          </p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="inline-block rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-400">
          Dostępne w planie Pro
        </span>
      </div>
    </div>
  )
}

export function DemoSection() {
  const [activeTab, setActiveTab] = useState<TabId>("form")

  return (
    <section id="jak-dziala" className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Jak to działa
          </span>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Od zdjęcia do gotowego opisu
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            3 tryby generowania. Wybierz swój.
          </p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                  : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <BrowserChrome>
              {activeTab === "form" && <FormTabContent />}
              {activeTab === "image" && <ImageTabContent />}
              {activeTab === "url" && <UrlTabContent />}
            </BrowserChrome>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
