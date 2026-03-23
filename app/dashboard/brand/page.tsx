"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { BrandVoice } from "@/lib/types"

export default function BrandVoicePage() {
  const [brandName, setBrandName] = useState("")
  const [descriptions, setDescriptions] = useState<string[]>([""])
  const [customInstructions, setCustomInstructions] = useState("")
  const [forbiddenWords, setForbiddenWords] = useState("")
  const [preferredWords, setPreferredWords] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<{
    detected_tone: string
    detected_style: string
    summary: string
  } | null>(null)
  const [existingBrandVoice, setExistingBrandVoice] =
    useState<BrandVoice | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setPageLoading(false)
        return
      }

      const { data } = await supabase
        .from("brand_voices")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (cancelled) return

      if (data) {
        setExistingBrandVoice(data as BrandVoice)
        setBrandName(data.brand_name || "")
        setDescriptions(
          data.sample_descriptions?.length ? data.sample_descriptions : [""]
        )
        setCustomInstructions(data.custom_instructions || "")
        setForbiddenWords(data.forbidden_words?.join(", ") || "")
        setPreferredWords(data.preferred_words?.join(", ") || "")
        if (data.detected_tone) {
          setAnalysis({
            detected_tone: data.detected_tone,
            detected_style: data.detected_style || "",
            summary: "",
          })
        }
      }
      setPageLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const response = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          sampleDescriptions: descriptions.filter((d) => d.trim()),
          customInstructions,
          forbiddenWords: forbiddenWords
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean),
          preferredWords: preferredWords
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean),
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setAnalysis({
          detected_tone: data.detected_tone ?? "",
          detected_style: data.detected_style ?? "",
          summary: data.summary ?? "",
        })
        toast.success("Brand Voice zapisany! 🎨")
      } else {
        toast.error(data.error || "Błąd analizy")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setAnalyzing(false)
    }
  }

  function addDescription() {
    setDescriptions((prev) => (prev.length >= 5 ? prev : [...prev, ""]))
  }

  function removeDescription(index: number) {
    setDescriptions((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    )
  }

  function updateDescription(index: number, value: string) {
    setDescriptions((prev) =>
      prev.map((d, i) => (i === index ? value : d))
    )
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-label="Ładowanie"
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🎨 Brand Voice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Naucz AI pisać w stylu Twojej marki
        </p>
      </div>

      {analysis !== null ? (
        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              📊
            </span>
            <span className="text-base font-semibold text-foreground">
              Twój wykryty styl
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Ton
              </p>
              <p className="text-sm font-medium text-emerald-400">
                {analysis.detected_tone}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Styl
              </p>
              <p className="text-sm text-foreground">{analysis.detected_style}</p>
            </div>
          </div>
          {analysis.summary ? (
            <p className="mt-4 text-sm italic text-muted-foreground">
              {analysis.summary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className="space-y-6"
        data-saved-voice={existingBrandVoice ? "1" : undefined}
      >
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <Label htmlFor="brandName" className="text-foreground">
            Nazwa Twojej marki (opcjonalnie)
          </Label>
          <Input
            id="brandName"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="np. StyleHouse, TechZone, EkoSklep"
            className="mt-2 h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <Label className="text-foreground">Twoje przykładowe opisy</Label>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Wklej 1-5 opisów produktów, które najlepiej oddają styl Twojej marki.
            AI przeanalizuje ton, słownictwo i strukturę.
          </p>
          <div className="space-y-4">
            {descriptions.map((desc, index) => (
              <div key={`sample-${index}`} className="relative">
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Opis {index + 1}
                  </Label>
                  {descriptions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeDescription(index)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Usuń
                    </button>
                  ) : null}
                </div>
                <Textarea
                  value={desc}
                  onChange={(e) => updateDescription(index, e.target.value)}
                  placeholder="Wklej tutaj swój opis produktu..."
                  rows={5}
                  className="resize-none border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
                />
              </div>
            ))}
          </div>
          {descriptions.length < 5 ? (
            <button
              type="button"
              onClick={addDescription}
              className="mt-3 text-sm text-emerald-400 hover:underline"
            >
              + Dodaj kolejny opis
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <Label htmlFor="customInstructions" className="text-foreground">
            Dodatkowe instrukcje dla AI (opcjonalnie)
          </Label>
          <Textarea
            id="customInstructions"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="np. Zawsze zwracaj się do klienta per 'Państwo'. Nawiązuj do ekologii. Każdy opis kończ wezwaniem do działania."
            rows={4}
            className="mt-2 resize-none border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
            <Label htmlFor="forbiddenWords" className="text-foreground">
              🚫 Zakazane słowa
            </Label>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Słowa których AI nie powinno używać (oddzielone przecinkami)
            </p>
            <Input
              id="forbiddenWords"
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="tani, najtańszy, budżetowy, chiński"
              className="h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
            />
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
            <Label htmlFor="preferredWords" className="text-foreground">
              ⭐ Ulubione słowa/frazy
            </Label>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Słowa które AI powinno preferować (oddzielone przecinkami)
            </p>
            <Input
              id="preferredWords"
              value={preferredWords}
              onChange={(e) => setPreferredWords(e.target.value)}
              placeholder="premium, wyjątkowy, rękodzieło, polska produkcja"
              className="h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={analyzing || descriptions.every((d) => !d.trim())}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 disabled:opacity-50 disabled:hover:scale-100"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analizuję Twój styl...
            </>
          ) : (
            "🎨 Analizuj i zapisz Brand Voice"
          )}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Analiza zajmuje ok. 10 sekund. AI przeczyta Twoje opisy i wykryje
          wzorce.
        </p>
      </div>
    </div>
  )
}
