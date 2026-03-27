"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Factory,
  ImagePlus,
  Info,
  Loader2,
  Package,
  Palette,
  Ruler,
  Scale,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import toast from "react-hot-toast"

import DescriptionResult from "@/components/generator/DescriptionResult"
import PlatformPreview from "@/components/generator/PlatformPreview"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { serializeCategorySelection } from "@/lib/allegro/category-selection"
import type { CategorySelectionTree } from "@/lib/allegro/types"
import {
  formatProductImageAnalysisForFeaturesField,
  type ProductImageAnalysis,
} from "@/lib/generation/product-image-analysis"
import { getCategoryProductNameHint } from "@/lib/generation/category-product-hint"
import { needsSmartTitleTrimming } from "@/lib/generation/smart-title-trimming"
import { PLATFORMS, TONES } from "@/lib/constants"
import { getPlatformProfile } from "@/lib/platforms"
import type { GenerateResponse, ProductImageEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

import { CategoryCombobox } from "./CategoryCombobox"
import { PLATFORM_ICON_COLORS, PLATFORM_ICONS, TONE_ICONS } from "./generate-ui-maps"
import { LivePreviewPanel } from "./LivePreviewPanel"

const PLATFORM_DETAILS_STORAGE_KEY = "listingo.platformDetailsAccordion.v1"

function readPlatformDetailsOpenMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(PLATFORM_DETAILS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, boolean>
  } catch {
    return {}
  }
}

