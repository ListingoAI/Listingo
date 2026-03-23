"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORIES, PLATFORMS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"

function progressWidth(step: number): string {
  if (step === 1) return "33.33%"
  if (step === 2) return "66.66%"
  return "100%"
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sampleDescription, setSampleDescription] = useState("")
  const [loading, setLoading] = useState(false)

  function toggleCategory(value: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, value]
    })
  }

  async function handleFinish() {
    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      await supabase
        .from("profiles")
        .update({
          default_platform: selectedPlatform,
          default_category: selectedCategories[0] ?? null,
          onboarding_completed: true,
        })
        .eq("id", user.id)

      if (sampleDescription.trim()) {
        await supabase.from("brand_voices").upsert(
          {
            user_id: user.id,
            sample_descriptions: [sampleDescription.trim()],
          },
          { onConflict: "user_id" }
        )
      }

      router.push("/dashboard")
    } catch (err) {
      console.error("Onboarding error:", err)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              <span className="text-lg" aria-hidden>
                ⚡
              </span>
              <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-base font-bold text-transparent">
                Listingo
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Krok {currentStep} z 3
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: progressWidth(currentStep) }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 ? (
                <div>
                  <h1 className="text-center text-2xl font-bold text-foreground">
                    Na jakiej platformie sprzedajesz?
                  </h1>
                  <p className="mt-2 text-center text-muted-foreground">
                    Zoptymalizujemy opisy pod Twoją platformę
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {PLATFORMS.map((platform) => {
                      const selected = selectedPlatform === platform.value
                      return (
                        <button
                          key={platform.value}
                          type="button"
                          onClick={() => setSelectedPlatform(platform.value)}
                          className={`relative cursor-pointer rounded-xl border p-4 text-center transition-all ${
                            selected
                              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                              : "border-border/50 bg-card/30 hover:border-emerald-500/30"
                          }`}
                        >
                          {selected ? (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                              ✓
                            </div>
                          ) : null}
                          <div className="mb-2 text-3xl">{platform.emoji}</div>
                          <p className="text-sm font-medium text-foreground">
                            {platform.label}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button
                      type="button"
                      disabled={!selectedPlatform}
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
                    >
                      Dalej →
                    </Button>
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div>
                  <h1 className="text-center text-2xl font-bold text-foreground">
                    W jakiej branży działasz?
                  </h1>
                  <p className="mt-2 text-center text-muted-foreground">
                    Możesz wybrać do 3 kategorii
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {CATEGORIES.map((category) => {
                      const selected = selectedCategories.includes(
                        category.value
                      )
                      return (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => toggleCategory(category.value)}
                          className={`relative cursor-pointer rounded-xl border p-4 text-center transition-all ${
                            selected
                              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                              : "border-border/50 bg-card/30 hover:border-emerald-500/30"
                          }`}
                        >
                          {selected ? (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                              ✓
                            </div>
                          ) : null}
                          <p className="text-sm font-medium text-foreground">
                            {category.label}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Wybrano: {selectedCategories.length}/3
                  </p>
                  <div className="mt-8 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                    >
                      ← Wstecz
                    </Button>
                    <Button
                      type="button"
                      disabled={selectedCategories.length === 0}
                      onClick={() => setCurrentStep(3)}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      Dalej →
                    </Button>
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div>
                  <h1 className="text-center text-2xl font-bold text-foreground">
                    Dodaj swój styl pisania
                  </h1>
                  <p className="mt-2 text-center text-muted-foreground">
                    Opcjonalne — AI nauczy się Twojego stylu
                  </p>
                  <div className="mt-8 space-y-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-sm text-emerald-400">💡 Wskazówka</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Wklej jeden ze swoich najlepszych opisów produktów. AI
                        przeanalizuje Twój styl i będzie go naśladować w
                        przyszłych opisach.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sample">
                        Twój przykładowy opis (opcjonalnie)
                      </Label>
                      <Textarea
                        id="sample"
                        placeholder={`Wklej tutaj swój opis produktu...

Na przykład:
Elegancki portfel ze skóry naturalnej. Wykonany z najwyższej jakości skóry licowej, łączy klasyczny design z nowoczesną funkcjonalnością...`}
                        rows={8}
                        value={sampleDescription}
                        onChange={(e) => setSampleDescription(e.target.value)}
                        className="resize-none border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Możesz dodać więcej opisów później w ustawieniach Brand
                      Voice.
                    </p>
                  </div>
                  <div className="mt-8 grid grid-cols-3 items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-self-start"
                      onClick={() => setCurrentStep(2)}
                    >
                      ← Wstecz
                    </Button>
                    <div className="flex justify-center">
                      {!sampleDescription.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleFinish()}
                          className="text-muted-foreground"
                          disabled={loading}
                        >
                          Pomiń na razie
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      className="justify-self-end bg-emerald-500 text-white hover:bg-emerald-600"
                      onClick={() => void handleFinish()}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zapisuję...
                        </>
                      ) : (
                        "Zakończ i przejdź do aplikacji 🎉"
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