function writePlatformDetailsOpenMap(map: Record<string, boolean>) {
  try {
    localStorage.setItem(PLATFORM_DETAILS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

type SuggestionChip = {
  key: string
  label: string
  /** Kanoniczny nagłówek wstawiany z chipa */
  prefix: string
  /** Inne akceptowane nagłówki (np. „Kolor:” zamiast „Kolory:”) — ta sama sekcja w UI */
  aliases?: string[]
  placeholder: string
  Icon: typeof Package
}

/** Najpierw dłuższe nagłówki (np. „Kolor produktu:” przed „Kolor:”). */
function chipPrefixes(chip: SuggestionChip): string[] {
  return [chip.prefix, ...(chip.aliases ?? [])].sort((a, b) => b.length - a.length)
}

/** Linia to nagłówek sekcji: „Prefix: wartość”, nie np. „Kolorowy: …”. */
function lineMatchesChipHeader(lineTrimmed: string, prefix: string): boolean {
  const tl = lineTrimmed.toLowerCase()
  const p = prefix.toLowerCase()
  if (!tl.startsWith(p)) return false
  const rest = tl.slice(p.length)
  return rest.startsWith(":") || rest.startsWith(" :")
}

const SUGGESTION_CHIPS: SuggestionChip[] = [
  { key: "mat", label: "Materiał", prefix: "Materiał", placeholder: "np. 95% bawełna, 5% elastan", Icon: Package },
  {
    key: "size",
    label: "Rozmiary",
    prefix: "Rozmiary",
    aliases: ["Wymiary", "Wymiar", "Wymiary produktu", "Rozmiar"],
    placeholder: "np. S, M, L, XL lub wymiary w cm",
    Icon: Ruler,
  },
  {
    key: "col",
    label: "Kolory",
    prefix: "Kolory",
    aliases: ["Kolor", "Barwa", "Odcień", "Kolor produktu"],
    placeholder: "np. czarny, biały, granatowy",
    Icon: Palette,
  },
  { key: "gram", label: "Gramatura", prefix: "Gramatura", placeholder: "np. 200 g/m²", Icon: Scale },
  { key: "prod", label: "Produkcja", prefix: "Produkcja", placeholder: "np. Polska, UE, certyfikat OEKO-TEX", Icon: Factory },
  { key: "use", label: "Zastosowanie", prefix: "Zastosowanie", placeholder: "np. na co dzień, do biura, sport", Icon: Target },
  { key: "care", label: "Pielęgnacja", prefix: "Pielęgnacja", placeholder: "np. pranie 30°C, nie wybielać", Icon: Droplets },
  { key: "warranty", label: "Gwarancja", prefix: "Gwarancja", placeholder: "np. 24 miesiące, zwrot 30 dni", Icon: ShieldCheck },
  { key: "unique", label: "Wyróżnik", prefix: "Wyróżnik", placeholder: "np. ręcznie szyte, limitowana edycja", Icon: Star },
]

/** Czy w tekście jest linia z kanonicznym nagłówkiem lub aliasem (np. „Kolor:” = chip Kolory). */
function chipExistsIn(text: string, chip: SuggestionChip): boolean {
  const prefs = chipPrefixes(chip)
  return text.split("\n").some((line) => {
    const t = line.trim()
    return prefs.some((p) => lineMatchesChipHeader(t, p))
  })
}

/** Usuwa pierwszą linię pasującą do chipa (prefix lub alias). */
function removeFirstLineWithChip(text: string, chip: SuggestionChip): string {
  const lines = text.split("\n")
  const prefs = chipPrefixes(chip)
  const idx = lines.findIndex((l) => {
    const t = l.trim()
    return prefs.some((p) => lineMatchesChipHeader(t, p))
  })
  if (idx < 0) return text
  return [...lines.slice(0, idx), ...lines.slice(idx + 1)].join("\n")
}

/** Wartość po dwukropku dla linii z danym prefiksem; null = brak takiej linii; "" = pusto lub brak ":". */
function getLineValueForPrefix(text: string, prefix: string): string | null {
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!lineMatchesChipHeader(t, prefix)) continue
    const colon = t.indexOf(":")
    if (colon === -1) return ""
    return t.slice(colon + 1).trim()
  }
  return null
}

function getLineValueForChip(text: string, chip: SuggestionChip): string | null {
  for (const prefix of chipPrefixes(chip)) {
    const v = getLineValueForPrefix(text, prefix)
    if (v !== null) return v
  }
  return null
}

function chipSectionFilled(text: string, chip: SuggestionChip): boolean {
  const v = getLineValueForChip(text, chip)
  return v !== null && v.length > 0
}

const CHIP_TOTAL = SUGGESTION_CHIPS.length

const PRODUCT_NAME_CHIP_HINTS: { re: RegExp; keys: string[] }[] = [
  { re: /koszulk|t-?shirt|bluzk|spodni|sukien|marynark|kurt|swetr|bluz|spódnic/i, keys: ["mat", "size", "col", "care"] },
  { re: /but|sanda|obuw|kozak|trampk/i, keys: ["size", "mat", "col", "care", "use"] },
  { re: /laptop|telefon|słuchawk|monitor|mysz|klawiatur|tablet|smartwatch/i, keys: ["warranty", "unique", "use", "prod", "gram"] },
  { re: /mebel|krzesł|stół|łóżk|szaf|półk|lampa/i, keys: ["mat", "size", "use", "warranty", "unique"] },
  { re: /krem|serum|szampon|perfum|makijaż/i, keys: ["use", "care", "prod", "unique"] },
  { re: /rower|biegan|fitness|siłown|sport/i, keys: ["mat", "size", "use", "care", "gram"] },
]

function getSuggestedChipKeysFromProductName(name: string): Set<string> {
  const s = new Set<string>()
  const n = name.trim().toLowerCase()
  if (!n) return s
  for (const { re, keys } of PRODUCT_NAME_CHIP_HINTS) {
    if (re.test(n)) for (const k of keys) s.add(k)
  }
  return s
}

function countFilledChipSections(text: string): number {
  return SUGGESTION_CHIPS.filter((c) => chipSectionFilled(text, c)).length
}

/** Linie „Etykieta: wartość” z niepustą wartością (dowolna etykieta, jak w API generate). */
function countStructuredFeatureLines(text: string): number {
  let n = 0
  for (const line of text.split("\n")) {
    const t = line.trim()
    const colon = t.indexOf(":")
    if (colon <= 0) continue
    const label = t.slice(0, colon).trim()
    const val = t.slice(colon + 1).trim()
    if (label.length < 2 || val.length === 0) continue
    if (!/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/.test(label)) continue
    n += 1
  }
  return n
}

function countNonEmptyFeatureLines(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length
}

const CATEGORY_CHIP_PRIORITY: Record<string, string[]> = {
  moda_meska: ["mat", "size", "col", "care", "prod"],
  moda_damska: ["mat", "size", "col", "care", "prod"],
  moda_dziecieca: ["mat", "size", "col", "care", "prod"],
  bielizna: ["mat", "size", "col", "care", "prod"],
  akcesoria_modowe: ["mat", "size", "col", "care", "use"],
  odziez: ["mat", "size", "col", "care", "prod"],
  odzież: ["mat", "size", "col", "care", "prod"],
  obuwie: ["size", "mat", "col", "care", "use"],
  elektronika: ["warranty", "unique", "use", "prod", "gram"],
  dom: ["mat", "size", "col", "care", "use"],
  sport: ["mat", "size", "use", "care", "gram"],
  uroda: ["use", "care", "prod", "unique", "gram"],
  zabawki: ["use", "size", "warranty", "prod", "mat"],
  motoryzacja: ["use", "warranty", "unique", "prod", "mat"],
  zdrowie: ["use", "care", "prod", "unique", "gram"],
}

function getChipOrder(category: string): string[] {
  const cat = category.toLowerCase()
  for (const [keyword, order] of Object.entries(CATEGORY_CHIP_PRIORITY)) {
    if (cat.includes(keyword)) return order
  }
  return []
}

function sortChipsByCategory(chips: SuggestionChip[], category: string): SuggestionChip[] {
  const priorityOrder = getChipOrder(category)
  if (priorityOrder.length === 0) return chips
  return [...chips].sort((a, b) => {
    const aIdx = priorityOrder.indexOf(a.key)
    const bIdx = priorityOrder.indexOf(b.key)
    if (aIdx === -1 && bIdx === -1) return 0
    if (aIdx === -1) return 1
    if (bIdx === -1) return 1
    return aIdx - bIdx
  })
}

type QualityHint = { type: "success" | "warning" | "tip"; text: string }

function analyzeFeatures(features: string): QualityHint[] {
  const hints: QualityHint[] = []
  const lines = features.split("\n").filter((l) => l.trim().length > 0)
  const text = features.toLowerCase()
  const hasNumbers = /\d/.test(features)
  const filledWithValue = SUGGESTION_CHIPS.filter((c) => chipSectionFilled(features, c)).length
  /** Słowa/frazy korzyści (USP) — m.in. ergonomiczny, nie męczy, komfort (także w „Wyróżnik”). */
  const hasBenefitLanguage =
    /idealny|idealna|idealne\b|zapewnia|gwarantuje|chroni|wygodn|komfort|trwał|pozwala|ułatwia|ergonomiczn|ergonomia|nie\s+męczy|niemęczy|przyjemny|przyjemna|przyjemne|odciąża|oszczędza|poprawia|zmniejsza|redukuje|łatwe\s+w|łatwy\s+w|dla\s+zdrowia|higieniczn|bezpieczny|bezpieczna|bezpieczne/i.test(
      features
    )
  /**
   * Opis budowy / materiałów / trwałości — to nadal jest „wartość dla klienta”,
   * choć nie brzmi jak slogan „komfortowe noszenie”.
   */
  const hasQualityOrBuildValue =
    /^budowa\s*:/im.test(features) ||
    /\b(obudow|solidn|wytrzymał|wytrzymal|wzmocnion|tkanin|gumowan|uchwyt|karabińczyk|karabinczyk|wodoodporn|odporny|odporna|pyłoszczeln|pyloszczeln|przenośn|przenosny|kompakt|antypoślizg|antyposlizg)\w*\b/i.test(
      features
    )
  const hasBenefit = hasBenefitLanguage || hasQualityOrBuildValue

  const emptyLabels: string[] = []
  for (const c of SUGGESTION_CHIPS) {
    const v = getLineValueForChip(features, c)
    if (v !== null && v.length === 0) emptyLabels.push(c.label)
  }
  if (emptyLabels.length > 0) {
    hints.push({
      type: "warning",
      text: `Puste sekcje — dopisz wartość po dwukropku: ${emptyLabels.join(", ")}`,
    })
  }

  if (lines.length === 0) return hints

  if (lines.length >= 5) {
    hints.push({ type: "success", text: `${lines.length} cech — świetna baza dla AI` })
  } else if (lines.length >= 3) {
    hints.push({ type: "warning", text: `${lines.length} cechy — dodaj jeszcze 2-3 dla lepszego opisu` })
  } else {
    hints.push({ type: "warning", text: `Tylko ${lines.length} ${lines.length === 1 ? "cecha" : "cechy"} — im więcej, tym lepiej` })
  }

  if (hasNumbers) {
    hints.push({ type: "success", text: "Zawiera konkretne liczby/parametry" })
  } else {
    hints.push({ type: "tip", text: "Dodaj liczby (wymiary, waga, %) — AI stworzy precyzyjniejszy opis" })
  }

  if (filledWithValue >= 3) {
    hints.push({ type: "success", text: `${filledWithValue}/${CHIP_TOTAL} sekcji z treścią` })
  } else if (filledWithValue > 0) {
    hints.push({ type: "tip", text: "Uzupełnij więcej sekcji chipami — AI lepiej zrozumie produkt" })
  }

  if (hasBenefitLanguage) {
    hints.push({ type: "success", text: "Zawiera język korzyści" })
  } else if (hasQualityOrBuildValue) {
    hints.push({
      type: "success",
      text: "Jest opis budowy / materiałów — to dla AI jest wartością (trwałość, jakość)",
    })
  } else if (lines.length >= 3) {
    hints.push({
      type: "tip",
      text: 'Dodaj korzyść klienta lub 1–2 zdania „po co to” (np. komfort, trwałość, spokój) — opis budowy też się liczy.',
    })
  }

  if (text.includes("materiał") && text.includes("rozmiar") && hasNumbers) {
    hints.push({ type: "success", text: "Pełne dane — spodziewaj się opisu 90+ quality score" })
  }

  return hints
}

/** Jednolity system podpowiedzi w generatorze — dark premium, czytelność, subtelny emerald */
const HUB_TOOLTIP_CLASS =
  "max-w-[240px] rounded-lg border border-emerald-500/20 bg-gray-950/98 px-3 py-2 text-[13px] leading-snug text-gray-50 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl [&_p]:m-0 [&_p]:leading-relaxed"
const HUB_TOOLTIP_ARROW = "bg-gray-950 fill-gray-950"
const HUB_INFO_TRIGGER =
  "inline-flex cursor-help rounded-md p-0.5 text-muted-foreground/55 transition-colors hover:bg-white/5 hover:text-emerald-400/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const FEATURES_PLACEHOLDER =
  "Wpisz cechy lub użyj chipów — każda w nowej linii (np. „Kolor:” albo „Kolory:”, „Wymiary:” albo „Rozmiary:” — to samo)."

const MAX_PRODUCT_IMAGES = 5

const FEATURES_EXAMPLE_LINES = `Materiał: 95% bawełna, 5% elastan
Rozmiary: S, M, L, XL
Kolory: czarny, biały, granatowy
Gramatura: 200 g/m²
Zastosowanie: na co dzień, do biura`

type Props = {
  productName: string
  setProductName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  features: string
  setFeatures: Dispatch<SetStateAction<string>>
  productImages: ProductImageEntry[]
  setProductImages: Dispatch<SetStateAction<ProductImageEntry[]>>
  refreshProfile: () => void | Promise<void>
  platform: string
  setPlatform: (v: string) => void
  tone: string
  setTone: (v: string) => void
  useBrandVoice: boolean
  setUseBrandVoice: (v: boolean) => void
  brandVoiceData: { tone?: string; style?: string } | null
  loading: boolean
  loadingStep: number
  loadingMessages: string[]
  handleGenerate: () => void
  handleRefineQuality?: () => void | Promise<void>
  /** true = przycisk „Dopracuj do 100” już zużyty dla bieżącego wyniku */
  refineAlreadyUsed?: boolean
  result: GenerateResponse | null
  showPreview: boolean
  setShowPreview: (v: boolean) => void
  error: string
  creditsRemaining: number
}

function charBarPct(len: number, max: number): number {
  return Math.min(100, (len / max) * 100)
}

function charBarColor(pct: number): string {
  if (pct < 80) return "bg-emerald-500"
  if (pct <= 95) return "bg-amber-400"
  return "bg-red-400"
}

export function FormTabPremium({
  productName,
  setProductName,
  category,
  setCategory,
  features,
  setFeatures,
  productImages,
  setProductImages,
  refreshProfile,
  platform,
  setPlatform,
  tone,
  setTone,
  useBrandVoice,
  setUseBrandVoice,
  brandVoiceData,
  loading,
  loadingStep,
  loadingMessages,
  handleGenerate,
  handleRefineQuality: handleRefineQualityProp,
  refineAlreadyUsed = false,
  result,
  showPreview,
  setShowPreview,
  error,
  creditsRemaining,
}: Props) {
  const [openData, setOpenData] = useState(true)
  const [openVisualInput, setOpenVisualInput] = useState(true)
  const [openSettings, setOpenSettings] = useState(true)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const featuresRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const latestFeaturesRef = useRef(features)
  latestFeaturesRef.current = features

  const nameMax = 200
  const featMax = 2000
  const namePct = charBarPct(productName.length, nameMax)
  const featPct = charBarPct(features.length, featMax)
  const canGenerate = Boolean(
    !loading &&
      (productName.trim() || features.trim() || productImages.length > 0)
  )

  const verifyImageCount = productImages.length
  const verifyCreditsCost = verifyImageCount
  const canVerifyFromImages =
    verifyImageCount > 0 &&
    creditsRemaining >= verifyCreditsCost &&
    !loading &&
    !verifyLoading

  useLayoutEffect(() => {
    const el = featuresRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }, [features])

  const qualityHints = useMemo(() => analyzeFeatures(features), [features])
  const sortedChips = useMemo(() => sortChipsByCategory(SUGGESTION_CHIPS, category), [category])
  const filledChipCount = useMemo(() => countFilledChipSections(features), [features])
  const labeledLineCount = useMemo(() => countStructuredFeatureLines(features), [features])
  const nonEmptyLineCount = useMemo(() => countNonEmptyFeatureLines(features), [features])
  /** Chipy + linie „Label:” + surowa liczba linii (cap), żeby nie było 0/9 przy 8 własnych cechach. */
  const effectiveSectionFill = useMemo(
    () =>
      Math.min(
        CHIP_TOTAL,
        Math.max(
          filledChipCount,
          labeledLineCount,
          Math.min(nonEmptyLineCount, CHIP_TOTAL)
        )
      ),
    [filledChipCount, labeledLineCount, nonEmptyLineCount]
  )
  const completenessPct = useMemo(
    () => Math.min(100, Math.round((effectiveSectionFill / CHIP_TOTAL) * 100)),
    [effectiveSectionFill]
  )
  const suggestedChipKeys = useMemo(
    () => getSuggestedChipKeysFromProductName(productName),
    [productName]
  )
  const platformProfile = useMemo(() => getPlatformProfile(platform), [platform])
  const smartTitleTrimmingActive = useMemo(
    () => needsSmartTitleTrimming(productName, platformProfile.titleMaxChars),
    [productName, platformProfile.titleMaxChars]
  )
  const categoryProductHint = useMemo(
    () => getCategoryProductNameHint(productName, category, features),
    [productName, category, features]
  )
  const [detailsOpenByPlatform, setDetailsOpenByPlatform] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setDetailsOpenByPlatform(readPlatformDetailsOpenMap())
  }, [])

  const platformInfoOpen = detailsOpenByPlatform[platform] ?? false

  const togglePlatformDetails = useCallback(() => {
    setDetailsOpenByPlatform((prev) => {
      const current = prev[platform] ?? false
      const next = { ...prev, [platform]: !current }
      writePlatformDetailsOpenMap(next)
      return next
    })
  }, [platform])

  const insertChip = useCallback(
    (chip: SuggestionChip) => {
      const prev = latestFeaturesRef.current
      if (!chipExistsIn(prev, chip)) {
        const template = `${chip.prefix}: `
        const next = prev.trim() ? `${prev.trim()}\n${template}` : template
        setFeatures(next)
        setTimeout(() => {
          const el = featuresRef.current
          if (!el) return
          el.focus()
          el.setSelectionRange(next.length, next.length)
        }, 0)
        return
      }
      if (chipSectionFilled(prev, chip)) {
        const ok = window.confirm(
          `Usunąć sekcję "${chip.label}" wraz z wpisaną treścią?`
        )
        if (!ok) return
      }
      const snapshot = prev
      setFeatures((p) => {
        const lines = p.split("\n")
        const prefs = chipPrefixes(chip)
        const idx = lines.findIndex((l) => {
          const t = l.trim()
          return prefs.some((pr) => lineMatchesChipHeader(t, pr))
        })
        const caretStart =
          idx <= 0 ? 0 : lines.slice(0, idx).join("\n").length + 1
        const next = removeFirstLineWithChip(p, chip)
        setTimeout(() => {
          const el = featuresRef.current
          if (!el) return
          el.focus()
          const pos = Math.min(caretStart, next.length)
          el.setSelectionRange(pos, pos)
        }, 0)
        return next
      })
      toast.custom(
        (t) => (
          <div className="flex max-w-[min(100vw-2rem,320px)] flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 text-[13px] leading-snug text-gray-100 shadow-lg">
            <span className="min-w-0 flex-1">Usunięto sekcję: {chip.label}</span>
            <button
              type="button"
              className="shrink-0 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
              onClick={() => {
                setFeatures(snapshot)
                toast.dismiss(t.id)
              }}
            >
              Cofnij
            </button>
          </div>
        ),
        { duration: 5000 })
    },
    [setFeatures]
  )

  const insertAllMissingChips = useCallback(() => {
    setFeatures((prev) => {
      const toAdd: string[] = []
      for (const chip of sortedChips) {
        if (!chipExistsIn(prev, chip)) {
          toAdd.push(`${chip.prefix}: `)
        }
      }
      if (toAdd.length === 0) return prev
      const base = prev.trim()
      return base ? `${base}\n${toAdd.join("\n")}` : toAdd.join("\n")
    })
    setTimeout(() => {
      const el = featuresRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }, 0)
  }, [setFeatures, sortedChips])

  const clearFeatures = useCallback(() => {
    const t = latestFeaturesRef.current.trim()
    if (!t) return
    if (!window.confirm("Wyczyścić całe pole cech?")) return
    const snapshot = latestFeaturesRef.current
    setFeatures("")
    toast.custom(
      (toastId) => (
        <div className="flex max-w-[min(100vw-2rem,320px)] flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 text-[13px] leading-snug text-gray-100 shadow-lg">
          <span className="min-w-0 flex-1">Pole cech wyczyszczone</span>
          <button
            type="button"
            className="shrink-0 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
            onClick={() => {
              setFeatures(snapshot)
              toast.dismiss(toastId.id)
            }}
          >
            Cofnij
          </button>
        </div>
      ),
      { duration: 5000 }
    )
  }, [setFeatures])

  const addProductImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files)
      const newEntries: ProductImageEntry[] = []
      for (const file of arr) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: tylko JPG, PNG lub WEBP.`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: max 5 MB.`)
          continue
        }
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ""))
            reader.onerror = () => reject(new Error("read"))
            reader.readAsDataURL(file)
          })
          if (dataUrl) {
            newEntries.push({
              id: crypto.randomUUID(),
              dataUrl,
              name: file.name,
            })
          }
        } catch {
          toast.error(`Nie udało się odczytać: ${file.name}`)
        }
      }
      if (newEntries.length === 0) return

      setProductImages((prev) => {
        const room = MAX_PRODUCT_IMAGES - prev.length
        const toAdd = newEntries.slice(0, room)
        if (toAdd.length === 0) {
          queueMicrotask(() =>
            toast.error(`Możesz dodać maksymalnie ${MAX_PRODUCT_IMAGES} zdjęć.`)
          )
          return prev
        }
        if (toAdd.length < newEntries.length) {
          queueMicrotask(() =>
            toast.error(`Możesz dodać maksymalnie ${MAX_PRODUCT_IMAGES} zdjęć.`)
          )
        }
        queueMicrotask(() =>
          toast.success(
            toAdd.length === 1
              ? "Zdjęcie dodane do analizy i generowania."
              : `Dodano ${toAdd.length} zdjęć.`
          )
        )
        return [...prev, ...toAdd]
      })
    },
    [setProductImages]
  )

  const removeProductImage = useCallback(
    (id: string) => {
      setProductImages((prev) => prev.filter((p) => p.id !== id))
    },
    [setProductImages]
  )

  const clearProductImages = useCallback(() => {
    setProductImages([])
    if (imageInputRef.current) imageInputRef.current.value = ""
  }, [setProductImages])

  const applyCategoryLeaf = useCallback(
    (s: { id: string; leafName: string; path: string[] }) => {
      const sel: CategorySelectionTree = {
        kind: "category",
        id: s.id,
        mainCategory: s.path[0],
        categoryPath: s.path,
        leafCategory: s.leafName,
      }
      setCategory(serializeCategorySelection(sel))
    },
    [setCategory]
  )

  const handleVerifyFromImage = useCallback(async () => {
    if (productImages.length === 0) return
    const imagesPayload = productImages.map((p) => p.dataUrl)
    const n = imagesPayload.length
    if (creditsRemaining < n) {
      toast.error(
        `Potrzebujesz ${n} ${n === 1 ? "kredytu" : "kredytów"} (${n} ${n === 1 ? "zdjęcie" : "zdjęć"}). Pozostało: ${creditsRemaining}.`
      )
      return
    }
    setVerifyLoading(true)
    try {
      const res = await fetch("/api/analyze-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesPayload }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        upgradeRequired?: boolean
        creditsCharged?: number
        creditsRemaining?: number
        detectedProductName?: string
        visibleAttributes?: string[]
        visibleCategoryHint?: string
        listingSummary?: string
        productDetailLines?: string[]
        salesImpressionLines?: string[]
        notVisibleOrUncertainLines?: string[]
      }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Nie udało się przeanalizować zdjęć.")
        return
      }

      const charged = data.creditsCharged ?? n
      const rem = data.creditsRemaining
      if (typeof rem === "number") {
        toast.success(
          `Analiza: −${charged} ${charged === 1 ? "kredyt" : "kredytów"}. Pozostało: ${rem}.`
        )
      }

      const name = (data.detectedProductName ?? "").trim() || "Produkt"

      const analysis: ProductImageAnalysis = {
        detectedProductName: name,
        visibleAttributes: Array.isArray(data.visibleAttributes)
          ? data.visibleAttributes
              .map((a) => String(a).trim())
              .filter((x) => x.length > 0)
              .slice(0, 10)
          : [],
        visibleCategoryHint: String(data.visibleCategoryHint ?? "").trim(),
        ...(typeof data.listingSummary === "string" && data.listingSummary.trim()
          ? { listingSummary: data.listingSummary.trim() }
          : {}),
        ...(Array.isArray(data.productDetailLines) && data.productDetailLines.length > 0
          ? {
              productDetailLines: data.productDetailLines
                .map((x) => String(x).trim())
                .filter((x) => x.length > 0),
            }
          : {}),
        ...(Array.isArray(data.salesImpressionLines) && data.salesImpressionLines.length > 0
          ? {
              salesImpressionLines: data.salesImpressionLines
                .map((x) => String(x).trim())
                .filter((x) => x.length > 0),
            }
          : {}),
        ...(Array.isArray(data.notVisibleOrUncertainLines) && data.notVisibleOrUncertainLines.length > 0
          ? {
              notVisibleOrUncertainLines: data.notVisibleOrUncertainLines
                .map((x) => String(x).trim())
                .filter((x) => x.length > 0),
            }
          : {}),
      }

      const featText = formatProductImageAnalysisForFeaturesField(analysis)

      setProductName(name)
      setFeatures(featText)
      setOpenData(true)

      type LeafJson = { id: string; leafName: string; path: string[]; pathLabel?: string }
      const suggestRes = await fetch("/api/categories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: name, features: featText }),
      })
      const suggestData = (await suggestRes.json()) as {
        ok?: boolean
        confidence?: "high" | "medium" | "none"
        suggestion?: LeafJson
        candidates?: LeafJson[]
        customCategoryHint?: string
        error?: string
        retryAfterMs?: number
      }

      if (suggestRes.status === 429) {
        toast.error(
          `${suggestData.error ?? "Limit sugestii kategorii."} Nazwa i cechy z analizy zdjęcia są już w formularzu — spróbuj kategorii za chwilę.`
        )
        return
      }

      if (!suggestData.ok) {
        toast.error(suggestData.error ?? "Kategoria: błąd — nazwa i cechy zapisane.")
        return
      }

      if (suggestData.confidence === "high" && suggestData.suggestion) {
        applyCategoryLeaf(suggestData.suggestion)
        toast.success("Wypełniono nazwę, cechy i kategorię Allegro.")
        return
      }

      if (
        suggestData.confidence === "medium" &&
        Array.isArray(suggestData.candidates) &&
        suggestData.candidates.length === 1
      ) {
        applyCategoryLeaf(suggestData.candidates[0])
        toast.success("Wypełniono nazwę, cechy i kategorię (jedna propozycja).")
        return
      }

      const custom = suggestData.customCategoryHint?.trim()
      if (custom) {
        setCategory(serializeCategorySelection({ kind: "custom", customCategory: custom }))
        toast.success("Wypełniono nazwę i cechy; ustawiono kategorię własną z podpowiedzi.")
        return
      }

      toast.success("Wypełniono nazwę i cechy. Dopasuj kategorię w polu „Dane produktu”.")
    } catch {
      toast.error("Błąd sieci. Spróbuj ponownie.")
    } finally {
      setVerifyLoading(false)
      await refreshProfile()
    }
  }, [
    productImages,
    creditsRemaining,
    setProductName,
    setFeatures,
    setCategory,
    applyCategoryLeaf,
    refreshProfile,
  ])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left: scrollable form */}
        <div className="scrollbar-hub min-h-0 w-full flex-[1.15] space-y-4 overflow-x-hidden overflow-y-auto pb-8 pr-0 lg:max-h-[calc(100vh-11rem)] lg:pr-2">
          {/* Zdjęcia produktu */}
          <motion.section
            layout
            className="relative overflow-hidden rounded-[24px] border border-white/8 bg-linear-to-br from-white/4 via-cyan-950/16 to-emerald-950/18 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 will-change-transform hover:-translate-y-px hover:border-white/12 hover:shadow-[0_0_40px_-12px_rgba(34,211,238,0.12)] md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/4 to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/8 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-8 h-32 w-32 rounded-full bg-emerald-500/8 blur-3xl" aria-hidden />
            <button
              type="button"
              onClick={() => setOpenVisualInput((o) => !o)}
              className="relative z-10 flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex flex-wrap items-center gap-2">
                <ImagePlus className="h-4 w-4 text-cyan-400/90 drop-shadow-[0_0_14px_rgba(34,211,238,0.12)]" />
                <span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-[11px] font-bold uppercase tracking-[0.2em] text-transparent">
                  Zdjęcia produktu
                </span>
                <span
                  className="shrink-0 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.55),0_0_28px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/35"
                  aria-hidden
                >
                  Premium+
                </span>
              </span>
              <motion.span animate={{ rotate: openVisualInput ? 180 : 0 }} className="text-muted-foreground">
                ▼
              </motion.span>
            </button>
            <motion.div className="relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5" initial={false}>
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500/90 via-teal-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {openVisualInput ? (
                <motion.div
                  key="visual-input"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="relative z-10 overflow-hidden"
                >
                  <div className="space-y-5 pt-5">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-3.5 py-3 text-[11px] leading-relaxed text-cyan-100/85">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-cyan-100">Zdjęcia i weryfikacja</p>
                        <p className="mt-1 text-cyan-100/75">
                          Dodaj do {MAX_PRODUCT_IMAGES} zdjęć — przy „Weryfikuj AI” pobieramy{" "}
                          <span className="text-cyan-50/95">1 kredyt za każde zdjęcie</span> (łączymy fakty
                          ze wszystkich ujęć). „Generuj” zużywa osobno 1 kredyt na opis i po stronie serwera
                          analizuje <span className="text-cyan-50/95">pierwsze</span> zdjęcie jako kontekst
                          wizyjny.
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-100/90">
                        <span>Zdjęcia produktu</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: zdjęcia produktu">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,320px)]")}
                          >
                            <p>
                              Do {MAX_PRODUCT_IMAGES} zdjęć. „Weryfikuj AI” scala widoczne fakty; koszt to 1 kredyt
                              na zdjęcie.
                            </p>
                            <p className="mt-2 text-[12px] text-gray-300/90">
                              Najlepiej: ten sam produkt, różne ujęcia, dobre światło.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files?.length) void addProductImageFiles(files)
                          e.target.value = ""
                        }}
                      />
                      {productImages.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-7 text-center transition-colors hover:border-cyan-500/35 hover:bg-black/20"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
                            <ImagePlus className="h-5 w-5 text-cyan-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-100">Dodaj zdjęcia produktu</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              JPG, PNG lub WEBP • max 5 MB • do {MAX_PRODUCT_IMAGES} plików
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {productImages.map((img) => (
                              <div
                                key={img.id}
                                className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30"
                              >
                                <Image
                                  src={img.dataUrl}
                                  alt={img.name || "Podgląd"}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  sizes="(max-width:640px) 50vw, 33vw"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeProductImage(img.id)}
                                  disabled={verifyLoading}
                                  className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white/90 opacity-90 backdrop-blur-sm transition-opacity hover:bg-red-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Usuń ${img.name}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                <p className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1.5 py-1 text-[9px] text-gray-200/90">
                                  {img.name}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Pierwsze zdjęcie jest używane przy „Generuj” jako dodatkowa analiza wizyjna po stronie
                            serwera. Weryfikacja zbiera fakty ze <span className="text-gray-200/90">wszystkich</span>{" "}
                            ujęć.
                          </p>
                          <p className="text-[11px] text-muted-foreground/90">
                            <span className="font-medium text-emerald-200/90">Weryfikacja:</span>{" "}
                            {verifyCreditsCost}{" "}
                            {verifyCreditsCost === 1 ? "kredyt" : "kredytów"} ({verifyImageCount}{" "}
                            {verifyImageCount === 1 ? "zdjęcie" : "zdjęć"}
                            ). Pozostało kredytów: {creditsRemaining}.
                            {creditsRemaining < verifyCreditsCost ? (
                              <span className="text-amber-300/95"> — za mało kredytów na tę weryfikację.</span>
                            ) : null}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleVerifyFromImage}
                              disabled={!canVerifyFromImages}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {verifyLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                              )}
                              Weryfikuj AI
                            </button>
                            {productImages.length < MAX_PRODUCT_IMAGES ? (
                              <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={verifyLoading}
                                className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Dodaj ({productImages.length}/{MAX_PRODUCT_IMAGES})
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={clearProductImages}
                              disabled={verifyLoading}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <X className="h-3 w-3" />
                              Usuń wszystkie
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>

          {/* Dane produktu */}
          <motion.section
            layout
            className="relative overflow-hidden rounded-[24px] border border-white/8 bg-linear-to-br from-white/4.5 via-white/2 to-cyan-950/20 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 will-change-transform hover:-translate-y-px hover:border-white/12 hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.12)] md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/5 to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -left-12 h-36 w-36 rounded-full bg-emerald-600/10 blur-3xl" aria-hidden />
            <button
              type="button"
              onClick={() => setOpenData((o) => !o)}
              className="relative z-10 flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-cyan-400/90 drop-shadow-[0_0_14px_rgba(34,211,238,0.12)]" />
                <span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-[11px] font-bold uppercase tracking-[0.2em] text-transparent">
                  Dane produktu
                </span>
              </span>
              <motion.span
                animate={{ rotate: openData ? 180 : 0 }}
                className="text-muted-foreground"
              >
                ▼
              </motion.span>
            </button>
            <motion.div
              className="relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5"
              initial={false}
            >
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500/90 via-teal-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {openData ? (
                <motion.div
                  key="data"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="relative z-10 overflow-hidden"
                >
                  <div className="space-y-5 pt-5">
                    <div>
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-100/90">
                        <Label htmlFor="productName" className="text-xs font-semibold">
                          Nazwa produktu *
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: nazwa produktu">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={HUB_TOOLTIP_CLASS}
                          >
                            <p>Jak w sklepie: materiał, rozmiar, kolor — stąd powstanie tytuł SEO.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <input
                          id="productName"
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder=" "
                          maxLength={nameMax}
                          className={cn(
                            "peer w-full rounded-xl border border-white/10 bg-black/20 px-4 pb-2.5 pt-5 text-sm text-gray-100 shadow-inner",
                            "placeholder:text-transparent",
                            "transition-all duration-200",
                            "hover:border-white/20 hover:bg-black/35",
                            "focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/12"
                          )}
                        />
                        <Label
                          htmlFor="productName"
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 peer-focus:top-2.5 peer-focus:text-[10px] peer-focus:text-cyan-400/85 peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:text-[10px]"
                        >
                          Nazwa produktu *
                        </Label>
                      </div>
                      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className={cn("h-full rounded-full", charBarColor(namePct))}
                          style={{ width: `${namePct}%` }}
                          layout
                        />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground/70">
                        {productName.length}/{nameMax}
                      </p>
                      {smartTitleTrimmingActive ? (
                        <p className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-cyan-100/90">
                          <span className="font-medium text-cyan-200/95">Smart Trimming:</span> nazwa jest dłuższa niż limit tytułu na{" "}
                          {platformProfile.name} ({platformProfile.titleMaxChars} zn.) — model złoży tytuł SEO od nowa z najważniejszymi słowami, zamiast ucinać koniec.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-100/90">
                        <span>Kategoria</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: kategoria">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={HUB_TOOLTIP_CLASS}
                          >
                            <p>
                              Wybierz kategorię z hierarchii — AI dostanie pełną ścieżkę jako kontekst branżowy
                              do lepszych opisów i tagów.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <CategoryCombobox
                        value={category}
                        onChange={setCategory}
                        productName={productName}
                        features={features}
                      />
                      {categoryProductHint ? (
                        <p
                          className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100/90"
                          role="status"
                        >
                          <span className="font-medium text-amber-200/95">Kategoria vs nazwa:</span>{" "}
                          {categoryProductHint}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="mb-2.5 flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs font-semibold text-gray-100/90">
                          <Label htmlFor="features" className="text-xs font-semibold">
                            Cechy produktu *{" "}
                            <span className="font-normal tabular-nums text-muted-foreground">
                              ({effectiveSectionFill}/{CHIP_TOTAL})
                            </span>
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: cechy produktu">
                                <Info className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={8}
                              arrowClassName={HUB_TOOLTIP_ARROW}
                              className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,320px)]")}
                            >
                              <p>Jedna linia = jedna cecha. Pierwsze kliknięcie chipa dodaje szablon, drugie usuwa linię.</p>
                              <p className="mt-2 text-[12px] text-gray-300/90">
                                Przy sekcji z treścią drugie kliknięcie pyta o potwierdzenie; po usunięciu możesz cofnąć
                                (toast na dole).
                              </p>
                              <p className="mt-2 text-[11px] font-medium text-gray-400">Przykład:</p>
                              <p className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-300/85">
                                {FEATURES_EXAMPLE_LINES}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => insertAllMissingChips()}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-cyan-400/90 transition-colors hover:bg-white/5 hover:text-cyan-300"
                          >
                            Dodaj wszystkie
                          </button>
                          <span className="text-muted-foreground/40" aria-hidden>
                            |
                          </span>
                          <button
                            type="button"
                            onClick={() => clearFeatures()}
                            disabled={!features.trim()}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-amber-300/90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Wyczyść
                          </button>
                        </div>
                      </div>
                      <div className="mb-2.5">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground/70">
                          <span>Kompletność sekcji</span>
                          <span className="tabular-nums">{completenessPct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-linear-to-r from-cyan-500/90 to-emerald-500"
                            initial={false}
                            animate={{ width: `${completenessPct}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 32 }}
                          />
                        </div>
                      </div>
                      <div className="-mx-1 mb-2 overflow-x-auto overflow-y-visible pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                        <div className="flex min-w-min flex-nowrap gap-1.5 md:min-w-0 md:flex-wrap">
                          {sortedChips.map((chip) => {
                            const used = chipExistsIn(features, chip)
                            const filled = chipSectionFilled(features, chip)
                            const suggested = suggestedChipKeys.has(chip.key)
                            return (
                              <Tooltip key={chip.key}>
                                <TooltipTrigger asChild>
                                  <motion.button
                                    layout
                                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                                    type="button"
                                    onClick={() => insertChip(chip)}
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all hover:scale-[1.03]",
                                      filled
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                        : used
                                          ? "border-amber-500/35 bg-amber-500/8 text-amber-100"
                                          : suggested
                                            ? "border-cyan-500/40 bg-cyan-500/5 text-cyan-100 ring-1 ring-cyan-500/25"
                                            : "border-white/10 bg-white/3 text-muted-foreground hover:border-cyan-500/30 hover:bg-emerald-500/10 hover:text-emerald-100"
                                    )}
                                  >
                                    <chip.Icon
                                      className={cn(
                                        "h-3 w-3",
                                        filled ? "text-emerald-400" : used ? "text-amber-400" : suggested ? "text-cyan-400" : "text-cyan-400/75"
                                      )}
                                    />
                                    {chip.label}
                                    {filled ? (
                                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                    ) : used ? (
                                      <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                                    ) : null}
                                  </motion.button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  sideOffset={6}
                                  arrowClassName={HUB_TOOLTIP_ARROW}
                                  className={HUB_TOOLTIP_CLASS}
                                >
                                  <p>
                                    {used
                                      ? filled
                                        ? "Drugie kliknięcie zapyta o potwierdzenie, potem możesz cofnąć w toast"
                                        : "Kliknij ponownie, aby usunąć pustą linię (możliwa cofka w toast)"
                                      : suggested
                                        ? `Sugerowane z nazwy — ${chip.placeholder}`
                                        : chip.placeholder}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                      <textarea
                        ref={featuresRef}
                        id="features"
                        value={features}
                        onChange={(e) => setFeatures(e.target.value)}
                        placeholder={FEATURES_PLACEHOLDER}
                        maxLength={featMax}
                        className="scroll-mt-24 min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 shadow-inner transition-all hover:border-white/20 focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/12"
                      />
                      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn("h-full rounded-full transition-all", charBarColor(featPct))}
                          style={{ width: `${featPct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/60">
                        <span>Więcej szczegółów = lepszy AI opis</span>
                        <span>{features.length}/{featMax}</span>
                      </div>
                      {qualityHints.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                          {qualityHints.map((h, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start gap-2 rounded-lg px-3 py-1.5 text-[11px] leading-relaxed",
                                h.type === "success" && "bg-emerald-500/8 text-emerald-300",
                                h.type === "warning" && "bg-amber-500/8 text-amber-300",
                                h.type === "tip" && "bg-cyan-500/8 text-cyan-300"
                              )}
                            >
                              {h.type === "success" ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> : null}
                              {h.type === "warning" ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> : null}
                              {h.type === "tip" ? <Sparkles className="mt-0.5 h-3 w-3 shrink-0" /> : null}
                              <span>{h.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>

          {/* Ustawienia generacji */}
          <motion.section
            layout
            className="relative overflow-hidden rounded-[24px] border border-white/8 bg-linear-to-br from-white/4.5 via-white/2 to-emerald-950/18 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow] duration-200 will-change-transform hover:-translate-y-px hover:border-white/12 hover:shadow-[0_0_40px_-12px_rgba(34,211,238,0.1)] md:p-6"
          >
            <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-500/8 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/4 to-transparent" />
            <button
              type="button"
              onClick={() => setOpenSettings((o) => !o)}
              className="relative z-10 flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-cyan-400/90 drop-shadow-[0_0_14px_rgba(34,211,238,0.12)]" />
                <span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-[11px] font-bold uppercase tracking-[0.2em] text-transparent">
                  Ustawienia generacji
                </span>
              </span>
              <motion.span animate={{ rotate: openSettings ? 180 : 0 }} className="text-muted-foreground">
                ▼
              </motion.span>
            </button>
            <motion.div className="relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5" initial={false}>
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500/90 via-teal-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {openSettings ? (
                <motion.div
                  key="settings"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="relative z-10 overflow-hidden"
                >
                  <div className="space-y-6 pt-6">
                    <div>
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-100/90">
                        <span>Platforma docelowa</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: platforma docelowa">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,280px)]")}
                          >
                            <p>
                              Limity tytułu i opisów biorą się z profilu platformy (np. Allegro 75 zn. w
                              tytule). Pełne zasady trafiają do promptu AI.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map((p) => {
                          const Icon = PLATFORM_ICONS[p.value] ?? Package
                          const iconColor = PLATFORM_ICON_COLORS[p.value] ?? "currentColor"
                          const isActive = platform === p.value
                          return (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setPlatform(p.value)}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium tracking-wide transition-all duration-200 ease-out will-change-transform",
                                "hover:scale-[1.03]",
                                isActive
                                  ? "border-emerald-500 bg-emerald-500/12 text-emerald-200 shadow-[0_0_16px_-4px_rgba(16,185,129,0.22),0_0_20px_-6px_rgba(34,211,238,0.1)]"
                                  : "border-gray-700/80 bg-gray-800/50 text-muted-foreground hover:border-cyan-600/35 hover:bg-gray-800/70"
                              )}
                            >
                              <Icon
                                className="h-4 w-4 shrink-0 opacity-95"
                                strokeWidth={1.75}
                                style={{ color: iconColor }}
                              />
                              {p.label}
                            </button>
                          )
                        })}
                      </div>
                      {platform === "ogolny" || platform === "ogolny_plain" ? (
                        <div
                          className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2.5 text-[10px] leading-snug text-cyan-50/95"
                          role="status"
                        >
                          <p className="font-semibold tracking-wide text-cyan-100/95">Tryb ogólny</p>
                          <p className="mt-1.5 text-muted-foreground/90">
                            {platform === "ogolny" ? (
                              <>
                                „Ogólny” to{" "}
                                <strong className="font-medium text-foreground/90">szablon HTML</strong> z
                                uniwersalnymi limitami (np. tytuł 70 zn.) — nie zastępuje reguł konkretnej
                                platformy. Jeśli znasz kanał sprzedaży, wybierz go z listy, żeby dopasować limity
                                i prompt AI.
                              </>
                            ) : (
                              <>
                                „Ogólny (tekst)” generuje{" "}
                                <strong className="font-medium text-foreground/90">plain text</strong> bez HTML
                                — np. pod proste pola, ogłoszenia lub wklejenie do edytora bez formatowania.
                              </>
                            )}
                          </p>
                          <p className="mt-1.5 text-muted-foreground/80">
                            Limity tytułu różnią się między kanałami (np. Allegro 75 zn., Etsy 140 zn.) — przy
                            trybie ogólnym Smart Trimming trzyma się{" "}
                            <strong className="font-medium text-muted-foreground/90">
                              {platformProfile.titleMaxChars} zn.
                            </strong>{" "}
                            z profilu.
                          </p>
                        </div>
                      ) : null}
                      {(platformProfile.uiKeyPoints ?? []).length > 0 ? (
                        <ul className="mt-3 space-y-1.5 text-[10px] leading-snug text-muted-foreground/90">
                          {(platformProfile.uiKeyPoints ?? []).map((line, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-0.5 shrink-0 text-emerald-400/90" aria-hidden>
                                •
                              </span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-2 text-[10px] leading-snug text-muted-foreground/75">
                        Na wynik AI wpływają:{" "}
                        <strong className="font-medium text-muted-foreground/90">platforma</strong>,{" "}
                        <strong className="font-medium text-muted-foreground/90">ton</strong>,{" "}
                        <strong className="font-medium text-muted-foreground/90">nazwa produktu</strong> i{" "}
                        <strong className="font-medium text-muted-foreground/90">cechy</strong>. Rozwinięcie poniżej to
                        podpowiedź — nie zmienia samo w sobie wygenerowanego tekstu.
                      </p>
                      {(completenessPct < 40 || effectiveSectionFill < 3) &&
                      (productName.trim() !== "" || features.trim() !== "") ? (
                        <p
                          className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-2.5 py-2 text-[10px] leading-snug text-amber-100/90"
                          role="status"
                        >
                          Kompletność cech jest niska ({completenessPct}%, {effectiveSectionFill}/{CHIP_TOTAL}{" "}
                          sekcji — liczone także linie „Etykieta: wartość”, nie tylko chipy). Dodaj konkretne fakty lub
                          użyj chipów.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={togglePlatformDetails}
                        className={cn(
                          "group mt-2 inline-flex w-full max-w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[10px] font-semibold tracking-wide transition-all duration-200 ease-out sm:w-auto sm:justify-start",
                          "bg-linear-to-r from-cyan-500/14 via-emerald-500/10 to-transparent",
                          "border-cyan-500/35 text-cyan-100/95",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_-12px_rgba(34,211,238,0.35)]",
                          "hover:border-cyan-400/55 hover:from-cyan-500/22 hover:via-emerald-500/14 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.45)] hover:scale-[1.01] active:scale-[0.99]",
                          platformInfoOpen &&
                            "border-emerald-500/45 from-emerald-500/18 via-cyan-500/12 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_28px_-10px_rgba(16,185,129,0.35)]"
                        )}
                        aria-expanded={platformInfoOpen}
                      >
                        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 sm:flex-initial">
                          <Sparkles
                            className={cn(
                              "h-3 w-3 shrink-0 text-cyan-300 transition-colors group-hover:text-cyan-200",
                              platformInfoOpen && "text-emerald-300 group-hover:text-emerald-200"
                            )}
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            {platformInfoOpen
                              ? "Ukryj szczegóły platformy"
                              : "Pokaż szczegóły platformy"}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-cyan-200/90 transition-transform duration-200 group-hover:text-cyan-100",
                            platformInfoOpen && "rotate-180 text-emerald-200/90"
                          )}
                          strokeWidth={2}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {platformInfoOpen ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
                              <span className="font-medium text-muted-foreground/95">
                                {platformProfile.name}:
                              </span>{" "}
                              {platformProfile.uiLimitsSummary ?? (
                                <>
                                  tytuł max {platformProfile.titleMaxChars} zn., opis krótki do{" "}
                                  {platformProfile.charLimits.shortDesc} zn., meta do{" "}
                                  {platformProfile.charLimits.metaDesc} zn., opis długi min.{" "}
                                  {platformProfile.charLimits.longDescMinWords} słów.
                                </>
                              )}
                            </p>
                            {platformProfile.uiAccordionBullets?.length ? (
                              <ul className="mt-2 list-inside list-disc space-y-1 pl-0.5 text-[10px] leading-snug text-muted-foreground/70">
                                {platformProfile.uiAccordionBullets.map((line, i) => (
                                  <li key={i}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-[10px] leading-snug text-muted-foreground/65">
                                {platformProfile.seoNotes}
                              </p>
                            )}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div>
                      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-gray-100/90">
                        <span>Ton opisu</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: ton opisu">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={HUB_TOOLTIP_CLASS}
                          >
                            <p>
                              Jak formalnie lub swobodnie ma brzmieć opis. Najedź na chip — zobaczysz krótki opis
                              stylu.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => {
                          const Icon = TONE_ICONS[t.value] ?? Settings2
                          const isActive = tone === t.value
                          return (
                            <Tooltip key={t.value} delayDuration={250}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setTone(t.value)}
                                  aria-label={`${t.label}: ${t.description}`}
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium tracking-wide transition-all duration-200 ease-out will-change-transform",
                                    "hover:scale-[1.03]",
                                    isActive
                                      ? "border-emerald-500 bg-emerald-500/12 text-emerald-200 shadow-[0_0_16px_-4px_rgba(16,185,129,0.22),0_0_20px_-6px_rgba(34,211,238,0.1)]"
                                      : "border-gray-700/80 bg-gray-800/50 text-muted-foreground hover:border-cyan-600/35 hover:bg-gray-800/70"
                                  )}
                                >
                                  <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                                  {t.label}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={6}
                                arrowClassName={HUB_TOOLTIP_ARROW}
                                className={cn(HUB_TOOLTIP_CLASS, "max-w-[260px]")}
                              >
                                <p className="font-medium text-emerald-100/95">{t.label}</p>
                                <p className="mt-1 text-[12px] text-gray-200/90">{t.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {brandVoiceData ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setUseBrandVoice(!useBrandVoice)}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-linear-to-r from-gray-800/60 to-gray-800/50 px-4 py-3 text-left transition-all hover:border-cyan-500/25 hover:shadow-[0_0_24px_-8px_rgba(16,185,129,0.1)]"
                          >
                            <span className="text-sm font-medium text-gray-100">Brand Voice</span>
                            <span
                              className={cn(
                                "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
                                useBrandVoice
                                  ? "bg-linear-to-r from-cyan-500 to-emerald-500"
                                  : "bg-gray-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-300",
                                  useBrandVoice ? "left-6" : "left-1"
                                )}
                              />
                            </span>
                          </button>
                          <p className="text-[10px] leading-relaxed text-muted-foreground/85">
                            Dopasowanie do marki działa tylko po zapisaniu profilu w{" "}
                            <Link
                              href="/dashboard/brand"
                              className="text-emerald-400/90 underline-offset-2 hover:underline"
                            >
                              Brand Voice
                            </Link>
                            . Włącz przełącznik — generator użyje zapisanego tonu i stylu.
                          </p>
                        </>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/12 bg-gray-900/35 px-4 py-3">
                          <p className="text-sm font-medium text-gray-100">Brand Voice</p>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/88">
                            Dopasowanie tonu i stylu do Twojej marki działa dopiero po skonfigurowaniu profilu w{" "}
                            <Link
                              href="/dashboard/brand"
                              className="font-medium text-emerald-400/90 underline-offset-2 hover:underline"
                            >
                              Dashboard → Brand Voice
                            </Link>
                            .
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>

          {/* CTA: pod ustawieniami — w flow strony zamiast fixed bottom */}
          <div className="w-full">
            <div className="rounded-2xl border border-white/10 bg-gray-950/80 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className={cn(
                  "generate-cta-shimmer group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-8 py-4 text-sm font-bold text-white transition-all duration-200",
                  "border border-emerald-500/35 shadow-[0_0_22px_rgba(16,185,129,0.14),0_0_48px_rgba(34,211,238,0.06)]",
                  "hover:scale-[1.01] hover:shadow-[0_0_32px_rgba(16,185,129,0.22),0_0_40px_rgba(34,211,238,0.08)] active:scale-[0.98] active:shadow-md",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
                  loading && "animate-pulse-glow"
                )}
              >
                <span className="generate-cta-gradient absolute inset-0 opacity-90" />
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                {loading ? (
                  <span className="relative z-10 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generuję…
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                    Generuj opis
                  </span>
                )}
              </button>
              <div className="mt-2 flex flex-col items-center gap-1 text-center text-[11px] text-muted-foreground sm:flex-row sm:justify-center sm:gap-4">
                <span>
                  <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>{" "}
                  +{" "}
                  <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
                  = Generuj
                </span>
                {creditsRemaining > 0 ? (
                  <span className="tabular-nums text-emerald-400/75">
                    Pozostało {creditsRemaining} kredytów
                  </span>
                ) : (
                  <Link href="/dashboard/settings" className="text-red-400">
                    Limit wyczerpany — Upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Mobile preview block */}
          <div className="lg:hidden">
            <LivePreviewPanel
              loading={loading}
              loadingStep={loadingStep}
              loadingMessages={loadingMessages}
              result={result}
              error={error || null}
              productName={productName}
            />
            {result && !loading ? (
              <div className="mt-4 space-y-4">
                <DescriptionResult
                  result={result}
                  productName={productName}
                  featuresText={features}
                  onRefineQuality={handleRefineQualityProp}
                  refineAlreadyUsed={refineAlreadyUsed}
                  loading={loading}
                  creditsRemaining={creditsRemaining}
                />
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 text-sm text-cyan-400/90"
                >
                  {showPreview ? "Ukryj" : "Pokaż"} podgląd na platformie
                </button>
                {showPreview ? <PlatformPreview result={result} platform={platform} /> : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: sticky live preview */}
        <div className="hidden min-h-0 w-full flex-[0.85] lg:block lg:max-w-[44%]">
          <div className="sticky top-6 space-y-6">
            <LivePreviewPanel
              loading={loading}
              loadingStep={loadingStep}
              loadingMessages={loadingMessages}
              result={result}
              error={error || null}
              productName={productName}
            />
            {result && !loading ? (
              <>
                <DescriptionResult
                  result={result}
                  productName={productName}
                  featuresText={features}
                  onRefineQuality={handleRefineQualityProp}
                  refineAlreadyUsed={refineAlreadyUsed}
                  loading={loading}
                  creditsRemaining={creditsRemaining}
                />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="mb-4 flex items-center gap-2 text-sm text-cyan-400/90"
                  >
                    {showPreview ? "Ukryj" : "Pokaż"} podgląd na platformie
                  </button>
                  {showPreview ? <PlatformPreview result={result} platform={platform} /> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}


