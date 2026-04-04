"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Barcode,
  Beaker,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Factory,
  Hash,
  Info,
  Lightbulb,
  Layers,
  List,
  Loader2,
  Package,
  Palette,
  Ruler,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sparkles,
  Star,
  Tag,
  Target,
  Users,
  Weight,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
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
import { createPortal } from "react-dom"
import toast from "react-hot-toast"

import DescriptionResult from "@/components/generator/DescriptionResult"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { serializeCategorySelection } from "@/lib/allegro/category-selection"
import type { CategorySelectionTree } from "@/lib/allegro/types"
import { getCategoryProductNameHint } from "@/lib/generation/category-product-hint"
import {
  formatProductImageAnalysisForFeaturesField,
  type ProductImageAnalysis,
} from "@/lib/generation/product-image-analysis"
import {
  getDescriptionImageEmbedCap,
  MAX_DESCRIPTION_IMAGE_URLS,
} from "@/lib/generation/parse-description-image-urls"
import { needsSmartTitleTrimming } from "@/lib/generation/smart-title-trimming"
import {
  PLATFORMS,
  PLATFORM_GROUP_LABELS,
  TONES,
  type PlatformGroupId,
} from "@/lib/constants"
import { getPlatformProfile } from "@/lib/platforms"
import type { ListingAuditResult } from "@/lib/generation/listing-audit"
import type { GenerateResponse, ProductImageEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

import { CategoryCombobox } from "./CategoryCombobox"
import { PLATFORM_ICON_COLORS, PLATFORM_ICONS, TONE_ICONS } from "./generate-ui-maps"
import { LivePreviewPanel } from "./LivePreviewPanel"
import { ProductImageVisionPanel } from "./ProductImageVisionPanel"
import { FeaturesSectionPreview } from "./FeaturesSectionPreview"
import { VisionExtractionEditor } from "./VisionExtractionEditor"

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

/** PNG w `public/icon/` — gdy brak, baner używa ikony SVG z `generate-ui-maps`. */
const PLATFORM_BANNER_LOGO_SRC: Partial<Record<string, string>> = {
  amazon: "/icon/amazon icon.png",
  ebay: "/icon/ebay icon.png",
  etsy: "/icon/etsy icon.png",
  olx: "/icon/olx icon.png",
  woocommerce: "/icon/woo comerce.png",
}

/** Krótka wskazówka (≤60 zn.) pod krok „Dane produktu”. */
function getPlatformStepBannerHint(slug: string): string {
  switch (slug) {
    case "allegro":
      return "Tytuł max 75 zn. · Parametry i EAN ustawiasz przy wystawianiu"
    case "amazon":
      return "Tytuł do 200 zn. · Bullety i backend w Seller Central"
    case "shopify":
      return "Tytuł ~70 zn. · Meta i szablon ustawiasz w Shopify"
    case "woocommerce":
      return "Tytuł ~70 zn. · SEO w Woo i motywie sklepu"
    case "ebay":
      return "Tytuł max 80 zn. · Item specifics w panelu eBay"
    case "etsy":
      return "Tytuł do 140 zn. · Tagi i atrybuty w formularzu"
    case "vinted":
      return "Tytuł do 70 zn. · Hashtagi na końcu opisu"
    case "empikplace":
      return "Tytuł do 120 zn. · Parametry jak w Empik Place"
    case "olx":
      return "Tytuł do 70 zn. · Opis plain text — bez HTML"
    case "ogolny":
      return "Szablon HTML — limity zależą od eksportu"
    case "ogolny_plain":
      return "Plain text — dopasuj treść do kanału"
    default:
      return "Sprawdź limity tytułu i formularza przy wystawianiu"
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

type FeatureChipGroup = {
  id: string
  title: string
  hint: string
  keys: readonly string[]
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
    label: "Rozmiar / wariant",
    prefix: "Rozmiary",
    aliases: ["Wymiary", "Wymiar", "Rozmiar"],
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
  {
    key: "gram",
    label: "Pojemność / gramatura",
    prefix: "Miary i pojemność",
    aliases: [
      "Gramatura",
      "Pojemność",
      "Objętość",
      "Masa netto",
      "Gęstość",
      "Gramatura tkaniny",
    ],
    placeholder: "np. 200 g/m², 500 ml, 250 g netto — dopisz liczby z etykiety",
    Icon: Beaker,
  },
  { key: "prod", label: "Produkcja", prefix: "Produkcja", placeholder: "np. Polska, UE, certyfikat OEKO-TEX", Icon: Factory },
  { key: "use", label: "Zastosowanie", prefix: "Zastosowanie", placeholder: "np. na co dzień, do biura, sport", Icon: Target },
  { key: "care", label: "Pielęgnacja", prefix: "Pielęgnacja", placeholder: "np. pranie 30°C, nie wybielać", Icon: Droplets },
  { key: "warranty", label: "Gwarancja", prefix: "Gwarancja", placeholder: "np. 24 miesiące, zwrot 30 dni", Icon: ShieldCheck },
  {
    key: "state",
    label: "Stan",
    prefix: "Stan",
    aliases: ["Stan produktu", "Kondycja"],
    placeholder: "np. nowy, nowy w folii, poekspozycyjny, używany",
    Icon: AlertTriangle,
  },
  { key: "unique", label: "Wyróżnik", prefix: "Wyróżnik", placeholder: "np. ręcznie szyte, limitowana edycja", Icon: Star },
  {
    key: "compat",
    label: "Kompatybilność",
    prefix: "Kompatybilność",
    aliases: ["Pasuje do", "Zgodność", "Kompatybilne z"],
    placeholder: "np. iPhone 15, gwint 1/2 cala, system Makita LXT",
    Icon: Settings2,
  },
  {
    key: "ean",
    label: "EAN",
    prefix: "EAN",
    aliases: ["Kod EAN", "Kod kreskowy"],
    placeholder: "np. 5901234567890",
    Icon: Barcode,
  },
  {
    key: "sku",
    label: "SKU",
    prefix: "SKU",
    aliases: ["Symbol produktu", "Kod produktu", "Indeks"],
    placeholder: "np. ABC-123-PL",
    Icon: Hash,
  },
  { key: "weight", label: "Waga", prefix: "Waga", placeholder: "np. 1,2 kg / 450 g", Icon: Weight },
  {
    key: "dims",
    label: "Wymiary produktu",
    prefix: "Wymiary produktu",
    aliases: ["Wymiary (produkt)", "Wymiary gabarytów"],
    placeholder: "np. 30 × 20 × 10 cm",
    Icon: Box,
  },
  {
    key: "cert",
    label: "Certyfikaty",
    prefix: "Certyfikaty",
    aliases: ["Normy", "Certyfikat"],
    placeholder: "np. CE, OEKO-TEX",
    Icon: BadgeCheck,
  },
  {
    key: "pack",
    label: "W zestawie",
    prefix: "Zawartość zestawu",
    aliases: ["W zestawie", "Komplet zawiera"],
    placeholder: "np. kabel, instrukcja, futerał",
    Icon: Layers,
  },
]

const FEATURE_CHIP_GROUPS: FeatureChipGroup[] = [
  {
    id: "basics",
    title: "Podstawowe",
    hint: "Najczęściej uzupełniane informacje o produkcie i wariantach.",
    keys: ["mat", "size", "col", "use", "care", "state", "unique"],
  },
  {
    id: "specs",
    title: "Parametry",
    hint: "Twarde dane, liczby i informacje techniczne.",
    keys: ["gram", "weight", "dims", "compat", "prod", "warranty"],
  },
  {
    id: "codes",
    title: "Kody i zgodność",
    hint: "Identyfikatory oferty, normy i zawartość zestawu.",
    keys: ["ean", "sku", "cert", "pack"],
  },
]

const FEATURE_CHIP_GROUP_ICONS: Partial<Record<string, LucideIcon>> = {
  basics: Layers,
  specs: Ruler,
  codes: Barcode,
  highlighted: Sparkles,
  extra: Package,
}

const HighlightChipGroupIcon = FEATURE_CHIP_GROUP_ICONS.highlighted!
const ExtraChipGroupIcon = FEATURE_CHIP_GROUP_ICONS.extra!

/** EAN / SKU nie pokazujemy w „Najpierw uzupełnij” — tylko w grupie „Kody i zgodność”. */
const FEATURE_CHIP_KEYS_NO_PRIORITY_STRIP = new Set<string>(["ean", "sku"])

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

/** Wstawia lub nadpisuje linię cechy „Prefix: …” (valueAfterColon puste = sam nagłówek). */
function replaceFeatureChipLine(text: string, chip: SuggestionChip, valueAfterColon: string): string {
  const fullLine =
    valueAfterColon === "" ? `${chip.prefix}: ` : `${chip.prefix}: ${valueAfterColon}`
  if (!chipExistsIn(text, chip)) {
    return text.trim() ? `${text.trim()}\n${fullLine}` : fullLine
  }
  const lines = text.split("\n")
  const prefs = chipPrefixes(chip)
  const idx = lines.findIndex((l) => {
    const t = l.trim()
    return prefs.some((pr) => lineMatchesChipHeader(t, pr))
  })
  if (idx < 0) return text.trim() ? `${text.trim()}\n${fullLine}` : fullLine
  const next = [...lines]
  next[idx] = fullLine
  return next.join("\n")
}

/** Wiersz listy presetów: wybieralna wartość albo nagłówek sekcji (tylko UI, bez `value`). */
type ChipPresetOption =
  | { label: string; value: string }
  | { label: string; heading: true }

function isChipPresetValueRow(p: ChipPresetOption): p is { label: string; value: string } {
  return !("heading" in p && p.heading)
}

/** Presety pod chipy cech — można zaznaczyć wiele; wartości łączymy przecinkami w jednej linii. */
const SUGGESTION_CHIP_PRESETS: Record<SuggestionChip["key"], ChipPresetOption[]> = {
  mat: [
    { label: "Tekstylia i włókna", heading: true },
    { label: "Bawełna", value: "bawełna" },
    { label: "Bawełna z elastanem", value: "bawełna z elastanem" },
    { label: "Poliester", value: "poliester" },
    { label: "Mieszanka bawełna / poliester", value: "mieszanka bawełny i poliestru" },
    { label: "Wełna", value: "wełna" },
    { label: "Len", value: "len" },
    { label: "Jedwab", value: "jedwab" },
    { label: "Nylon", value: "nylon" },
    { label: "Bambus", value: "bambus" },
    { label: "Modal", value: "modal" },
    { label: "Wiskoza", value: "wiskoza" },
    { label: "Lyocell", value: "lyocell" },
    { label: "Elastan", value: "elastan" },
    { label: "Kaszmir", value: "kaszmir" },
    { label: "Moher", value: "moher" },
    { label: "Alpaka", value: "alpaka" },
    { label: "Mikrofibra", value: "mikrofibra" },
    { label: "Włókno akrylowe", value: "włókno akrylowe" },
    { label: "Dzianina", value: "dzianina" },
    { label: "Jersey", value: "jersey" },
    { label: "Denim", value: "denim" },
    { label: "Polar", value: "polar" },
    { label: "Flanel", value: "flanel" },
    { label: "Frota", value: "frota" },
    { label: "Satyna", value: "satyna" },
    { label: "Welur", value: "welur" },
    { label: "Koronka", value: "koronka" },
    { label: "Tiul", value: "tiul" },
    { label: "Neopren", value: "neopren" },

    { label: "Skóra i zamienniki", heading: true },
    { label: "Skóra naturalna", value: "skóra naturalna" },
    { label: "Zamsz / nubuk", value: "zamsz" },
    { label: "Eko-skóra", value: "eko-skóra" },

    { label: "Metale", heading: true },
    { label: "Stal", value: "stal" },
    { label: "Stal nierdzewna", value: "stal nierdzewna" },
    { label: "Stal ocynkowana", value: "stal ocynkowana" },
    { label: "Stal czarna", value: "stal czarna" },
    { label: "Żeliwo", value: "żeliwo" },
    { label: "Aluminium", value: "aluminium" },
    { label: "Cynk", value: "cynk" },
    { label: "Chrom", value: "chrom" },
    { label: "Nikiel", value: "nikiel" },
    { label: "Miedź", value: "miedź" },
    { label: "Mosiądz", value: "mosiądz" },
    { label: "Brąz", value: "brąz" },
    { label: "Tytan", value: "tytan" },
    { label: "Złoto", value: "złoto" },
    { label: "Srebro", value: "srebro" },

    { label: "Drewno, szkło, ceramika", heading: true },
    { label: "Drewno", value: "drewno" },
    { label: "Szkło", value: "szkło" },
    { label: "Ceramika", value: "ceramika" },
    { label: "Porcelana", value: "porcelana" },
    { label: "Kamionka", value: "kamionka" },
    { label: "Rattan / wiklina", value: "rattan / wiklina" },

    { label: "Tworzywa sztuczne", heading: true },
    { label: "Plastik", value: "plastik" },
    { label: "ABS", value: "ABS" },
    { label: "Polietylen", value: "polietylen" },
    { label: "Polipropylen", value: "polipropylen" },
    { label: "PET", value: "PET" },
    { label: "Poliwęglan", value: "poliwęglan" },
    { label: "Polistyren", value: "polistyren" },
    { label: "Akryl", value: "akryl" },
    { label: "PCV", value: "PCV" },
    { label: "Melamina", value: "melamina" },
    { label: "Silikon", value: "silikon" },

    { label: "Elastomery i pianki", heading: true },
    { label: "TPU", value: "TPU" },
    { label: "TPE", value: "TPE" },
    { label: "EVA", value: "EVA" },
    { label: "Pianka poliuretanowa", value: "pianka poliuretanowa" },
    { label: "Poliuretan", value: "poliuretan" },
    { label: "Poliamid wzmocniony", value: "poliamid wzmocniony" },
    { label: "Teflon", value: "teflon" },
    { label: "Kompozyt szklany", value: "kompozyt wzmocniony włóknem szklanym" },

    { label: "Styropian", heading: true },
    { label: "Styrodur", value: "styrodur" },
    { label: "Styropian kulkowy", value: "styropian kulkowy" },

    { label: "Guma i korek", heading: true },
    { label: "Guma", value: "guma" },
    { label: "Korek", value: "korek" },
  ],
  size: [
    { label: "Odzież — litery", heading: true },
    { label: "XXXS", value: "XXXS" },
    { label: "XXS", value: "XXS" },
    { label: "XS", value: "XS" },
    { label: "S", value: "S" },
    { label: "M", value: "M" },
    { label: "L", value: "L" },
    { label: "XL", value: "XL" },
    { label: "XXL", value: "XXL" },
    { label: "3XL / 4XL", value: "3XL, 4XL" },
    { label: "5XL / 6XL", value: "5XL, 6XL" },
    { label: "7XL / 8XL", value: "7XL, 8XL" },

    { label: "Uniwersalne", heading: true },
    { label: "Uniwersalny", value: "uniwersalny" },
    { label: "One size", value: "one size" },
    { label: "Regulowany", value: "regulowany" },

    { label: "Odzież — numery EU", heading: true },
    { label: "28–30", value: "28–30" },
    { label: "30–32", value: "30–32" },
    { label: "32–34", value: "32–34" },
    { label: "34–42 (rozmiarówka)", value: "34–42" },
    { label: "36–46", value: "36, 38, 40, 42, 44, 46" },
    { label: "44–54 (plus size)", value: "44, 46, 48, 50, 52, 54" },
    { label: "46–52", value: "46, 48, 50, 52" },
    { label: "52–58", value: "52, 54, 56, 58" },

    { label: "Dziecięce — wzrost (cm)", heading: true },
    { label: "50–68 (niemowlę / maluch)", value: "50, 56, 62, 68" },
    { label: "74–98", value: "74, 80, 86, 92, 98" },
    { label: "104–122", value: "104, 110, 116, 122" },
    { label: "128–152", value: "128, 134, 140, 146, 152" },
    { label: "158 / 164 (nastolatek)", value: "158, 164" },
    { label: "164 / 170 / 176 (młodzież)", value: "164, 170, 176" },

    { label: "Skarpety — rozmiar stopy (cm)", heading: true },
    { label: "23–26", value: "23–26" },
    { label: "27–30", value: "27–30" },
    { label: "31–35", value: "31–35" },
    { label: "36–41", value: "36–41" },
    { label: "42–46", value: "42–46" },

    { label: "Buty — EU", heading: true },
    { label: "EU 34", value: "EU 34" },
    { label: "EU 35", value: "EU 35" },
    { label: "EU 36", value: "EU 36" },
    { label: "EU 37", value: "EU 37" },
    { label: "EU 38", value: "EU 38" },
    { label: "EU 39", value: "EU 39" },
    { label: "EU 40", value: "EU 40" },
    { label: "EU 40.5", value: "EU 40.5" },
    { label: "EU 41", value: "EU 41" },
    { label: "EU 41.5", value: "EU 41.5" },
    { label: "EU 42", value: "EU 42" },
    { label: "EU 42.5", value: "EU 42.5" },
    { label: "EU 43", value: "EU 43" },
    { label: "EU 44", value: "EU 44" },
    { label: "EU 44.5", value: "EU 44.5" },
    { label: "EU 45", value: "EU 45" },
    { label: "EU 46", value: "EU 46" },
    { label: "EU 47–49", value: "EU 47–49" },
    { label: "EU 50+", value: "EU 50+" },
    { label: "Długość wkładki (cm)", value: "długość wkładki w cm (dopisz)" },

    { label: "Buty — UK / US (orientacyjnie)", heading: true },
    { label: "UK 3 / EU 35–36", value: "UK 3" },
    { label: "UK 4 / EU 37", value: "UK 4" },
    { label: "UK 5 / EU 38", value: "UK 5" },
    { label: "UK 6 / EU 39", value: "UK 6" },
    { label: "UK 7 / EU 40–41", value: "UK 7" },
    { label: "UK 8 / EU 42", value: "UK 8" },
    { label: "UK 9 / EU 43", value: "UK 9" },
    { label: "UK 10 / EU 44–45", value: "UK 10" },
    { label: "US 7 / EU 40", value: "US 7" },
    { label: "US 8 / EU 41", value: "US 8" },
    { label: "US 9 / EU 42", value: "US 9" },
    { label: "US 10 / EU 43", value: "US 10" },
    { label: "US 11 / EU 44", value: "US 11" },
    { label: "US 12 / EU 45", value: "US 12" },

    { label: "Spodnie — długość (cale, jeans)", heading: true },
    { label: "L28", value: "L28" },
    { label: "L30", value: "L30" },
    { label: "L32", value: "L32" },
    { label: "L34", value: "L34" },
    { label: "L36", value: "L36" },
    { label: "L38", value: "L38" },

    { label: "Bielizna / obwody", heading: true },
    { label: "Obwód pod biustem 65–90", value: "obwód pod biustem (dopisz cm)" },
    { label: "Miseczka A–G (dopisz)", value: "miseczka (dopisz)" },
    { label: "Obwód w pasie (spodnie)", value: "obwód w pasie cm (dopisz)" },

    { label: "Pościel / materace (cm)", heading: true },
    { label: "90 × 200", value: "90 × 200 cm" },
    { label: "120 × 200", value: "120 × 200 cm" },
    { label: "140 × 200", value: "140 × 200 cm" },
    { label: "160 × 200", value: "160 × 200 cm" },
    { label: "180 × 200", value: "180 × 200 cm" },
    { label: "200 × 200", value: "200 × 200 cm" },
    { label: "200 × 220", value: "200 × 220 cm" },
    { label: "220 × 200", value: "220 × 200 cm" },

    { label: "Koła / sport (orientacyjnie)", heading: true },
    { label: "Koło 26 cali", value: "26 cali" },
    { label: "Koło 27.5 cala", value: "27,5 cala" },
    { label: "Koło 28 cali", value: "28 cali" },
    { label: "Koło 29 cali", value: "29 cali" },
    { label: "Piłka rozmiar 3 / 4 / 5", value: "rozmiar piłki (dopisz 3, 4 lub 5)" },

    { label: "Wymiary i obwody", heading: true },
    { label: "Szer. × wys. × gł. (cm)", value: "np. 30 × 20 × 10 cm" },
    { label: "Średnica (cm)", value: "średnica w cm (dopisz)" },
    { label: "Wymiary w cm (dopisz)", value: "wymiary w cm" },
    { label: "Długość rękawa (cm)", value: "długość rękawa w cm" },
    { label: "Obwód (cm)", value: "obwód w cm (dopisz)" },
    { label: "Długość paska (cm)", value: "długość paska w cm (np. 100–120)" },
    { label: "Rozmiar opony (dopisz)", value: "np. 205/55 R16" },
    { label: "Średnica tarczy / felgi (cale)", value: "średnica w calach (dopisz)" },

    { label: "Warianty zestawu / pojemności", heading: true },
    { label: "50 ml / 100 ml / 200 ml", value: "np. 50 ml / 100 ml / 200 ml" },
    { label: "Pojemność: 250 ml / 500 ml / 1 l", value: "np. 250 ml / 500 ml / 1 l" },
    { label: "1,5 l / 2 l", value: "np. 1,5 l / 2 l" },
    { label: "Zestaw 2 szt.", value: "zestaw 2 szt." },
    { label: "Zestaw 4 / 6 / 10 szt.", value: "zestaw (dopisz liczbę szt.)" },
    { label: "Standard / PRO", value: "wariant: Standard lub PRO (dopisz)" },
    { label: "Wersja: mini / standard / maxi", value: "wersja: mini, standard lub maxi (dopisz)" },

    { label: "Inne", heading: true },
    { label: "Baterie AA / AAA", value: "AA lub AAA (dopisz)" },
    { label: "Bateria CR2032", value: "CR2032" },
    { label: "Pojemność akumulatora (mAh)", value: "pojemność mAh (dopisz)" },
  ],
  col: [
    { label: "Biel i ciepłe neutrale", heading: true },
    { label: "Biały", value: "biały" },
    { label: "Złamana biel / kość słoniowa", value: "złamana biel / kość słoniowa" },
    { label: "Ecru / kremowy", value: "ecru" },
    { label: "Beżowy", value: "beżowy" },
    { label: "Piaskowy", value: "piaskowy" },

    { label: "Szarości i czerń", heading: true },
    { label: "Szary", value: "szary" },
    { label: "Jasnoszary", value: "jasnoszary" },
    { label: "Ciemnoszary", value: "ciemnoszary" },
    { label: "Popielaty / stalowy", value: "popielaty" },
    { label: "Antracyt / grafit", value: "antracytowy" },
    { label: "Czarny", value: "czarny" },
    { label: "Czarny mat / soft black", value: "czarny mat" },

    { label: "Brązy i ziemie", heading: true },
    { label: "Brązowy", value: "brązowy" },
    { label: "Jasny brąz", value: "jasnobrązowy" },
    { label: "Czekoladowy", value: "czekoladowy" },
    { label: "Karmel / karmelowy", value: "karmelowy" },
    { label: "Orzechowy / wenge", value: "orzechowy wenge" },
    { label: "Taupe / cappuccino", value: "taupe" },
    { label: "Khaki", value: "khaki" },

    { label: "Niebieskie i granaty", heading: true },
    { label: "Błękitny", value: "błękitny" },
    { label: "Niebieski", value: "niebieski" },
    { label: "Chabrowy", value: "chabrowy" },
    { label: "Kobalt", value: "kobaltowy" },
    { label: "Granatowy", value: "granatowy" },
    { label: "Lazurowy / szafirowy", value: "lazurowy" },
    { label: "Petrol / niebieski petrol", value: "petrol" },
    { label: "Jeans / denim", value: "jeans (niebieski denim)" },

    { label: "Zielenie", heading: true },
    { label: "Zielony", value: "zielony" },
    { label: "Jasnozielony", value: "jasnozielony" },
    { label: "Ciemnozielony / leśny", value: "ciemnozielony" },
    { label: "Butelkowa zieleń", value: "butelkowa zieleń" },
    { label: "Oliwkowy", value: "oliwkowy" },
    { label: "Limonkowy", value: "limonkowy" },
    { label: "Seledynowy", value: "seledynowy" },
    { label: "Miętowy", value: "miętowy" },

    { label: "Turkus i aqua", heading: true },
    { label: "Turkusowy / teal", value: "turkusowy" },
    { label: "Aqua / morski", value: "aqua" },

    { label: "Żółcie i pomarańcze", heading: true },
    { label: "Żółty", value: "żółty" },
    { label: "Cytrynowy / cytryna", value: "cytrynowy" },
    { label: "Musztardowy", value: "musztardowy" },
    { label: "Złotawy / piaskowy złoty", value: "złotawy piaskowy" },
    { label: "Pomarańczowy", value: "pomarańczowy" },
    { label: "Morelowy", value: "morelowy" },
    { label: "Brzoskwiniowy", value: "brzoskwiniowy" },
    { label: "Łososiowy", value: "łososiowy" },

    { label: "Czerwienie", heading: true },
    { label: "Czerwony", value: "czerwony" },
    { label: "Wiśniowy", value: "wiśniowy" },
    { label: "Karmazynowy / rubinowy", value: "karmazynowy" },
    { label: "Bordowy", value: "bordowy" },
    { label: "Malinowy", value: "malinowy" },
    { label: "Truskawkowy", value: "truskawkowy" },

    { label: "Róże i magenty", heading: true },
    { label: "Różowy", value: "różowy" },
    { label: "Jasny róż / baby pink", value: "jasny róż" },
    { label: "Pastelowy róż", value: "pastelowy róż" },
    { label: "Pudrowy róż", value: "pudrowy róż" },
    { label: "Ciemny róż / róż śliwkowy", value: "ciemny róż" },
    { label: "Fuksja / neonowy róż", value: "fuksja" },
    { label: "Magenta", value: "magenta" },
    { label: "Amarant", value: "amarant" },
    { label: "Koralowy", value: "koralowy" },
    { label: "Wrzosowy / lila", value: "wrzosowy" },

    { label: "Fiolety i śliwka", heading: true },
    { label: "Fioletowy", value: "fioletowy" },
    { label: "Śliwkowy / bakłażan", value: "śliwkowy" },
    { label: "Lawendowy / liliowy", value: "lawendowy" },
    { label: "Orchidea", value: "orchidea" },
    { label: "Indygo (granat-fiolet)", value: "indygo" },

    { label: "Metale i efekty", heading: true },
    { label: "Złoty", value: "złoty" },
    { label: "Srebrny", value: "srebrny" },
    { label: "Chrom / nikiel", value: "chromowany" },
    { label: "Miedziany / rose gold", value: "miedziany / rose gold" },
    { label: "Perłowy / opalizujący", value: "perłowy" },
    { label: "Holograficzny / opal", value: "holograficzny" },

    { label: "Inne", heading: true },
    { label: "Multikolor / print", value: "multikolor" },
    { label: "Kamuflaż / moro", value: "kamuflaż" },
    { label: "Transparentny / bezbarwny", value: "transparentny" },
  ],
  gram: [
    { label: "Gramatura tkaniny (g/m²)", heading: true },
    { label: "80–100 g/m² (bardzo lekka)", value: "80–100 g/m²" },
    { label: "120 g/m²", value: "120 g/m²" },
    { label: "160 g/m²", value: "160 g/m²" },
    { label: "180 g/m²", value: "180 g/m²" },
    { label: "200 g/m²", value: "200 g/m²" },
    { label: "240 g/m²", value: "240 g/m²" },
    { label: "280 g/m²", value: "280 g/m²" },
    { label: "320 g/m²", value: "320 g/m²" },
    { label: "Lekka (ok. 120–160 g/m²)", value: "lekka tkanina (ok. 120–160 g/m²)" },
    { label: "Średnia (ok. 180–220 g/m²)", value: "średnia gramatura (ok. 180–220 g/m²)" },
    { label: "Ciężka (pow. 250 g/m²)", value: "ciężka gramatura (pow. 250 g/m²)" },

    { label: "Płyny i kosmetyki (ml)", heading: true },
    { label: "5 ml", value: "5 ml" },
    { label: "10 ml", value: "10 ml" },
    { label: "15 ml", value: "15 ml" },
    { label: "30 ml", value: "30 ml" },
    { label: "50 ml", value: "50 ml" },
    { label: "75 ml", value: "75 ml" },
    { label: "100 ml", value: "100 ml" },
    { label: "125 ml", value: "125 ml" },
    { label: "150 ml", value: "150 ml" },
    { label: "200 ml", value: "200 ml" },
    { label: "250 ml", value: "250 ml" },
    { label: "300 ml", value: "300 ml" },
    { label: "400 ml", value: "400 ml" },
    { label: "500 ml", value: "500 ml" },
    { label: "750 ml", value: "750 ml" },
    { label: "1000 ml (1 l)", value: "1000 ml" },
    { label: "1500 ml", value: "1500 ml" },
    { label: "2000 ml (2 l)", value: "2000 ml" },
    { label: "3000 ml (3 l)", value: "3000 ml" },
    { label: "5000 ml (5 l)", value: "5000 ml" },

    { label: "Pojemność — duże opakowania (l)", heading: true },
    { label: "1 l", value: "1 l" },
    { label: "1,5 l", value: "1,5 l" },
    { label: "2 l", value: "2 l" },
    { label: "3 l", value: "3 l" },
    { label: "5 l", value: "5 l" },
    { label: "10 l", value: "10 l" },

    { label: "Masa netto — żywność i suchy produkt (g)", heading: true },
    { label: "5 g", value: "5 g netto" },
    { label: "10 g", value: "10 g netto" },
    { label: "15 g", value: "15 g netto" },
    { label: "25 g", value: "25 g netto" },
    { label: "50 g", value: "50 g netto" },
    { label: "75 g", value: "75 g netto" },
    { label: "100 g", value: "100 g netto" },
    { label: "150 g", value: "150 g netto" },
    { label: "200 g", value: "200 g netto" },
    { label: "250 g", value: "250 g netto" },
    { label: "500 g", value: "500 g netto" },
    { label: "750 g", value: "750 g netto" },
    { label: "1 kg", value: "1 kg netto" },
    { label: "1,5 kg", value: "1,5 kg netto" },
    { label: "2 kg", value: "2 kg netto" },
    { label: "5 kg", value: "5 kg netto" },

    { label: "Inne (dopisz z etykiety)", heading: true },
    { label: "Zawartość wg etykiety (mg / mcg)", value: "zawartość substancji wg etykiety (dopisz)" },
  ],
  prod: [
    { label: "Polska i region", heading: true },
    { label: "Polska", value: "Polska" },
    { label: "Polska — konkretne województwo (dopisz)", value: "produkcja w Polsce (dopisz region)" },
    { label: "Unia Europejska (ogólnie)", value: "UE" },
    { label: "Europa Środkowa (CZ / SK / HU)", value: "produkcja w Europie Środkowej (dopisz kraj)" },
    { label: "Kraje bałtyckie", value: "produkcja w krajach bałtyckich (dopisz)" },
    { label: "Skandynawia", value: "produkcja w Skandynawii (dopisz kraj)" },
    { label: "Wielka Brytania", value: "produkcja w Wielkiej Brytanii" },
    { label: "Szwajcaria / Norwegia", value: "produkcja w Szwajcarii lub Norwegii" },
    { label: "Austria", value: "produkcja w Austrii" },
    { label: "Niemcy", value: "produkcja w Niemczech" },
    { label: "Francja", value: "produkcja we Francji" },
    { label: "Benelux", value: "produkcja w Beneluksie (dopisz kraj)" },
    { label: "Włochy", value: "produkcja we Włoszech" },
    { label: "Hiszpania / Portugalia", value: "produkcja w Hiszpanii lub Portugalii" },
    { label: "Grecja / Cypr", value: "produkcja w Grecji lub na Cyprze (dopisz)" },
    { label: "Rumunia / Bułgaria", value: "produkcja w Rumunii lub Bułgarii" },
    { label: "Ukraina", value: "produkcja na Ukrainie" },
    { label: "Poza UE (import)", value: "import spoza UE" },

    { label: "Poza Europą", heading: true },
    { label: "USA", value: "produkcja w USA" },
    { label: "Kanada", value: "produkcja w Kanadzie" },
    { label: "Meksyk", value: "produkcja w Meksyku" },
    { label: "Brazylia", value: "produkcja w Brazylii" },
    { label: "Chiny", value: "produkcja w Chinach" },
    { label: "Tajwan", value: "produkcja na Tajwanie" },
    { label: "Japonia", value: "produkcja w Japonii" },
    { label: "Korea Południowa", value: "produkcja w Korei Południowej" },
    { label: "Indie", value: "produkcja w Indiach" },
    { label: "Bangladesz", value: "produkcja w Bangladeszu" },
    { label: "Indonezja", value: "produkcja w Indonezji" },
    { label: "Tajlandia / Malezja", value: "produkcja w Azji Południowo-Wschodniej (dopisz kraj)" },
    { label: "Wietnam", value: "produkcja w Wietnamie" },
    { label: "Turcja", value: "produkcja w Turcji" },
    { label: "Izrael", value: "produkcja w Izraelu" },
    { label: "ZEA / Bliski Wschód", value: "produkcja w ZEA lub regionie (dopisz)" },
    { label: "Australia / Nowa Zelandia", value: "produkcja w Australii lub Nowej Zelandii" },
    { label: "Afryka (dopisz kraj)", value: "produkcja w Afryce (dopisz kraj)" },

    { label: "Etap produkcji / łańcuch", heading: true },
    { label: "Montaż końcowy w UE", value: "montaż końcowy w UE" },
    { label: "Montaż końcowy w Polsce", value: "montaż końcowy w Polsce" },
    { label: "Pakowanie / konfekcja w PL", value: "pakowanie lub konfekcja w Polsce" },
    { label: "Surowiec z UE", value: "surowiec z UE (wg opisu)" },
    { label: "Surowiec importowany", value: "surowiec importowany (dopisz)" },
    { label: "Produkcja rozproszona (kilka krajów)", value: "etapy produkcji w kilku krajach (wg opisu)" },

    { label: "Model biznesowy", heading: true },
    { label: "Własna marka PL", value: "marka polska" },
    { label: "Private label / marka sieci", value: "private label lub marka własna sieci" },
    { label: "Import i dystrybucja", value: "import i dystrybucja" },
    { label: "Wyłączny dystrybutor w PL", value: "wyłączny dystrybutor w Polsce" },
    { label: "Producent OEM", value: "producent OEM — dopisz" },
    { label: "ODM (projekt + produkcja)", value: "ODM — dopisz" },
    { label: "Produkcja kontraktowa", value: "produkcja kontraktowa" },
    { label: "Fabryka partnerska", value: "współpraca z fabryką partnerską (wg opisu)" },
    { label: "Manufaktura / mała seria", value: "produkcja małoseryjna / manufaktura" },
  ],
  use: [
    { label: "Codzienne i styl", heading: true },
    { label: "Na co dzień", value: "na co dzień" },
    { label: "Casual / luzacki", value: "styl casual" },
    { label: "Streetwear", value: "streetwear" },
    { label: "Smart casual", value: "smart casual" },
    { label: "Minimalistyczny", value: "styl minimalistyczny" },
    { label: "Boho", value: "styl boho" },
    { label: "Vintage / retro", value: "styl vintage, retro" },
    { label: "Elegancki / formalny", value: "na okazje formalne" },
    { label: "Wieczór / wyjście", value: "na wieczór, wyjście" },
    { label: "Weekend", value: "na weekend" },

    { label: "Praca i nauka", heading: true },
    { label: "Do biura", value: "do biura" },
    { label: "Home office", value: "do pracy z domu" },
    { label: "Praca hybrydowa", value: "praca hybrydowa" },
    { label: "Spotkania / konferencje", value: "na spotkania i konferencje" },
    { label: "Praca stojąca", value: "na pracę stojącą" },
    { label: "Do szkoły", value: "do szkoły" },
    { label: "Na studia", value: "na studia" },
    { label: "Przedszkole / żłobek", value: "do przedszkola, żłobka" },
    { label: "Laboratorium / warsztat szkolny", value: "do laboratorium, warsztatu (dopisz)" },

    { label: "Sport i ruch", heading: true },
    { label: "Sport — ogólnie", value: "sport" },
    { label: "Fitness / siłownia", value: "fitness, siłownia" },
    { label: "Crossfit", value: "crossfit" },
    { label: "Bieganie", value: "bieganie" },
    { label: "Nordic walking", value: "nordic walking" },
    { label: "Joga / pilates", value: "joga, pilates" },
    { label: "Stretching / mobilność", value: "stretching, mobilność" },
    { label: "Rower / MTB", value: "jazda na rowerze, MTB" },
    { label: "Hulajnoga / rolki", value: "hulajnoga, rolki" },
    { label: "Pływanie / basen", value: "pływanie, basen" },
    { label: "Sporty wodne", value: "sporty wodne" },
    { label: "Żeglarstwo", value: "żeglarstwo" },
    { label: "Tenis / badminton", value: "tenis, badminton" },
    { label: "Siatkówka / koszykówka", value: "siatkówka, koszykówka" },
    { label: "Piłka nożna", value: "piłka nożna" },
    { label: "Golf", value: "golf" },
    { label: "Gry zespołowe", value: "sporty drużynowe" },
    { label: "Trening cardio", value: "trening cardio" },
    { label: "Trening siłowy", value: "trening siłowy" },
    { label: "Wspinaczka", value: "wspinaczka" },
    { label: "Łyżwy / hokej", value: "łyżwy, hokej" },
    { label: "Taniec", value: "taniec" },
    { label: "Martial arts", value: "sztuki walki" },
    { label: "Wędkarstwo", value: "wędkarstwo" },
    { label: "Strzelectwo sportowe", value: "strzelectwo sportowe (wg przepisów)" },

    { label: "Outdoor i pogoda", heading: true },
    { label: "Outdoor / trekking", value: "outdoor, trekking" },
    { label: "Góry / hiking", value: "wędrówki górskie" },
    { label: "Kemping", value: "kemping" },
    { label: "Grzybobranie / las", value: "do lasu, na grzyby" },
    { label: "Narciarstwo / snowboard", value: "narciarstwo, snowboard" },
    { label: "Zima / mróz", value: "na zimę, mróz" },
    { label: "Deszcz / mokra pogoda", value: "na deszcz, mokre warunki" },
    { label: "Wiatr", value: "na wiatr" },
    { label: "Wysokie temperatury / słońce", value: "na upał, słońce" },

    { label: "Dom i mieszkanie", heading: true },
    { label: "Do domu", value: "do domu" },
    { label: "Relaks", value: "do relaksu" },
    { label: "Kuchnia", value: "do kuchni" },
    { label: "Łazienka", value: "do łazienki" },
    { label: "Sypialnia", value: "do sypialni" },
    { label: "Salon", value: "do salonu" },
    { label: "Przedpokój", value: "do przedpokoju" },
    { label: "Gabinet / biuro domowe", value: "do gabinetu, biura domowego" },
    { label: "Pralnia", value: "do pralni" },
    { label: "Warsztat / garaż", value: "do warsztatu, garażu" },
    { label: "Piwnica / schowek", value: "do piwnicy, schowka" },
    { label: "Balkon", value: "na balkon" },
    { label: "Ogród / taras", value: "do ogrodu, na taras" },
    { label: "Sprzątanie", value: "do sprzątania" },

    { label: "Podróże i transport", heading: true },
    { label: "Podróż / wakacje", value: "podróż, wakacje" },
    { label: "City break", value: "city break" },
    { label: "Samolot (podręczny bagaż)", value: "do samolotu, bagaż podręczny" },
    { label: "Samochód / commuting", value: "do samochodu, dojazdy" },
    { label: "Motocykl / skuter", value: "na motocykl, skuter" },
    { label: "Rower miejski", value: "rower miejski, dojazdy" },
    { label: "Pociąg / autobus", value: "w podróży koleją, autobusem" },
    { label: "Żaglówka / motorówka", value: "żegluga, motorówka (wg opisu)" },
    { label: "Hotel / nocleg", value: "hotel, nocleg" },

    { label: "Okazje i prezenty", heading: true },
    { label: "Prezent", value: "prezent" },
    { label: "Święta / okazja", value: "święta, okazja" },
    { label: "Boże Narodzenie", value: "na Boże Narodzenie" },
    { label: "Wielkanoc", value: "na Wielkanoc" },
    { label: "Walentynki", value: "na Walentynki" },
    { label: "Dzień Matki / Ojca", value: "na Dzień Matki, Dzień Ojca" },
    { label: "Dzień Dziecka", value: "na Dzień Dziecka" },
    { label: "Halloween", value: "na Halloween" },
    { label: "Sylwester", value: "na Sylwestra" },
    { label: "Ślub / wesele", value: "ślub, wesele" },
    { label: "Urodziny / impreza", value: "urodziny, impreza" },
    { label: "Komunia / chrzest", value: "komunia, chrzest" },
    { label: "Rocznica", value: "rocznica" },
    { label: "Parapetówka / pożegnanie", value: "parapetówka, pożegnanie" },

    { label: "Dla kogo", heading: true },
    { label: "Dla całej rodziny", value: "dla całej rodziny" },
    { label: "Unisex", value: "unisex" },
    { label: "Dla dziecka", value: "dla dziecka" },
    { label: "Dla niemowlęcia", value: "dla niemowlęcia" },
    { label: "Dla nastolatka", value: "dla nastolatka" },
    { label: "Dla seniora", value: "dla seniora" },
    { label: "Dla psa", value: "dla psa" },
    { label: "Dla kota", value: "dla kota" },
    { label: "Dla ptaków / gryzoni", value: "dla ptaków, gryzoni (dopisz)" },

    { label: "Pielęgnacja i wrażliwość", heading: true },
    { label: "Dla alergika", value: "przy skłonie alergicznym (wg opisu)" },
    { label: "Dla wrażliwej skóry", value: "dla wrażliwej skóry (wg producenta)" },
    { label: "Skóra atopowa (wg opisu)", value: "skóra atopowa (wg opisu producenta)" },
    { label: "Noc i dzień", value: "na dzień i noc" },
    { label: "Tylko na noc", value: "na noc" },
    { label: "Tylko na dzień", value: "na dzień" },

    { label: "Hobby i rozrywka", heading: true },
    { label: "Gaming / e-sport", value: "gaming, e-sport" },
    { label: "Muzyka / instrumenty", value: "muzyka, instrumenty (dopisz)" },
    { label: "Czytanie / nauka", value: "czytanie, nauka" },
    { label: "Majsterkowanie / DIY", value: "majsterkowanie, DIY" },
    { label: "Modelarstwo", value: "modelarstwo" },
    { label: "Kolekcjonerstwo", value: "kolekcjonerstwo" },
    { label: "Plener / piknik", value: "plener, piknik" },

    { label: "Eko i oszczędność", heading: true },
    { label: "Mniej odpadów / zero waste", value: "mniej odpadów, zero waste (wg opisu)" },
    { label: "Kompostowanie / ogród eko", value: "do kompostu, ogrodu eko" },
    { label: "Oszczędzanie energii / wody", value: "oszczędzanie energii lub wody (wg opisu)" },

    { label: "Bezpieczeństwo i BHP", heading: true },
    { label: "Na budowę / plac budowy", value: "na plac budowy (wg norm BHP)" },
    { label: "Ochrona słuchu / wzroku", value: "ochrona słuchu lub wzroku (wg opisu)" },
    { label: "Ostrzeżenia — przeczytaj opis", value: "stosuj zgodnie z instrukcją i opisem" },

    { label: "Profesja i specjalistyczne", heading: true },
    { label: "Do salonu / SPA", value: "do salonu kosmetycznego, SPA" },
    { label: "Fryzjer / barber", value: "do salonu fryzjerskiego" },
    { label: "Gastronomia / HoReCa", value: "do gastronomii, HoReCa" },
    { label: "Hotel / recepcja", value: "do hotelu, recepcji" },
    { label: "Medyczne / rehabilitacja", value: "zastosowanie w rehabilitacji (wg opisu)" },
    { label: "Foto / wideo / studio", value: "foto, wideo, studio" },
    { label: "Streaming / podcast", value: "streaming, podcast" },
    { label: "Warsztat profesjonalny", value: "zastosowanie profesjonalne, warsztat" },
    { label: "Rolnictwo / szklarnia", value: "rolnictwo, szklarnia (wg opisu)" },
    { label: "Warsztat samochodowy", value: "warsztat samochodowy" },
  ],
  care: [
    { label: "Pranie — temperatura", heading: true },
    { label: "Tylko zimna woda", value: "pranie w zimnej wodzie" },
    { label: "Pranie 20°C (delikatne)", value: "pranie 20°C, program delikatny" },
    { label: "Pranie 30°C", value: "pranie 30°C" },
    { label: "Pranie 40°C", value: "pranie 40°C" },
    { label: "Pranie 60°C", value: "pranie 60°C" },
    { label: "Pranie 90°C (biel, bawełna)", value: "pranie do 90°C — tylko jeśli dozwolone na metce" },
    { label: "Pranie ręczne", value: "pranie ręczne" },
    { label: "Program delikatny / wełna", value: "program delikatny lub wełna (wg metki)" },
    { label: "Program sport / outdoor", value: "program sport / syntetyki (wg metki)" },
    { label: "Wirowanie: niskie obroty", value: "wirowanie na niskich obrotach" },
    { label: "Nie wirować", value: "nie wirować" },

    { label: "Wybielanie i plamy", heading: true },
    { label: "Nie wybielać", value: "nie wybielać" },
    { label: "Tylko biel tlenowa", value: "wybielanie tlenowe — jeśli dozwolone na metce" },
    { label: "Nie chlorować", value: "nie używać chloru" },
    { label: "Nie czyścić plam agresywnymi środkami", value: "unikać silnych środków plamowiczych (wg metki)" },

    { label: "Suszenie", heading: true },
    { label: "Suszenie w suszarce (niska temp.)", value: "suszenie w suszarce — niska temperatura" },
    { label: "Nie suszyć mechanicznie", value: "nie suszyć w suszarce bębnowej" },
    { label: "Suszenie w poziomie", value: "suszenie w poziomie (na płasko)" },
    { label: "Suszenie na wieszaku", value: "suszenie na wieszaku w cieniu" },
    { label: "Nie suszyć na kaloryferze", value: "nie suszyć na kaloryferze" },
    { label: "Nie suszyć w pełnym słońcu", value: "nie suszyć w bezpośrednim słońcu" },

    { label: "Prasowanie", heading: true },
    { label: "Prasowanie niskiej temp.", value: "prasowanie niskiej temperatury" },
    { label: "Prasowanie średniej temp.", value: "prasowanie średniej temperatury" },
    { label: "Nie prasować", value: "nie prasować" },
    { label: "Parowanie / steamer", value: "parowanie lub steamer — wg metki" },

    { label: "Czyszczenie chemiczne", heading: true },
    { label: "Czyszczenie chemiczne (P)", value: "czyszczenie chemiczne — symbol P (wg metki)" },
    { label: "Czyszczenie chemiczne delikatne (F)", value: "czyszczenie chemiczne delikatne — symbol F (wg metki)" },
    { label: "Nie czyścić chemicznie", value: "nie czyścić chemicznie" },
    { label: "Tylko czyszczenie na sucho", value: "tylko czyszczenie na sucho (wg metki)" },

    { label: "Sortowanie i dodatki", heading: true },
    { label: "Prać oddzielnie / pierwsze pranie", value: "pierwsze pranie oddzielnie od innych kolorów" },
    { label: "Prać z podobnymi kolorami", value: "prać z podobnymi kolorami" },
    { label: "Wywrócić na lewą stronę", value: "prać na lewej stronie" },
    { label: "Bez płynów zmiękczających", value: "bez płynów zmiękczających (jeśli zalecane)" },
    { label: "Workiem na pranie", value: "prać w worku na delikatne" },

    { label: "Materiały specjalne", heading: true },
    { label: "Wełna / kaszmir — delikatnie", value: "wełna / kaszmir — program wełna lub ręcznie" },
    { label: "Skóra / zamsz — nie moczyć", value: "skóra / zamsz — nie moczyć, środki dedykowane" },
    { label: "Jedwab / len — delikatnie", value: "jedwab / len — program delikatny (wg metki)" },
    { label: "Impregnacja po praniu", value: "po praniu zalecana impregnacja (wg instrukcji)" },

    { label: "Obuwie i akcesoria", heading: true },
    { label: "Nie prać w pralce", value: "nie prać w pralce automatycznej" },
    { label: "Czyścić wilgotną ścierką", value: "czyścić miękką, wilgotną ścierką" },
    { label: "Wkładki / sznurowadła — osobno", value: "wyjmować wkładki / sznurowadła przed praniem (jeśli dotyczy)" },

    { label: "Zmywarka i kuchnia", heading: true },
    { label: "Można myć w zmywarce", value: "zmywarka — jeśli dozwolone na opakowaniu" },
    { label: "Tylko górna półka zmywarki", value: "tylko górna półka zmywarki (jeśli dotyczy)" },
    { label: "Nie do zmywarki", value: "nie myć w zmywarce" },

    { label: "Elektronika i powierzchnie", heading: true },
    { label: "Sucha lub lekko wilgotna ścierka", value: "czyścić suchą lub lekko wilgotną ścierką" },
    { label: "Nie zanurzać", value: "nie zanurzać w wodzie" },
    { label: "Unikać rozpuszczalników", value: "unikać rozpuszczalników i benzyny" },

    { label: "Przechowywanie", heading: true },
    { label: "Przechowywać w suchym miejscu", value: "przechowywać w suchym miejscu" },
    { label: "Chronić przed słońcem (materiał)", value: "chronić przed długotrwałym słońcem" },
    { label: "Przechowywać w oryginalnym opakowaniu", value: "przechowywać w oryginalnym opakowaniu (jeśli dotyczy)" },
  ],
  warranty: [
    { label: "Okres gwarancji", heading: true },
    { label: "6 miesięcy", value: "6 miesięcy" },
    { label: "12 miesięcy", value: "12 miesięcy" },
    { label: "24 miesiące", value: "24 miesiące" },
    { label: "36 miesięcy", value: "36 miesięcy" },
    { label: "48 miesięcy / 4 lata", value: "48 miesięcy" },
    { label: "60 miesięcy / 5 lat", value: "60 miesięcy / 5 lat" },
    { label: "Gwarancja dożywotnia (wg opisu)", value: "gwarancja dożywotnia — wg opisu producenta" },

    { label: "Zwroty i odstąpienie", heading: true },
    { label: "Zwrot 14 dni", value: "zwrot 14 dni" },
    { label: "Zwrot 30 dni", value: "zwrot 30 dni" },
    { label: "Zwrot 60 dni", value: "zwrot 60 dni" },
    { label: "Reklamacja 2 lata (ustawa)", value: "reklamacja zgodnie z prawem (2 lata)" },

    { label: "Serwis i pomoc", heading: true },
    { label: "Gwarancja producenta", value: "gwarancja producenta" },
    { label: "Przedłużona gwarancja producenta", value: "przedłużona gwarancja — dopisz warunki" },
    { label: "Autoryzowany serwis w PL", value: "autoryzowany serwis w Polsce" },
    { label: "Wsparcie posprzedażowe", value: "wsparcie techniczne po zakupie" },
    { label: "Wymiana na nowy (wg regulaminu)", value: "wymiana na nowy — wg regulaminu" },
    { label: "Wydłużona gwarancja (sklep)", value: "dodatkowa ochrona w sklepie — dopisz" },
  ],
  state: [
    { label: "Nowy", value: "nowy" },
    { label: "Nowy, zapieczętowany", value: "nowy, fabrycznie zapieczętowany" },
    { label: "Nowy, folia", value: "nowy w folii" },
    { label: "Powystawowy / demo", value: "powystawowy / demo (bez śladów użytkowania)" },
    { label: "Jak nowy", value: "jak nowy" },
    { label: "Bardzo dobry", value: "stan bardzo dobry" },
    { label: "Dobry", value: "stan dobry" },
    { label: "Używany", value: "używany" },
    { label: "Uszkodzone opakowanie (produkt OK)", value: "uszkodzone opakowanie — produkt sprawny" },
    { label: "Ślady montażu / ostrzejsze zużycie", value: "widoczne ślady użytkowania (dopisz)" },
    { label: "Częściowy komplet (dopisz czego brak)", value: "niepełny zestaw — brakuje (dopisz)" },
  ],
  unique: [
    { label: "Edycje i kolekcje", heading: true },
    { label: "Limitowana edycja", value: "limitowana edycja" },
    { label: "Numerowana seria", value: "numerowana seria — dopisz numer" },
    { label: "Kolekcja sezonowa", value: "kolekcja sezonowa" },
    { label: "Kolaboracja / limitowany drop", value: "kolaboracja lub limitowany drop — dopisz" },
    { label: "Wzór / print — unikalny", value: "unikalny wzór lub print (wg opisu)" },

    { label: "Jakość i wykonanie", heading: true },
    { label: "Produkt premium", value: "produkt premium" },
    { label: "Ręcznie szyte", value: "ręcznie szyte" },
    { label: "Ręcznie robione", value: "ręcznie wykonane" },
    { label: "Produkcja rzemieślnicza", value: "produkcja rzemieślnicza" },
    { label: "Produkcja w UE / Polsce", value: "produkcja w UE lub Polsce (wg opisu)" },
    { label: "Design / projekt w UE", value: "zaprojektowane w UE (wg opisu)" },
    { label: "Materiały wyższej klasy", value: "materiały wyższej klasy (wg opisu)" },

    { label: "Zestaw i kompletacja", heading: true },
    { label: "Kompletny zestaw", value: "kompletny zestaw" },
    { label: "Zestaw startowy", value: "zestaw startowy" },
    { label: "Rozszerzenie do systemu", value: "pasuje do szerszego systemu — dopisz" },
    { label: "Wszystko w jednym pudełku", value: "pełny zestaw w jednym opakowaniu" },

    { label: "Personalizacja", heading: true },
    { label: "Personalizacja (ogólnie)", value: "personalizacja" },
    { label: "Grawer / laser", value: "możliwość graweru — dopisz" },
    { label: "Haft / nadruk", value: "haft lub nadruk na zamówienie — dopisz" },
    { label: "Konfigurator / warianty", value: "wybór wariantów w konfiguratorze — dopisz" },

    { label: "Popularność i nowość", heading: true },
    { label: "Bestseller", value: "bestseller" },
    { label: "Hit w kategorii", value: "często wybierany w kategorii (wg opisu)" },
    { label: "Nowość w ofercie", value: "nowość w ofercie" },
    { label: "Premiera / nowy sezon", value: "nowość sezonu lub premiera (wg opisu)" },
    { label: "Polecane przez klientów", value: "wysokie oceny klientów (wg opisu)" },

    { label: "Nagrody i media", heading: true },
    { label: "Nagroda / wyróżnienie", value: "nagrodzony lub wyróżniony produkt (wg opisu)" },
    { label: "Test / ranking (dopisz)", value: "wyróżnienie w teście lub rankingu — dopisz" },
    { label: "Rekomendacja eksperta", value: "rekomendacja eksperta (wg opisu)" },

    { label: "Opakowanie i realizacja", heading: true },
    { label: "Oryginalne opakowanie", value: "oryginalne opakowanie producenta" },
    { label: "Eko / mniej plastiku", value: "mniej plastiku w opakowaniu" },
    { label: "Opakowanie prezentowe", value: "opakowanie prezentowe lub możliwość dopakowania" },
    { label: "Szybka realizacja", value: "szybka realizacja zamówienia" },
    { label: "Wysyłka 24 h (jeśli dotyczy)", value: "wysyłka w 24 h — jeśli gwarantowane w ofercie" },

    { label: "Odpowiedzialność i certyfikaty", heading: true },
    { label: "OEKO-TEX / bezpieczne dla skóry", value: "certyfikat lub deklaracja bezpieczeństwa (wg opisu)" },
    { label: "Fair Trade / sprawiedliwy handel", value: "Fair Trade lub podobna inicjatywa (wg opisu)" },
    { label: "Składniki / materiały certyfikowane", value: "certyfikowany materiał lub składnik (wg opisu)" },
    { label: "Wegańskie / cruelty-free", value: "wegańskie lub cruelty-free — tylko jeśli w opisie" },
  ],
  compat: [
    { label: "Ogólne", heading: true },
    { label: "Uniwersalny", value: "uniwersalny" },
    { label: "Dedykowany — dopisz model", value: "dedykowany do: (dopisz model / serię)" },
    { label: "Pasuje do listy (dopisz)", value: "pasuje do: (wypisz modele)" },
    { label: "OEM / zamiennik", value: "typ: OEM lub zamiennik — dopisz oznaczenie" },
    { label: "Wersja regionalna EU", value: "wersja na rynek UE (wtyczka / normy)" },
    { label: "Wsteczna kompatybilność", value: "wsteczna kompatybilność — dopisz z czym" },
    { label: "Plug & play", value: "plug and play — bez sterowników (jeśli dotyczy)" },

    { label: "Smartfony i tablety", heading: true },
    { label: "iPhone — dopisz model / złącze", value: "zgodność: iPhone — dopisz model i złącze" },
    { label: "iPad", value: "zgodność: iPad — dopisz model" },
    { label: "Samsung Galaxy", value: "zgodność: Samsung Galaxy — dopisz model" },
    { label: "Google Pixel", value: "zgodność: Google Pixel — dopisz model" },
    { label: "Xiaomi / Redmi", value: "zgodność: Xiaomi / Redmi — dopisz model" },
    { label: "Huawei / Honor", value: "zgodność: Huawei / Honor — dopisz model" },
    { label: "OnePlus / OPPO / realme", value: "zgodność: OnePlus / OPPO / realme — dopisz model" },
    { label: "Android (ogólnie)", value: "zgodność: Android — dopisz model" },
    { label: "USB‑C (telefon / tablet)", value: "złącze USB-C — dopisz urządzenie" },
    { label: "Micro USB", value: "złącze micro USB" },
    { label: "Lightning", value: "złącze Lightning" },
    { label: "MagSafe", value: "MagSafe — dopisz model iPhone" },
    { label: "Ładowanie indukcyjne Qi / Qi2", value: "ładowanie indukcyjne Qi lub Qi2" },
    { label: "Sony Xperia", value: "zgodność: Sony Xperia — dopisz model" },
    { label: "Motorola / Lenovo", value: "zgodność: Motorola / Lenovo — dopisz model" },
    { label: "Nokia / HMD", value: "zgodność: Nokia — dopisz model" },
    { label: "Fairphone", value: "Fairphone — dopisz model" },
    { label: "Nothing Phone", value: "Nothing Phone — dopisz model" },
    { label: "Samsung Galaxy Tab", value: "Samsung Galaxy Tab — dopisz model" },
    { label: "Microsoft Surface", value: "Microsoft Surface — dopisz model" },

    { label: "Komputery i monitory", heading: true },
    { label: "Windows", value: "system: Windows (dopisz wersję jeśli istotna)" },
    { label: "macOS", value: "system: macOS (dopisz wersję jeśli istotna)" },
    { label: "Linux", value: "system: Linux (dopisz dystrybucję jeśli istotna)" },
    { label: "Chromebook", value: "Chromebook — dopisz model" },
    { label: "USB‑A", value: "złącze USB-A" },
    { label: "USB‑C (komputer)", value: "złącze USB-C" },
    { label: "Thunderbolt 3 / 4", value: "Thunderbolt 3 lub 4 — dopisz" },
    { label: "HDMI", value: "HDMI — dopisz wersję (np. 2.0, 2.1)" },
    { label: "DisplayPort", value: "DisplayPort — dopisz wersję" },
    { label: "VGA / DVI (starsze)", value: "VGA lub DVI — dopisz" },
    { label: "Ethernet RJ45", value: "Ethernet RJ45" },
    { label: "Ethernet 2,5 G / 10 G", value: "Ethernet 2,5 G lub 10 G — dopisz" },
    { label: "Karta SD / microSD", value: "karta pamięci SD lub microSD — dopisz klasę" },
    { label: "Dysk M.2 NVMe / SATA", value: "dysk M.2 — dopisz NVMe lub SATA i długość" },
    { label: "SATA 2,5\" / 3,5\"", value: "dysk SATA — dopisz format" },
    { label: "PCIe (karta rozszerzeń)", value: "slot PCIe — dopisz generację i długość" },
    { label: "Mini DisplayPort", value: "Mini DisplayPort" },
    { label: "KVM / przełącznik", value: "KVM lub przełącznik — dopisz porty" },

    { label: "Konsole i gaming", heading: true },
    { label: "PlayStation 5", value: "PlayStation 5" },
    { label: "PlayStation 4", value: "PlayStation 4" },
    { label: "Xbox Series X|S", value: "Xbox Series X lub S" },
    { label: "Xbox One", value: "Xbox One" },
    { label: "Nintendo Switch", value: "Nintendo Switch" },
    { label: "Nintendo Switch 2", value: "Nintendo Switch 2" },
    { label: "Steam Deck / handheld PC", value: "Steam Deck / handheld — dopisz model" },
    { label: "ASUS ROG Ally / Legion Go", value: "ASUS ROG Ally / Lenovo Legion Go — dopisz model" },
    { label: "Kontroler bezprzewodowy — dopisz konsolę", value: "kontroler — dopisz konsolę lub standard" },

    { label: "TV, audio, streaming", heading: true },
    { label: "Android TV / Google TV", value: "Android TV / Google TV — dopisz model TV" },
    { label: "tvOS / Apple TV", value: "Apple TV / tvOS — dopisz generację" },
    { label: "Samsung Tizen / LG webOS", value: "Smart TV — dopisz producenta i model" },
    { label: "HDMI ARC / eARC", value: "HDMI ARC lub eARC" },
    { label: "Bluetooth audio", value: "Bluetooth audio — dopisz profil (np. A2DP)" },
    { label: "Chromecast / AirPlay", value: "Chromecast lub AirPlay — dopisz" },
    { label: "Soundbar — dopisz markę / model TV", value: "soundbar — dopisz kompatybilność z TV" },
    { label: "Soundbar Sonos / Bose / JBL", value: "system audio — dopisz model" },

    { label: "Audio i mikrofon", heading: true },
    { label: "Mini Jack 3,5 mm", value: "złącze mini jack 3,5 mm" },
    { label: "Jack 6,35 mm", value: "złącze jack 6,35 mm" },
    { label: "XLR", value: "złącze XLR" },
    { label: "RCA (CINCH)", value: "RCA" },
    { label: "Optyczne Toslink", value: "złącze optyczne Toslink" },
    { label: "Bluetooth audio (kodek)", value: "Bluetooth — dopisz kodek (np. aptX, LDAC, AAC)" },
    { label: "MIDI USB", value: "MIDI przez USB — dopisz" },

    { label: "Sieć i smart home", heading: true },
    { label: "Wi‑Fi 5 / 6 / 6E / 7", value: "Wi-Fi — dopisz standard (np. 6)" },
    { label: "Bluetooth 5.x", value: "Bluetooth 5.x — dopisz" },
    { label: "Zigbee", value: "Zigbee" },
    { label: "Thread / Matter", value: "Thread / Matter — dopisz hub" },
    { label: "Alexa / Echo", value: "Amazon Alexa — dopisz urządzenie" },
    { label: "Google Home / Nest", value: "Google Home / Nest — dopisz" },
    { label: "HomeKit", value: "Apple HomeKit — dopisz" },
    { label: "NFC", value: "NFC" },
    { label: "PoE / PoE+", value: "Power over Ethernet (PoE) — dopisz klasę" },
    { label: "Router / mesh — dopisz system", value: "router lub mesh — dopisz producenta" },
    { label: "NAS — dopisz producenta", value: "NAS — dopisz model i wersję DSM/QTS itd." },

    { label: "Samochód i motocykl", heading: true },
    { label: "Zasilanie 12 V", value: "zasilanie 12 V (gniazdo zapalniczki / instalacja)" },
    { label: "Zasilanie 24 V", value: "zasilanie 24 V" },
    { label: "USB w aucie (CarPlay / Android Auto)", value: "USB w pojeździe — CarPlay / Android Auto (dopisz)" },
    { label: "CarPlay (bezprzewodowy / kablowy)", value: "Apple CarPlay — dopisz tryb" },
    { label: "Android Auto", value: "Android Auto — dopisz" },
    { label: "OBD-II", value: "złącze diagnostyczne OBD-II" },
    { label: "Isofix", value: "Isofix — dopisz fotel / auto" },
    { label: "Hak holowniczy / wiązka", value: "hak holowniczy — dopisz model auta" },
    { label: "Ramy bagażnika / box dachowy", value: "bagażnik / box — dopisz model auta i typ relingów" },

    { label: "Ładowanie i zasilanie", heading: true },
    { label: "Sieć 230 V (EU)", value: "zasilanie sieciowe 230 V, wtyczka EU" },
    { label: "USB PD (Power Delivery)", value: "USB Power Delivery — dopisz waty" },
    { label: "Quick Charge", value: "Quick Charge — dopisz generację" },
    { label: "Napięcie / moc (dopisz)", value: "parametr zasilania zgodny z (dopisz)" },
    { label: "Akumulator 18 V (platforma)", value: "system akumulatorów 18 V — dopisz markę / serię" },
    { label: "Akumulator 12 V (narzędzia)", value: "akumulator 12 V — dopisz system" },
    { label: "Ładowarka indukcyjna 3w1 (telefon / zegarek / słuchawki)", value: "stacja ładowania 3w1 — dopisz modele" },
    { label: "MagSafe + Watch + AirPods", value: "Apple MagSafe + Apple Watch + AirPods — dopisz" },

    { label: "Gwinty i instalacja", heading: true },
    { label: "Gwint 1/2 cala", value: "gwint 1/2\"" },
    { label: "Gwint 3/4 cala", value: "gwint 3/4\"" },
    { label: "Gwint M10 / M12 / M14 (dopisz)", value: "gwint metryczny — dopisz rozmiar" },
    { label: "Oprawka E27", value: "oprawka E27" },
    { label: "Oprawka GU10", value: "oprawka GU10" },
    { label: "Oprawka G9 / MR16", value: "oprawka G9 lub MR16 — dopisz" },
    { label: "Montaż: ściana / sufit", value: "montaż: ściana lub sufit (dopisz)" },
    { label: "Szyna / szynoprzewód", value: "montaż na szynie / szynoprzewodzie" },
    { label: "Standard VESA (dopisz)", value: "uchwyt VESA — dopisz rozstaw" },
    { label: "Kolumna / statyw — dopisz gwint 1/4\" lub 3/8\"", value: "statyw lub kolumna — dopisz gwint" },
    { label: "Rura instalacyjna 16 / 20 / 25 mm", value: "rura — dopisz średnicę (mm)" },

    { label: "Narzędzia (systemy akumulatorów)", heading: true },
    { label: "Makita LXT 18 V", value: "system Makita LXT 18 V" },
    { label: "DeWalt XR 18 V", value: "system DeWalt XR 18 V" },
    { label: "Bosch Professional 18 V", value: "system Bosch Professional 18 V" },
    { label: "Milwaukee M18", value: "system Milwaukee M18" },
    { label: "Parkside X20V (Lidl)", value: "system Parkside X20V" },
    { label: "Einhell Power X-Change", value: "system Einhell Power X-Change" },
    { label: "Worx PowerShare 20 V", value: "system Worx PowerShare 20 V" },
    { label: "Ryobi ONE+", value: "system Ryobi ONE+" },
    { label: "Hilti (akumulator)", value: "system Hilti — dopisz serię" },
    { label: "Inny system — dopisz", value: "system akumulatorów / platforma (dopisz)" },

    { label: "AGD i meble", heading: true },
    { label: "Szerokość modułu 45 / 60 cm", value: "szerokość modułu AGD 45 lub 60 cm — dopisz" },
    { label: "Do zmywarki", value: "zmywarka — dopisz kompatybilność (np. koszyk)" },
    { label: "Okap / płyta — dopisz markę", value: "okap lub płyta — dopisz model" },
    { label: "Filtr wody — dopisz typ / gwint", value: "filtr wody — dopisz typ lub gwint" },
    { label: "Wkład do ekspresu — dopisz system", value: "wkład do ekspresu — dopisz system (np. Tassimo, Dolce Gusto)" },
    { label: "Worki do odkurzacza — dopisz model", value: "worki — dopisz model odkurzacza" },
    { label: "Końcówka do szczoteczki — dopisz serię", value: "końcówka szczoteczki — dopisz serię" },

    { label: "Foto, obiektywy, lampy", heading: true },
    { label: "Canon RF / EF", value: "bagnet Canon RF lub EF — dopisz" },
    { label: "Sony E / FE", value: "bagnet Sony E / FE — dopisz" },
    { label: "Nikon Z / F", value: "bagnet Nikon Z lub F — dopisz" },
    { label: "Micro Four Thirds (Olympus / OM)", value: "Micro Four Thirds — dopisz" },
    { label: "Fujifilm X / GFX", value: "Fujifilm — dopisz system" },
    { label: "Lampa błyskowa — dopisz system", value: "lampa — dopisz mocowanie (np. hot shoe)" },

    { label: "Aparaty akcji i drony", heading: true },
    { label: "GoPro — dopisz serię", value: "GoPro — dopisz model" },
    { label: "DJI — dopisz model", value: "DJI — dopisz model" },
    { label: "Insta360", value: "Insta360 — dopisz model" },

    { label: "VR / AR", heading: true },
    { label: "Meta Quest", value: "Meta Quest — dopisz model" },
    { label: "PlayStation VR2", value: "PlayStation VR2" },
    { label: "Apple Vision Pro", value: "Apple Vision Pro — dopisz" },

    { label: "Drukarka i materiały eksploatacyjne", heading: true },
    { label: "Toner / tusz — dopisz model drukarki", value: "toner lub tusz — dopisz model drukarki" },
    { label: "Epson", value: "zgodność: Epson — dopisz model" },
    { label: "HP", value: "zgodność: HP — dopisz model" },
    { label: "Brother", value: "zgodność: Brother — dopisz model" },
    { label: "Canon", value: "zgodność: Canon — dopisz model" },
    { label: "Xerox / Kyocera", value: "zgodność: Xerox / Kyocera — dopisz model" },

    { label: "Rower i napęd", heading: true },
    { label: "Shimano", value: "kompatybilność Shimano — dopisz grupę / serię" },
    { label: "SRAM", value: "kompatybilność SRAM — dopisz grupę" },
    { label: "Campagnolo", value: "Campagnolo — dopisz grupę" },
    { label: "Oś piasty — boost / standard", value: "oś piasty — dopisz standard (np. boost)" },
    { label: "Centerlock / 6 śrub", value: "mocowanie tarczy — Centerlock lub 6 śrub" },

    { label: "Ochrona IP / normy", heading: true },
    { label: "IP54 / IP65 / IP67", value: "stopień ochrony IP — dopisz (np. IP67)" },
    { label: "IK10 (odporność na uderzenia)", value: "IK10 lub inna klasa IK — dopisz" },

    { label: "Części zamienne", heading: true },
    { label: "Zgodne z częścią oryginalną", value: "zgodne z częścią OEM — dopisz numer" },
    { label: "Wymiary wkładu łącznego", value: "wymiary wkładu — dopisz mm" },
  ],
  ean: [
    { label: "Format 13 cyfr (PL)", value: "590… (dopisz pełny kod)" },
    { label: "Kod do skanera", value: "czytelny kod kreskowy na opakowaniu" },
    { label: "Wiele sztuk — różne EAN", value: "EAN zależny od wariantu" },
  ],
  sku: [
    { label: "Symbol producenta", value: "symbol wg producenta" },
    { label: "Indeks magazynowy", value: "indeks magazynowy" },
    { label: "Kod koloru / wariantu", value: "kod wariantu (kolor/rozmiar)" },
    { label: "Kod sezonowy", value: "kod kolekcji sezonowej" },
  ],
  weight: [
    { label: "Gramy — bardzo lekkie", heading: true },
    { label: "do 25 g", value: "do 25 g" },
    { label: "25–50 g", value: "25–50 g" },
    { label: "50–100 g", value: "50–100 g" },
    { label: "100–200 g", value: "100–200 g" },
    { label: "200–500 g", value: "200–500 g" },
    { label: "500–750 g", value: "500–750 g" },
    { label: "750 g–1 kg", value: "750 g–1 kg" },

    { label: "Kilogramy — średnie", heading: true },
    { label: "1–1,5 kg", value: "1–1,5 kg" },
    { label: "1,5–2 kg", value: "1,5–2 kg" },
    { label: "2–3 kg", value: "2–3 kg" },
    { label: "3–5 kg", value: "3–5 kg" },
    { label: "5–8 kg", value: "5–8 kg" },
    { label: "8–12 kg", value: "8–12 kg" },
    { label: "10–15 kg", value: "10–15 kg" },

    { label: "Kilogramy — cięższe", heading: true },
    { label: "15–25 kg", value: "15–25 kg" },
    { label: "25–40 kg", value: "25–40 kg" },
    { label: "40–60 kg", value: "40–60 kg" },
    { label: "powyżej 60 kg", value: "powyżej 60 kg" },

    { label: "Skrótowo (jak w filtrach)", heading: true },
    { label: "do 100 g", value: "do 100 g" },
    { label: "100–500 g", value: "100–500 g" },
    { label: "0,5–1 kg", value: "0,5–1 kg" },
    { label: "1–2 kg", value: "1–2 kg" },
    { label: "2–5 kg", value: "2–5 kg" },
    { label: "5–10 kg", value: "5–10 kg" },
    { label: "powyżej 5 kg", value: "powyżej 5 kg" },
    { label: "powyżej 10 kg", value: "powyżej 10 kg" },

    { label: "Rodzaj wagi (opis)", heading: true },
    { label: "Waga netto", value: "waga netto (bez opakowania)" },
    { label: "Waga brutto", value: "waga brutto (z opakowaniem)" },
    { label: "Waga jednej sztuki", value: "waga jednej sztuki" },
    { label: "Waga całego zestawu", value: "waga całego zestawu" },
    { label: "Waga z akumulatorem / bez", value: "waga bez akumulatora (z akumulatorem — dopisz)" },
    { label: "Tara opakowania", value: "tara opakowania (dopisz)" },
    { label: "Waga jednostki logistycznej (karton)", value: "waga jednostki zbiorczej (dopisz)" },
  ],
  dims: [
    { label: "Gabaryt (najdłuższy bok)", heading: true },
    { label: "do 10 cm", value: "do 10 cm (najdłuższy bok)" },
    { label: "10–20 cm", value: "10–20 cm (najdłuższy bok)" },
    { label: "20–30 cm", value: "20–30 cm (najdłuższy bok)" },
    { label: "30–40 cm", value: "30–40 cm (najdłuższy bok)" },
    { label: "40–60 cm", value: "40–60 cm (najdłuższy bok)" },
    { label: "60–100 cm", value: "60–100 cm (najdłuższy bok)" },
    { label: "100–150 cm", value: "100–150 cm (najdłuższy bok)" },
    { label: "powyżej 150 cm", value: "powyżej 150 cm (najdłuższy bok)" },
    { label: "Mały gabaryt (jak filtr)", value: "do 20 cm najdłuższy bok" },
    { label: "Średni (jak filtr)", value: "ok. 20–40 cm" },
    { label: "Duży (jak filtr)", value: "powyżej 40 cm" },

    { label: "Formaty papieru i dokumentów", heading: true },
    { label: "A6", value: "ok. 10,5 × 14,8 cm" },
    { label: "A5", value: "ok. 21 × 14,8 cm" },
    { label: "A4", value: "ok. 21 × 29,7 cm" },
    { label: "A3", value: "ok. 29,7 × 42 cm" },
    { label: "A2", value: "ok. 42 × 59,4 cm" },
    { label: "B5", value: "ok. 25 × 17,6 cm" },
    { label: "Letter (US)", value: "ok. Letter (US) — 21,6 × 27,9 cm" },

    { label: "Prostokąt — szer. × wys. × gł.", heading: true },
    { label: "Wymiary w cm (dopisz)", value: "wymiary w cm (dopisz)" },
    { label: "Kompakt (np. 10 × 15 × 8 cm)", value: "np. 10 × 15 × 8 cm" },
    { label: "Średni (np. 25 × 20 × 10 cm)", value: "np. 25 × 20 × 10 cm" },
    { label: "Większe (np. 40 × 30 × 20 cm)", value: "np. 40 × 30 × 20 cm" },
    { label: "Karton (np. 50 × 40 × 30 cm)", value: "np. 50 × 40 × 30 cm" },
    { label: "Tylko 2 wymiary (np. ramka)", value: "wymiary w cm — podaj szer. i wys. (dopisz)" },

    { label: "Okrągłe i cylindryczne", heading: true },
    { label: "Średnica × wysokość", value: "średnica i wysokość (np. słoik)" },
    { label: "Średnica zewn. / wewn.", value: "średnica zewnętrzna / wewnętrzna (dopisz)" },
    { label: "Grubość / średnica pręta (mm)", value: "grubość lub średnica w mm (dopisz)" },
    { label: "Obwód (cm)", value: "obwód w cm (dopisz)" },

    { label: "Ekran / obraz", heading: true },
    { label: "Przekątna w calach (dopisz)", value: "przekątna w calach (dopisz)" },
    { label: "24\" / 27\" / 32\"", value: "np. 24\", 27\" lub 32\" — dopisz dokładnie" },
    { label: "43\" / 55\" / 65\" (TV)", value: "np. 43\", 55\" lub 65\" — dopisz" },
    { label: "Proporcje 16:9 / 21:9", value: "proporcje ekranu 16:9 lub 21:9 (dopisz)" },

    { label: "Meble i zabudowa", heading: true },
    { label: "Szerokość frontu 45 / 60 cm", value: "szerokość frontu 45 lub 60 cm — dopisz" },
    { label: "Głębokość szafki (cm)", value: "głębokość szafki w cm (dopisz)" },
    { label: "Wysokość pod zabudowę", value: "wysokość pod zabudowę w cm (dopisz)" },
    { label: "Rozstaw otworów / montaż (mm)", value: "rozstaw otworów montażowych w mm (dopisz)" },

    { label: "Łóżko / materac / pościel", heading: true },
    { label: "90 × 200 cm", value: "90 × 200 cm" },
    { label: "140 × 200 cm", value: "140 × 200 cm" },
    { label: "160 × 200 cm", value: "160 × 200 cm" },
    { label: "180 × 200 cm", value: "180 × 200 cm" },
    { label: "200 × 200 cm", value: "200 × 200 cm" },

    { label: "Logistyka i opakowanie", heading: true },
    { label: "Wymiary przesyłki (kurier)", value: "wymiary przesyłki w cm (dopisz)" },
    { label: "Wymiary wewnętrzne kartonu", value: "wymiary wewnętrzne opakowania w cm (dopisz)" },
    { label: "Wymiary z opakowaniem sprzedażowym", value: "wymiary produktu z opakowaniem (dopisz)" },
  ],
  cert: [
    { label: "CE", value: "CE" },
    { label: "RoHS", value: "RoHS" },
    { label: "REACH", value: "REACH" },
    { label: "OEKO-TEX Standard 100", value: "OEKO-TEX Standard 100" },
    { label: "BSCI", value: "BSCI" },
    { label: "ISO (ogólnie)", value: "certyfikat ISO (dopisz zakres)" },
    { label: "Żywnościowy kontakt", value: "nadaje się do kontaktu z żywnością (wg deklaracji)" },
    { label: "Dermatologicznie testowane", value: "testy dermatologiczne" },
  ],
  pack: [
    { label: "Dokumenty", heading: true },
    { label: "Instrukcja PL", value: "instrukcja w języku polskim" },
    { label: "Instrukcja wielojęzyczna", value: "instrukcja w kilku językach (wg opisu)" },
    { label: "Karta gwarancyjna", value: "karta gwarancyjna w zestawie" },
    { label: "Deklaracja zgodności / CE (dokument)", value: "dokument zgodności lub karta CE (jeśli dotyczy)" },

    { label: "Zasilanie i baterie", heading: true },
    { label: "Kabel zasilający", value: "kabel zasilający w zestawie" },
    { label: "Kabel USB (A / C)", value: "kabel USB w zestawie (dopisz typ)" },
    { label: "Ładowarka / zasilacz", value: "ładowarka lub zasilacz w zestawie" },
    { label: "Baterie (AA / AAA)", value: "baterie w zestawie (dopisz typ)" },
    { label: "Akumulator w zestawie", value: "akumulator w zestawie" },
    { label: "Listwa zasilająca / przedłużacz", value: "listwa lub przedłużacz — jeśli w zestawie" },

    { label: "Łączność i sygnał", heading: true },
    { label: "Kabel HDMI / DisplayPort", value: "kabel HDMI lub DisplayPort — jeśli w zestawie" },
    { label: "Adapter / przejściówka", value: "adapter lub przejściówka w zestawie" },
    { label: "Antena / kabel koncentryczny", value: "antena lub kabel — jeśli w zestawie" },

    { label: "Montaż i osprzęt", heading: true },
    { label: "Śruby / kołki rozporowe", value: "śruby lub kołki montażowe w zestawie" },
    { label: "Kołnierz / uszczelka", value: "kołnierz lub uszczelka — jeśli w zestawie" },
    { label: "Szablon wiertarski", value: "szablon do wiercenia w zestawie" },
    { label: "Klucz / śrubokręt / bity", value: "narzędzia montażowe w zestawie" },
    { label: "Taśma montażowa / pianka", value: "taśma dwustronna lub pianka montażowa" },
    { label: "Uchwyt / ramię / podstawka", value: "uchwyt, ramię lub podstawka w zestawie" },

    { label: "Ochrona i transport", heading: true },
    { label: "Futerał / etui", value: "futerał lub etui" },
    { label: "Pokrowiec / worek", value: "pokrowiec lub worek transportowy" },
    { label: "Folia ochronna na ekran", value: "folia ochronna — jeśli w zestawie" },
    { label: "Osłona / nakładka", value: "osłona lub nakładka ochronna" },

    { label: "Zużywalne / startowe", heading: true },
    { label: "Filtr zapasowy / wkład testowy", value: "filtr lub wkład startowy w zestawie" },
    { label: "Płyn / proszek startowy", value: "środek startowy (np. proszek, płyn) — dopisz" },
    { label: "Końcówki / szczotki zapasowe", value: "końcówki lub szczotki zapasowe" },

    { label: "Minimalnie / bez dodatków", heading: true },
    { label: "Tylko produkt", value: "sprzedawany pojedynczo (bez akcesoriów)" },
    { label: "Oryginalne pudełko — bez dodatków", value: "tylko produkt w oryginalnym opakowaniu — bez akcesoriów" },
    { label: "Komplet zgodny z listą producenta", value: "zawartość zgodna z listą producenta (dopisz)" },
  ],
}

function chipButtonAriaLabel(chip: SuggestionChip, filled: boolean, used: boolean): string {
  if (filled) return `Cecha ${chip.label}: uzupełniona. Drugie kliknięcie usuwa sekcję.`
  if (used) return `Cecha ${chip.label}: pusty szablon. Kliknij ponownie, aby usunąć linię.`
  return `Dodaj szablon linii cechy: ${chip.label}.`
}

function FeatureChipPresetDropdown({
  chip,
  presets,
  used,
  filled,
  suggested,
  chipClassName,
  ariaLabel,
  onApplySelectedValues,
  onRemoveInsert,
}: {
  chip: SuggestionChip
  presets: ChipPresetOption[]
  used: boolean
  filled: boolean
  suggested: boolean
  chipClassName: string
  ariaLabel: string
  onApplySelectedValues: (values: string[]) => void
  onRemoveInsert: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [presetSearch, setPresetSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase()
    if (!q) return presets
    return presets.filter((p) => {
      if (!isChipPresetValueRow(p)) return false
      const l = p.label.toLowerCase()
      const v = p.value.toLowerCase()
      return l.includes(q) || v.includes(q)
    })
  }, [presets, presetSearch])

  const resetPickerState = useCallback(() => {
    setSelected(new Set())
    setPresetSearch("")
  }, [])

  const applyOrderedValues = useCallback(() => {
    const ordered = presets
      .filter(isChipPresetValueRow)
      .filter((p) => selected.has(p.value))
      .map((p) => p.value)
    onApplySelectedValues(ordered)
  }, [presets, selected, onApplySelectedValues])

  const chipIconClass = cn(
    "h-3 w-3",
    filled ? "text-emerald-400" : used ? "text-amber-400" : suggested ? "text-cyan-400" : "text-cyan-400/75"
  )

  const presetHeaderBlock = (
    <>
      <p className="mb-2 text-[11px] leading-snug text-muted-foreground/80">
        Zaznacz wartości — wstawimy jedną linię po przecinku.
        {chip.key === "gram" ? " Albo wybierz pusty nagłówek i wpisz liczbę ręcznie." : null}
      </p>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-black/50 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-cyan-400/60" aria-hidden />
          <input
            type="search"
            placeholder="Szukaj…"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-100 placeholder:text-muted-foreground/40 focus:outline-none"
            autoComplete="off"
            aria-label="Filtruj presety"
          />
        </div>
      </div>
    </>
  )

  const scrollClassName = cn(
    "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5",
    "scrollbar-preset scrollbar-preset-touch-hidden"
  )

  return (
    <>
      <motion.button
        layout
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        onClick={() => setDialogOpen(true)}
        className={chipClassName}
      >
        <chip.Icon className={chipIconClass} />
        {chip.label}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        {filled ? (
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
        ) : used ? (
          <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
        ) : null}
      </motion.button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetPickerState()
        }}
      >
        <DialogContent
          showCloseButton
          overlayClassName="z-199 bg-black/60 supports-backdrop-filter:backdrop-blur-sm"
          className="z-200 flex min-h-0 w-[min(94vw,420px)] max-w-[min(94vw,420px)] flex-col gap-0 overflow-hidden rounded-2xl border border-white/12 bg-gray-950/98 p-0 text-gray-100 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)] sm:max-w-[min(94vw,420px)] top-[max(0.75rem,env(safe-area-inset-top))] max-h-[min(92dvh,calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)),34rem)] translate-y-0"
        >
            <DialogTitle className="sr-only">Wybór wartości: {chip.label}</DialogTitle>
            <div className="shrink-0 border-b border-white/8 bg-gray-950/90 px-4 pb-3 pt-4 backdrop-blur-md">
              <p className="mb-1 text-[15px] font-semibold tracking-tight text-gray-100">{chip.label}</p>
              {presetHeaderBlock}
            </div>

            <div className={scrollClassName}>
              {filteredPresets.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  Brak wyników — zmień wyszukiwanie
                </p>
              ) : (
                filteredPresets.map((p, idx) =>
                  isChipPresetValueRow(p) ? (
                    <button
                      key={`${chip.key}-d-${p.label}-${p.value}`}
                      type="button"
                      role="checkbox"
                      aria-checked={selected.has(p.value)}
                      onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.value)) next.delete(p.value)
                          else next.add(p.value)
                          return next
                        })
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] leading-snug text-gray-100 active:bg-white/10",
                        selected.has(p.value) && "bg-white/8"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/40",
                          selected.has(p.value) &&
                            "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                        )}
                        aria-hidden
                      >
                        {selected.has(p.value) ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">{p.label}</span>
                    </button>
                  ) : (
                    <div key={`${chip.key}-h-${idx}-${p.label}`} className={cn("px-0.5", idx > 0 && "mt-2")}>
                      {idx > 0 ? <div className="mb-1.5 border-t border-white/6" /> : null}
                      <div className="flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500/10 via-teal-500/6 to-transparent px-3 py-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" aria-hidden />
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-cyan-300/90">
                          {p.label}
                        </span>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div className="shrink-0 space-y-1.5 border-t border-white/10 bg-gray-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => {
                  applyOrderedValues()
                  setDialogOpen(false)
                  resetPickerState()
                }}
                className={cn(
                  "w-full rounded-xl py-3.5 text-center text-[15px] font-semibold transition-colors",
                  selected.size > 0
                    ? "bg-emerald-500/22 text-emerald-50 active:bg-emerald-500/32"
                    : "pointer-events-none opacity-35"
                )}
              >
                {selected.size > 0 ? `Wstaw wybrane (${selected.size})` : "Wstaw wybrane"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplySelectedValues([])
                  setDialogOpen(false)
                  resetPickerState()
                }}
                className="w-full rounded-xl py-2.5 text-center text-[13px] text-muted-foreground active:bg-white/8"
              >
                Tylko nagłówek (pusty szablon)
              </button>
              {used ? (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveInsert()
                    setDialogOpen(false)
                    resetPickerState()
                  }}
                  className="w-full rounded-xl py-2.5 text-center text-[13px] text-amber-200/85 active:bg-amber-500/15"
                >
                  {filled ? `Usuń sekcję "${chip.label}"…` : "Usuń linię"}
                </button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
}

const CHIP_TOTAL = SUGGESTION_CHIPS.length

type ListingIntentChip = {
  key: string
  label: string
  snippet: string
  /** Dłuższa podpowiedź w tooltip — co podkreśli AI w tonie i hooku. */
  hint: string
}

type ListingIntentGroup = {
  id: string
  title: string
  chips: ListingIntentChip[]
}

/** Lewa obwódka akordeonów „Szybkie pomysły” — odcienie zieleni, spójne z Krokiem 2. */
const LISTING_INTENT_GROUP_ACCENT: Record<string, string> = {
  who: "border-l-emerald-400/90",
  when: "border-l-teal-400/85",
  promise: "border-l-emerald-300/75",
  platform: "border-l-emerald-400/95",
}

const LISTING_INTENT_GROUP_ICONS: Partial<Record<string, LucideIcon>> = {
  who: Users,
  when: ShoppingBag,
  promise: Star,
  platform: Store,
}

/** Krotkie wskazowki kata narracji per platforma. */
const PLATFORM_INTENT_SNIPPETS: Record<string, ListingIntentChip[]> = {
  allegro: [
    { key: 'alg_params', label: 'Parametry na Allegro', snippet: 'narracja zgodna z parametrami oferty: fakty, ktore kupujacy widzi w filtrach bocznych', hint: 'Opis sprzedaje, ale konwersja rosnie, gdy cechy pokrywaja sie z parametrami formularza.' },
    { key: 'alg_hook', label: 'Hook w 75 zn.', snippet: 'tytul z glowna fraza na poczatku — czytelny i bez CAPS LOCK', hint: 'Allegro: tytul <=75 zn., najwazniejsze slowo na poczatku. Bez wykrzyknikow.' },
    { key: 'alg_mobile', label: 'Mobile / skanowanie', snippet: 'krotkie akapity i szybkie skanowanie opisu na telefonie — najwazniejsze korzysci widoczne od razu', hint: 'W praktyce wiele wejsc jest z mobile; opis musi dawac sie skanowac bez sciany tekstu.' },
    { key: 'alg_benefits', label: 'Jezyk korzysci', snippet: 'jezyk korzysci zamiast samych parametrow — fakt przekuty w efekt dla kupujacego', hint: 'SEO Allegro = tytul + parametry; opis = konwersja. AI opisze korzysc, nie powtorzy liczb.' },
    { key: 'alg_google', label: 'SEO Google', snippet: 'opis pod Google: naturalny tekst z fraza kluczowa, bez keyword stuffingu', hint: 'Wyszukiwarka Allegro malo indeksuje opis; Google indeksuje go lepiej.' },
    { key: 'alg_concrete', label: 'Konkret bez lania', snippet: 'konkret, czytelnosc i minimum pustych sloganow — kupujacy od razu rozumie, co dostaje', hint: 'Marketplace premiuje jasny przekaz; mniej ogolnikow, wiecej konkretow z cech.' },
  ],
  amazon: [
    { key: 'amz_bullet1', label: 'Bullet #1 = USP', snippet: 'glowna korzysc zakupu jako pierwszy punkt — najsilniejszy argument sprzedazowy', hint: 'Amazon: 5 Bullet Points; pierwszy = USP. Kazdy od korzysci. Max ~500 zn./punkt.' },
    { key: 'amz_exact', label: 'Fraza na poczatku', snippet: 'glowna fraza wyszukiwania na poczatku tytulu — bez slow za 80. znakiem', hint: 'W apce mobilnej widac ~70-80 zn. tytulu; exact match na poczatku mocniejszy dla A10.' },
    { key: 'amz_backend', label: 'Backend keywords', snippet: 'synonimy i long-tail do Backend Keywords — bez duplikowania tytulu', hint: 'Backend: ~249 bajtow UTF-8. Slowa spacja, bez interpunkcji.' },
    { key: 'amz_aplus', label: 'Narracja A+', snippet: 'narracja wizualna pod A+ Content: naglowki sekcji, porownania, storytelling marki', hint: 'Tekst na grafice A+ nie indeksuje sie jak opis — Alt Text bywa indeksowany.' },
  ],
  etsy: [
    { key: 'etsy_story', label: 'Historia tworca', snippet: 'historia powstania i rekodzielnicy charakter produktu — autentycznosc i unikalnosc', hint: 'Etsy: kupujacy szukaja historii i czlowieka za produktem.' },
    { key: 'etsy_tags', label: 'Slowa kluczowe (tagi)', snippet: 'naturalne slowa kluczowe z intencja kupujacego — pod 13 tagow i tytul 140 zn.', hint: 'Etsy: 13 tagow (kazdy do 20 zn.). Tytul <=140 zn.; fraza dokladna na poczatku.' },
    { key: 'etsy_gift', label: 'Prezent / personalizacja', snippet: 'idealny prezent — personalizacja, pakowanie i czas dostawy przed okazja', hint: 'Etsy = duzo ruchu prezentowego. Jesli oferta to umozliwia, mozna to wyeksponowac.' },
  ],
  shopify: [
    { key: 'shp_seo', label: 'SEO Google', snippet: 'tresc pod intencje wyszukiwania w Google — keyword blisko poczatku tytulu', hint: 'Shopify: tytul + meta + tresc = ranking. Handle URL z tytulu — krotko.' },
    { key: 'shp_conv', label: 'Konwersja karty', snippet: 'krotki opis pod cena z hookiem i CTA — decyduje o kliknieciu Dodaj do koszyka', hint: 'Short Description widoczny pod cena — 2-3 zdania, korzysc + CTA.' },
  ],
  woocommerce: [
    { key: 'woo_short', label: 'Krotki opis', snippet: 'krotki opis pod cena z hookiem — widoczny bez rozwijania karty produktu', hint: 'WooCommerce Short Description: klucz do konwersji. Czesto pomijane, a kluczowe.' },
    { key: 'woo_seo', label: 'SEO (slug)', snippet: 'keyword na poczatku tytulu — WooCommerce generuje URL-slug z nazwy produktu', hint: 'Slug URL z tytulu wplywa na SEO Google.' },
  ],
  ebay: [
    { key: 'ebay_title', label: 'Tytul 80 zn.', snippet: 'tytul z najwazniejsza fraza na poczatku — do 80 znakow, bez zbednych ozdobnikow', hint: 'eBay: tytul <=80 zn. Unikaj spamu slow kluczowych; konkret.' },
    { key: 'ebay_condition', label: 'Stan produktu', snippet: 'jasna informacja o stanie i kompletnosci zestawu — bez ukrywania wad', hint: 'Stan, pudelko, akcesoria i uszkodzenia to fundament zaufania na eBay.' },
  ],
  vinted: [
    { key: 'vinted_hashtags', label: 'Hashtagi', snippet: 'hashtagi dopasowane do kategorii i stylu — do 5 trafnych tagow w opisie', hint: 'Vinted: hashtagi w plain texcie pomagaja w filtrach. Max 5, bez spamu.' },
    { key: 'vinted_size', label: 'Rozmiar i stan', snippet: 'rozmiar, stan i marka w pierwszym zdaniu — kupujacy filtruje wlasnie po tym', hint: 'Vinted C2C: rozmiar + stan + marka na poczatku.' },
  ],
  olx: [
    { key: 'olx_local', label: 'Kontekst lokalny', snippet: 'odbior osobisty lub szybka wysylka — elastycznosc i przejrzystosc warunkow', hint: 'OLX: kupujacy czesto chce odebrac lokalnie. Zaznacz mozliwosci.' },
    { key: 'olx_price', label: 'Uzasadnienie ceny', snippet: 'uczciwa cena uzasadniona stanem i kompletnoscia — bez ukrytych wad', hint: 'OLX: zaufanie = transparentnosc. Opisz stan i zawartosc zestawu.' },
  ],
  empikplace: [
    { key: 'empik_category', label: 'Kategoria Empik', snippet: 'opis dopasowany do kategorii Empiku — format HTML, sekcje jak na marketplace', hint: 'Empik Marketplace: parametry w formularzach + HTML w opisie. Podobna logika do Allegro.' },
  ],
}

const LISTING_INTENT_SEGMENT_SEP = " · "

/** Usuwa fragment dopisany z chipa: najpierw całe segmenty (` · `), potem prosty fallback pod ręczną edycję. */
function removeListingIntentSnippetFromText(text: string, snippet: string): string {
  const s = snippet.trim()
  const raw = text.trim()
  if (!s || !raw) return ""

  const parts = raw
    .split(LISTING_INTENT_SEGMENT_SEP)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  const sl = s.toLowerCase()
  const fi = parts.findIndex((p) => p.toLowerCase() === sl)
  if (fi >= 0) {
    const next = [...parts]
    next.splice(fi, 1)
    return next.join(LISTING_INTENT_SEGMENT_SEP)
  }

  const tl = raw.toLowerCase()
  const idx = tl.indexOf(sl)
  if (idx < 0) return raw

  let before = raw.slice(0, idx)
  let after = raw.slice(idx + s.length)
  before = before.replace(/\s*·\s*$/u, "").trimEnd()
  after = after.replace(/^\s*·\s*/u, "").trimStart()
  const joined = [before, after].filter((x) => x.length > 0).join(LISTING_INTENT_SEGMENT_SEP).trim()
  return joined.replace(/\s*·\s*·\s*/gu, LISTING_INTENT_SEGMENT_SEP)
}

/** Szybkie frazy do „Kąt sprzedaży” — pogrupowane jak mini-katalog pomysłów. */
const LISTING_INTENT_GROUPS: ListingIntentGroup[] = [
  {
    id: "who",
    title: "Dla kogo",
    chips: [
      {
        key: "everyone",
        label: "Dla wszystkich",
        snippet: "dla szerokiego grona odbiorców: uniwersalne użycie i łatwe dopasowanie do różnych potrzeb",
        hint: "Uniwersalny ton bez sztucznego dzielenia odbiorcy — tylko jeśli produkt faktycznie jest wszechstronny.",
      },
      {
        key: "adults",
        label: "Dla dorosłych",
        snippet: "dla dorosłych: dopasowanie do codziennych potrzeb, komfort i świadomy wybór",
        hint: "Bez treści pod dzieci — chyba że produkt wyraźnie jest dla innej grupy wiekowej.",
      },
      {
        key: "parents",
        label: "Dla rodziców",
        snippet: "dla rodziców: praktyczny wybór przy zakupie dla dziecka lub domu — jasny efekt i mniej stresu",
        hint: "Ton decyzji rodzicielskiej — bez wymyślania wieku dziecka, jeśli nie ma go w cechach.",
      },
      {
        key: "couple",
        label: "Dla pary",
        snippet: "dla pary: wspólne użytkowanie, kompromis między wygodą a stylem w codziennym życiu",
        hint: "Ogólnie — bez fabuł o relacji; skup się na produkcie i faktach z cech.",
      },
      {
        key: "mom",
        label: "Dla mamy",
        snippet: "dla mamy: wygoda, oszczędność czasu i prostota użycia",
        hint: "Podkreśl komfort i codzienną praktyczność — bez stereotypów.",
      },
      {
        key: "dad",
        label: "Dla taty",
        snippet: "dla taty: funkcjonalność, trwałość i szybkie działanie",
        hint: "Akcent na konkrety i niezawodność w codziennym użyciu.",
      },
      {
        key: "large_family",
        label: "Dla rodziny (wielodzietnej)",
        snippet: "dla rodziny wielodzietnej: trwałość, koszty użytkowania i wygoda dla wszystkich",
        hint: "Unikaj konkretnych liczb i obietnic — chyba że są w cechach.",
      },
      {
        key: "women",
        label: "Dla kobiet",
        snippet: "dla kobiet: dopasowanie stylu, komfort i praktyczność w codziennym użyciu",
        hint: "Bez stereotypów płciowych — tylko to, co wynika z cech produktu.",
      },
      {
        key: "men",
        label: "Dla mężczyzn",
        snippet: "dla mężczyzn: funkcjonalność, trwałość i wygodny styl użytkowania",
        hint: "Konkret i niezawodność — bez pustego „męskiego” marketingu bez pokrycia w cechach.",
      },
      {
        key: "single",
        label: "Dla singla",
        snippet: "dla singla: kompaktowość, wygoda i niezależność w użyciu",
        hint: "Proste scenariusze dnia codziennego — bez sztucznego slangu i przesadnych obietnic.",
      },
      {
        key: "baby",
        label: "Dla niemowląt",
        snippet: "dla niemowląt: delikatność, bezpieczeństwo i komfort",
        hint: "Używaj tylko wtedy, gdy produkt realnie pasuje do tej grupy.",
      },
      {
        key: "preschool",
        label: "Dla przedszkolaka",
        snippet: "dla przedszkolaka: bezpieczeństwo, zabawę i rozwój w odpowiednim tempie",
        hint: "Ton rodzica — bez obietnic rozwojowych bez pokrycia w cechach produktu.",
      },
      {
        key: "kids",
        label: "Dla dzieci",
        snippet: "dla dzieci: bezpieczna i angażująca zabawa",
        hint: "Ton rodzica: bezpieczeństwo i adekwatny wiek — tylko jeśli wynika z cech.",
      },
      {
        key: "schoolkid",
        label: "Dla ucznia",
        snippet: "dla ucznia: porządek, wytrzymałość i wygodę w szkole i po lekcjach",
        hint: "Bez obietnic o ocenach — chyba że produkt to wyraźnie narzędzie edukacyjne z opisem w cechach.",
      },
      {
        key: "teen",
        label: "Dla nastolatków",
        snippet: "dla nastolatków: nowoczesny styl i wygoda użytkowania",
        hint: "Lekkie i dynamiczne brzmienie — bez sztucznego slangu.",
      },
      {
        key: "student",
        label: "Dla studenta",
        snippet: "dla studenta: budżet, mobilność i funkcjonalność na co dzień",
        hint: "Nacisk na sensowny balans ceny i praktyczność — bez obietnic o wynikach.",
      },
      {
        key: "young_adult",
        label: "Dla młodego dorosłego",
        snippet: "dla młodych dorosłych: pierwszy „poważny” zakup, jakość w stosunku do ceny i prosty start",
        hint: "Ton wejścia w dorosłość — bez dat i historii; opieraj się na cechach produktu.",
      },
      {
        key: "seniors",
        label: "Dla seniorów",
        snippet: "dla seniorów: prosta obsługa, czytelność i komfort w codziennym użytkowaniu",
        hint: "Akcent na ergonomię i jasny przekaz — bez infantylizacji; tylko jeśli produkt do tego pasuje.",
      },
      {
        key: "grandpa",
        label: "Dla dziadka",
        snippet: "dla dziadka: wygoda użytkowania i czytelna obsługa",
        hint: "Podkreśl prostotę, ergonomię i codzienny komfort.",
      },
      {
        key: "grandma",
        label: "Dla babci",
        snippet: "dla babci: łatwość użycia i praktyczne korzyści na co dzień",
        hint: "Stawiaj na czytelność i wygodę — bez przesadnych obietnic.",
      },
      {
        key: "diy",
        label: "Dla majsterkowicza / DIY",
        snippet: "dla majsterkowicza i projektów DIY: kontrola nad montażem, satysfakcja z własnej roboty",
        hint: "Bez obietnic czasowych i narzędzi — chyba że zestaw jest kompletny według cech.",
      },
      {
        key: "collector",
        label: "Dla kolekcjonera",
        snippet: "dla kolekcjonera: jakość wykonania, detale i satysfakcja z dopasowania do kolekcji",
        hint: "Bez numerów limitowanych edycji — chyba że są w cechach oferty.",
      },
      {
        key: "caregiver",
        label: "Dla opiekuna",
        snippet: "dla opiekuna: bezpieczeństwo podopiecznego i pewność w codziennym użytkowaniu",
        hint: "Tylko jeśli produkt realnie wspiera opiekę — bez obietnic medycznych.",
      },
      {
        key: "pets",
        label: "Dla zwierząt domowych",
        snippet:
          "dla zwierząt domowych: bezpieczeństwo, komfort i dopasowanie do codziennych potrzeb pupila",
        hint: "Tylko gdy produkt faktycznie jest dla zwierząt — bez obietnic leczniczych bez podstaw w cechach.",
      },
      {
        key: "dog",
        label: "Dla psa",
        snippet: "dla psa: trwałość, bezpieczeństwo i wygoda w codziennym użytkowaniu",
        hint: "Możesz podkreślić rozmiar lub grupę wiekową — tylko jeśli wynika z cech; bez obietnic szkoleniowych.",
      },
      {
        key: "cat",
        label: "Dla kota",
        snippet: "dla kota: komfort, bezpieczeństwo i higiena w codziennej pielęgnacji",
        hint: "Ton właściciela kota — praktycznie i spokojnie, bez przesadzonych obietnic behawioralnych.",
      },
      {
        key: "active_lifestyle",
        label: "Dla aktywnych",
        snippet: "dla aktywnych na co dzień: wygoda ruchu, niezawodność i praktyczność przy treningu lub spacerze",
        hint: "Motywacja bez obietnic o wynikach sportowych — chyba że w cechach produktu.",
      },
      {
        key: "desk_workers",
        label: "Dla pracy przy biurku",
        snippet: "dla osób pracujących przy biurku: ergonomia, porządek i komfort przy długich sesjach",
        hint: "Bez diagnoz zdrowotnych — tylko korzyści wynikające z cech.",
      },
      {
        key: "remote_workers",
        label: "Dla pracy zdalnej",
        snippet: "dla pracy z domu: porządek na stanowisku, mniej rozpraszaczy i wygodniejszy rytm dnia",
        hint: "Scenariusz home office ogólnie — bez sprzętu i łącza, których nie ma w ofercie.",
      },
      {
        key: "creators",
        label: "Dla twórców treści",
        snippet: "dla twórców online: stabilność setupu, wygodny workflow i mniej tarcia przy nagraniach",
        hint: "Bez obietnic o zasięgach i monetyzacji — skup się na produkcie.",
      },
      {
        key: "gamers",
        label: "Dla graczy",
        snippet: "dla graczy: responsywność, komfort sesji i dopasowanie do długiego grania",
        hint: "FPS, rankingi i tryby tylko jeśli wynikają z cech — bez obietnic „wygranej”.",
      },
      {
        key: "travelers",
        label: "Dla podróżników",
        snippet: "dla podróżników: lekkość w bagażu, pakowność i pewność w drodze",
        hint: "Bez lotów, hoteli i dat — chyba że użytkownik poda.",
      },
      {
        key: "outdoor_lovers",
        label: "Dla miłośników outdooru",
        snippet: "dla miłośników outdooru: odporność na warunki i komfort w terenie",
        hint: "Pogoda i trasa ogólnie — bez certyfikatów z pamięci.",
      },
      {
        key: "home_cooks",
        label: "Dla domowych kucharzy",
        snippet: "dla domowych kucharzy: ergonomia przygotowań, higiena i przyjemność z gotowania",
        hint: "Bez przepisów i diety — chyba że produkt to wyraźnie kulinarny z opisem w cechach.",
      },
      {
        key: "expecting_parents",
        label: "Dla przyszłych rodziców",
        snippet: "dla przyszłych rodziców: spokój przygotowań i praktyczne wybory przed narodzinami",
        hint: "Bez obietnic medycznych i terminów — tylko to, co da się uczciwie z cech.",
      },
      {
        key: "new_parents",
        label: "Dla świeżych rodziców",
        snippet: "dla świeżych rodziców: szybsze ogarnięcie dnia, mniej chaosu i więcej pewności w użyciu",
        hint: "Bez wychowawczych obietnic — praktyczny ton z cech produktu.",
      },
      {
        key: "toddler",
        label: "Dla malucha (1–3 lata)",
        snippet: "dla malucha w wieku ok. 1–3 lat: bezpieczeństwo, sensowna ergonomia i zabawowy kontekst",
        hint: "Wiek orientacyjnie — tylko jeśli produkt do tej grupy pasuje według cech.",
      },
      {
        key: "retirees",
        label: "Dla na emeryturze",
        snippet: "dla osób na emeryturze: komfort, prostsza obsługa i spokojny rytm codzienności",
        hint: "Bez infantylizacji — akcent na wygodę i czytelność z cech.",
      },
      {
        key: "mobility_access",
        label: "Przy mniejszej mobilności",
        snippet: "dla osób szukających większej wygody przy ograniczonej mobilności: stabilność, chwyt i mniej wysiłku",
        hint: "Bez diagnoz i bez obietnic rehabilitacyjnych — tylko funkcje z cech.",
      },
      {
        key: "allergy_prone",
        label: "Dla alergików",
        snippet: "dla osób z alergiami: mniej drażniących składników lub lepsza kontrola otoczenia — wg opisu produktu",
        hint: "Skład i certyfikaty tylko z cech — bez leczenia i bez obietnic „hipoalergiczne” bez podstaw.",
      },
      {
        key: "educators",
        label: "Dla nauczycieli",
        snippet: "dla nauczycieli i osób z edukacji: wytrzymałość, porządek i codzienna niezawodność w pracy",
        hint: "Bez obietnic o wynikach klas — praktyczny ton jak dla wymagającej codzienności zawodowej.",
      },
      {
        key: "shift_workers",
        label: "Dla pracy zmianowej",
        snippet: "dla pracy zmianowej i nieregularnych godzin: przewidywalność w użyciu i mniej tarcia w rutynie",
        hint: "Bez grafików i branż z niczego — ogólny kontekst zmiany.",
      },
      {
        key: "freelancers",
        label: "Dla freelancerów",
        snippet: "dla freelancerów i jednoosobowych działalności: elastyczność, mobilność i sensowny balans pracy i życia",
        hint: "Bez obietnic przychodów — tylko produkt i cechy.",
      },
      {
        key: "craft_hobby",
        label: "Dla rękodzieła / hobby",
        snippet: "dla pasjonatów rękodzieła i hobby manualnego: precyzja, przyjemność z procesu i kontrola nad efektem",
        hint: "Bez obietnic artystycznych wyników — chyba że zestaw jasno to opisuje.",
      },
      {
        key: "eco_buyers",
        label: "Dla ekoświadomych",
        snippet: "dla kupujących świadomie ekologicznie: mniej marnotrawstwa, trwalszy wybór lub lepszy skład",
        hint: "Certyfikaty i materiały tylko z cech — bez zielonego PR-u bez pokrycia.",
      },
      {
        key: "small_business",
        label: "Dla małej firmy",
        snippet: "dla małej firmy i biura domowego: niezawodność, porządek i sensowny koszt eksploatacji",
        hint: "Bez faktur, ZUS i skali — ogólny kontekst „firmowy” z cech produktu.",
      },
      {
        key: "renters",
        label: "Dla mieszkających na wynajem",
        snippet: "dla osób na wynajmie: rozwiązania mało inwazyjne, łatwy demontaż i praktyczny kompromis",
        hint: "Bez sugerowania łamania umowy — tylko zalety produktu.",
      },
      {
        key: "runners",
        label: "Dla biegaczy",
        snippet: "dla biegaczy: dopasowanie do treningu, wentylacja i komfort kilometra",
        hint: "Tempa i rekordy tylko z cech — bez obietnic treningowych.",
      },
      {
        key: "musicians",
        label: "Dla muzyków",
        snippet: "dla muzyków i osób ćwiczących na instrumencie: ergonomia, cisza otoczenia i stabilny setup",
        hint: "Bez obietnic brzmienia „jak w studio” — chyba że sprzęt audio ma to w specyfikacji.",
      },
      {
        key: "photographers",
        label: "Dla fotografów",
        snippet: "dla fotografów i filmowców amatorskich: stabilizacja, pakowność i mniej kompromisów w polu",
        hint: "Sprzęt i parametry tylko z cech — bez portfolio i gatunków zdjęć z niczego.",
      },
    ],
  },
  {
    id: "when",
    title: "Kontekst zakupu",
    chips: [
      {
        key: "daily",
        label: "Na co dzień",
        snippet: "codzienne użycie, praktyczny wybór",
        hint: "Rutyna, niezawodność, „sprawdza się w domu”.",
      },
      {
        key: "weekend",
        label: "Weekend / wypoczynek",
        snippet: "na weekend lub krótki odpoczynek: lżejszy rytm i przyjemność z użytkowania",
        hint: "Luźny ton — bez planowania konkretnych wyjazdów, chyba że użytkownik je poda.",
      },
      {
        key: "evening",
        label: "Wieczór / relaks",
        snippet: "na wieczór w domu: wygoda, spokój i przyjemny rytuał po pracy",
        hint: "Nastrojowo, bez obietnic terapeutycznych — tylko to, co wynika z cech produktu.",
      },
      {
        key: "starter",
        label: "Na start",
        snippet: "na start: przystępność, jasne zasady użytkowania i wsparcie dla początkujących",
        hint: "Ton przyjazny początkującym — bez deprecjonowania bardziej zaawansowanych użytkowników.",
      },
      {
        key: "replace",
        label: "Zamiennik",
        snippet: "zamiennik droższego modelu",
        hint: "Porównanie fair: ta sama funkcja, niższa bariera wejścia.",
      },
      {
        key: "upgrade",
        label: "Ulepszenie",
        snippet:
          "ulepszenie obecnego zestawu: wyższa klasa, nowe funkcje albo dłuższa żywotność niż poprzednik",
        hint: "Kąt „krok w górę” — nie myl z tańszym zamiennikiem; bez porównań z konkretnymi markami.",
      },
      {
        key: "spare",
        label: "Zapas / drugi komplet",
        snippet: "jako zapas lub drugi komplet: spójność z pierwszym zestawem i pewność w codziennym użyciu",
        hint: "Sens drugiego egzemplarza tylko wtedy, gdy wynika z produktu lub z opisu użytkownika.",
      },
      {
        key: "minimal",
        label: "Minimalizm",
        snippet: "minimalizm: mniej przedmiotów, więcej funkcji — świadomy, długoterminowy wybór",
        hint: "Spójność z ideą „less is more” — bez moralizowania o konsumpcji.",
      },
      {
        key: "newborn",
        label: "Niemowlę / okołoporodowo",
        snippet: "w okresie niemowlęcym lub tuż po porodzie: praktyka, higiena i spokój w codzienności",
        hint: "Delikatnie i ogólnie — bez obietnic medycznych i bez wymyślania wieku dziecka.",
      },
      {
        key: "parenting",
        label: "Codzienność rodzica",
        snippet: "w codzienności rodzica: oszczędność czasu, porządek i pewność w rutynie domu",
        hint: "Bez wychowawczych obietnic — praktyczne korzyści z cech oferty.",
      },
      {
        key: "first_home",
        label: "Pierwsze mieszkanie",
        snippet: "przy pierwszym mieszkaniu lub kompletowaniu wyposażenia: sensowne priorytety i elastyczność",
        hint: "Ogólnie o „pierwszym razie” — bez metraży, budżetu i list zakupów z niczego.",
      },
      {
        key: "work",
        label: "Praca / biuro",
        snippet: "do pracy lub biura: ergonomia, porządek i codzienna niezawodność",
        hint: "Spokojny, profesjonalny ton — bez obietnic o wynikach zawodowych.",
      },
      {
        key: "remote",
        label: "Praca / nauka zdalna",
        snippet: "do pracy lub nauki zdalnej: porządek na biurku, komfort długich sesji i mniej rozpraszaczy",
        hint: "Home office / nauka online ogólnie — bez obietnic o łączu i sprzęcie, którego nie ma w ofercie.",
      },
      {
        key: "school",
        label: "Szkoła / nauka",
        snippet: "do szkoły lub nauki: porządek, wytrzymałość i wygodę w codziennym użytkowaniu",
        hint: "Ton rodzica lub ucznia — bez obietnic o ocenach i wynikach.",
      },
      {
        key: "commute",
        label: "Dojazd / trasa",
        snippet: "na codzienną trasę do pracy lub szkoły: wytrzymałość, mobilność i pewność w drodze",
        hint: "Bez konkretnych minut i kilometrów — chyba że użytkownik poda.",
      },
      {
        key: "business_trip",
        label: "Delegacja",
        snippet: "w delegacji lub pracy mobilnej: niezawodność między miastami i lekki bagaż",
        hint: "Podróż służbowa ogólnie — bez wymyślania polityki firmy i rozliczeń.",
      },
      {
        key: "travel",
        label: "Na wyjazd",
        snippet: "na wyjazd lub podróż: mobilność, pakowność i lekkość w użyciu",
        hint: "Praktyczny kąt — bez konkretnych dat i miejsc, chyba że użytkownik je poda.",
      },
      {
        key: "compact",
        label: "Małe mieszkanie",
        snippet: "do małego mieszkania: oszczędność miejsca, porządek i funkcjonalny układ",
        hint: "Podkreśl kompaktowość tylko jeśli wynika z cech — bez wymyślania metrażu.",
      },
      {
        key: "shared",
        label: "Współlokatorzy",
        snippet: "we współdzielonym mieszkaniu lub open space: dyskrecja, kompakt i kultura współżycia",
        hint: "Ogólnie o hałasie i przestrzeni — bez wymyślania układu pokoi i sąsiadów.",
      },
      {
        key: "rental",
        label: "Wynajem",
        snippet: "do mieszkania na wynajem: rozwiązania mało inwazyjne i łatwe do cofnięcia",
        hint: "Bez sugerowania łamania umowy najmu — tylko praktyczne zalety produktu.",
      },
      {
        key: "home",
        label: "Remont / przeprowadzka",
        snippet: "przy remoncie lub przeprowadzce: dopasowanie do nowego układu domu i codziennej rutyny",
        hint: "Praktycznie i ogólnie — bez adresów, metraży i dat, chyba że użytkownik poda.",
      },
      {
        key: "kitchen",
        label: "Kuchnia / gotowanie",
        snippet: "do kuchni i gotowania: higiena, ergonomia i bezpieczeństwo przy kontakcie z żywnością",
        hint: "Materiały i certyfikaty (np. kontakt z żywnością) tylko jeśli są w cechach.",
      },
      {
        key: "housekeeping",
        label: "Sprzątanie / porządek",
        snippet: "przy sprzątaniu i utrzymaniu domu: wygoda, ergonomia i mniej frustrujących czynności",
        hint: "Praktycznie — bez obietnic o czasie sprzątania i chemii, której nie ma w zestawie.",
      },
      {
        key: "garden",
        label: "Ogród / działka",
        snippet: "do ogrodu lub na działkę: trwałość na warunki zewnętrzne i sensowne użycie w sezonie",
        hint: "Pogoda i gleba ogólnie — bez gatunków roślin i powierzchni, chyba że użytkownik poda.",
      },
      {
        key: "car",
        label: "Do auta",
        snippet: "do samochodu lub codziennej jazdy: bezpieczeństwo, ergonomia i porządek w kabinie",
        hint: "Bez modelu auta i homologacji — chyba że są w cechach lub w opisie użytkownika.",
      },
      {
        key: "diy",
        label: "DIY / majsterka",
        snippet: "do projektu DIY: kontrola montażu, uniwersalność narzędzi i czytelna instrukcja",
        hint: "Dla majsterkowiczów — bez obietnic o elementach, których nie ma w zestawie.",
      },
      {
        key: "fitness",
        label: "Sport / trening",
        snippet: "do sportu lub treningu: wygoda ruchu, trwałość i praktyczność w aktywności",
        hint: "Motywacja bez obietnic o rezultatach czy redukcji wagi — chyba że w cechach.",
      },
      {
        key: "outdoor",
        label: "Na dwór",
        snippet: "na dwór lub outdoor: odporność na warunki, mobilność i bezpieczeństwo w terenie",
        hint: "Pogoda i teren ogólnie — bez wymyślania certyfikatów i norm, chyba że są w cechach.",
      },
      {
        key: "hobby",
        label: "Pasja / hobby",
        snippet: "dla pasjonatów, rozwój w hobby",
        hint: "Community, zaawansowanie — bez obiecywania wyników.",
      },
      {
        key: "wellness",
        label: "Regeneracja",
        snippet: "codzienna pielęgnacja i regeneracja: komfort, rutyna i spokojny rytuał",
        hint: "Bez obietnic leczniczych i medycznych — tylko to, co da się uczciwie z cech.",
      },
      {
        key: "season",
        label: "Sezon / okazja",
        snippet: "sezonowo, pod konkretną porę roku lub święto",
        hint: "Timing zakupu (np. wyjazd, szkoła) — tylko ogólnie.",
      },
      {
        key: "gift",
        label: "Prezent",
        snippet: "na prezent: estetyka, uniwersalność lub dopasowanie do odbiorcy",
        hint: "Możesz zasugerować okazję ogólnie — bez wymyślania relacji z obdarowywanym.",
      },
      {
        key: "christmas",
        label: "Boże Narodzenie / święta",
        snippet: "na Boże Narodzenie lub święta zimowe: klimat, gościnność i dopasowanie do tradycji domowych",
        hint: "Nastrój świąteczny ogólnie — bez wymyślania menu, listy prezentów i scen rodzinnych.",
      },
      {
        key: "easter",
        label: "Wielkanoc",
        snippet: "na Wielkanoc: świąteczny charakter, przygotowania do śniadania i rodzinnego spotkania",
        hint: "Okazja wiosenna ogólnie — bez obrzędowości i bez konkretnych dat, chyba że użytkownik poda.",
      },
      {
        key: "wedding",
        label: "Ślub / wesele",
        snippet: "na ślub lub wesele: elegancja, dopasowanie do dress code’u i komfort w długim dniu",
        hint: "Okazja formalna ogólnie — bez wymyślania gości, terminów i miejsc.",
      },
      {
        key: "communion",
        label: "Komunia / chrzest",
        snippet: "na komunię, chrzest lub rodzinną uroczystość: stonowany ton, estetyka i dopasowanie do okazji",
        hint: "Uroczystość rodzinna ogólnie — bez wymyślania wyznania i relacji między gośćmi.",
      },
      {
        key: "birthday",
        label: "Urodziny / rocznica",
        snippet: "na urodziny lub rocznicę: osobisty charakter prezentu i przyjemność z obdarowania",
        hint: "Okazja osobista ogólnie — bez wieku, dat i historii znajomości z niczego.",
      },
      {
        key: "celebration",
        label: "Święto / wydarzenie",
        snippet: "pod święto lub rodzinne wydarzenie: atmosfera, gościnność i dopasowanie do okazji",
        hint: "Możesz nazwać okazję ogólnie (np. wigilia, urodziny) — bez wymyślania tradycji rodzinnych.",
      },
      {
        key: "hosting",
        label: "Przyjmowanie gości",
        snippet: "gdy przyjmujesz gości: porządek, wygoda podczas wizyty i mniej stresu w przygotowaniach",
        hint: "Spotkanie w domu ogólnie — bez menu, liczby osób i scenariuszy z niczego.",
      },
      {
        key: "urgent",
        label: "Pilnie / awaria",
        snippet: "pilna potrzeba lub awaria: szybkie wdrożenie i niezawodność w kryzysie dnia codziennego",
        hint: "Bez dramatyzmu i bez obietnic logistycznych — chyba że wynikają z oferty sklepu.",
      },
    ],
  },
  {
    id: "promise",
    title: "Obietnica wartości",
    chips: [
      {
        key: "value",
        label: "Jakość / cena",
        snippet: "najlepszy stosunek jakości do ceny",
        hint: "Racjonalna decyzja: korzyść za złotówkę — na podstawie cech.",
      },
      {
        key: "budget",
        label: "Przystępna cena",
        snippet: "przystępna cena przy sensownej jakości — rozsądny wybór bez przepłacania",
        hint: "Ton oszczędnościowy, nie „taniizna” — bez deprecjonowania produktu i bez fałszywych porównań cen.",
      },
      {
        key: "premium",
        label: "Premium",
        snippet: "premium, wyższa jakość wykonania",
        hint: "Materiały, detale, trwałość — bez superlatyw bez pokrycia.",
      },
      {
        key: "eco",
        label: "Eko / świadomie",
        snippet: "świadomy wybór, mniej odpadów lub trwalszy produkt",
        hint: "Jeśli masz to w cechach — podbije narrację; inaczej tylko delikatnie.",
      },
      {
        key: "trust",
        label: "Spokój zakupu",
        snippet: "pewny zakup: jasne zasady, wsparcie po sprzedaży",
        hint: "Redukcja ryzyka — bez obiecywania gwarancji, których nie ma w danych.",
      },
      {
        key: "clarity",
        label: "Konkret",
        snippet: "konkret i szybkie zrozumienie oferty — bez lania wody i bez pustych sloganow",
        hint: "Dobry kierunek dla marketplace i technicznych ofert: szybka decyzja zakupowa bez marketingowego nadmiaru.",
      },
      {
        key: "standout",
        label: "Wyróżnik",
        snippet: "wyróżnia się na tle typowych tańszych odpowiedników",
        hint: "Kontrast z „no name” — konkret z cech, nie puste „najlepsze”.",
      },
      {
        key: "durable",
        label: "Trwałość",
        snippet: "długa żywotność i odporność na eksploatację — racjonalny zakup na lata",
        hint: "Cykle, normy i lata użytkowania tylko jeśli są w cechach — bez dopisywania gwarancji.",
      },
      {
        key: "comfort",
        label: "Komfort",
        snippet: "wysoki komfort użytkowania: ergonomia i przyjemność w codziennym kontakcie",
        hint: "Subiektywne odczucia uczciwie — bez obietnic „zero zmęczenia” i cudów.",
      },
      {
        key: "ease_use",
        label: "Łatwa obsługa",
        snippet: "łatwa obsługa i intuicyjne użycie — mniej czytania instrukcji, więcej efektu od pierwszego dnia",
        hint: "Prostota tylko jeśli wynika z cech — bez obietnic „dla każdego” bez podstaw.",
      },
      {
        key: "design",
        label: "Design",
        snippet: "wyrazisty design i estetyka dopasowana do współczesnego wnętrza lub stylu życia",
        hint: "Styl ogólnie — bez nazywania trendów i kolekcji, których nie ma w danych.",
      },
      {
        key: "elegance",
        label: "Elegancja / klasa",
        snippet: "elegancki charakter i stonowana klasa — dopasowanie do formalnych i codziennych sytuacji",
        hint: "Bez snobizmu i bez nazywania marek luksusowych, których nie ma w ofercie.",
      },
      {
        key: "time_saving",
        label: "Oszczędność czasu",
        snippet: "oszczędność czasu w codziennych czynnościach — mniej trudu, więcej efektu",
        hint: "Konkretne minuty lub porównania tylko jeśli wynikają z cech lub testów.",
      },
      {
        key: "space_saving",
        label: "Oszczędność miejsca",
        snippet: "mniej miejsca na półce lub w pokoju — funkcjonalny układ bez chaosu",
        hint: "Gabaryty i pojemność tylko z cech — bez wymyślania metrażu i mebli użytkownika.",
      },
      {
        key: "versatile",
        label: "Uniwersalność",
        snippet: "uniwersalność: wiele zastosowań lub trybów pracy w jednym produkcie",
        hint: "Wypisz tryby z cech — bez dopisywania zastosowań „na dokładkę”.",
      },
      {
        key: "safety",
        label: "Bezpieczeństwo",
        snippet: "bezpieczeństwo: certyfikaty, zgodność i spokój przy codziennym użytkowaniu",
        hint: "Normy, symbole i klasy tylko jeśli podane — bez mielenia przepisów z pamięci.",
      },
      {
        key: "hygiene",
        label: "Łatwa higiena",
        snippet: "łatwe utrzymanie czystości i higieny — mniej zabrudzeń, prostsze mycie lub konserwacja",
        hint: "Materiały i zalecenia pielęgnacji tylko z cech — bez obietnic sterylności bez podstaw.",
      },
      {
        key: "innovation",
        label: "Nowoczesność",
        snippet: "nowoczesna technologia i rozwiązania z wyższej półki — przyszłościowy standard",
        hint: "„Nowoczesne” uzasadnij opisem technicznym z cech — nie sloganem bez pokrycia.",
      },
      {
        key: "smart_features",
        label: "Wygodne funkcje",
        snippet: "przemyślane funkcje i wygodne sterowanie — mniej zbędnych kroków w codziennym użyciu",
        hint: "Lista funkcji z cech lub instrukcji — bez obietnic o aplikacjach i integracjach, których nie ma.",
      },
      {
        key: "complete",
        label: "Komplet",
        snippet: "kompletny zestaw: wszystko potrzebne do startu w jednym opakowaniu",
        hint: "Spis zawartości i akcesoria tylko z cech — bez obietnic o gratisach.",
      },
      {
        key: "compatible",
        label: "Kompatybilność",
        snippet: "dopasowanie do popularnych standardów lub akcesoriów — mniej problemów z zestawem",
        hint: "Normy, gwinty, wtyczki i wersje tylko z cech — bez obietnic „pasuje do wszystkiego”.",
      },
      {
        key: "quiet",
        label: "Cicha praca",
        snippet: "cicha lub dyskretna praca — mniej hałasu i większy komfort akustyczny w domu",
        hint: "Decybele, klasy i porównania tylko jeśli są w specyfikacji.",
      },
      {
        key: "lightweight",
        label: "Lekki / poręczny",
        snippet: "lekka lub poręczna konstrukcja — wygodniej w dłoni, w torbie i w ruchu",
        hint: "Masa i wymiary tylko z cech — bez porównań z konkurencją bez liczb.",
      },
      {
        key: "precision",
        label: "Precyzja wykonania",
        snippet: "precyzja wykonania i stabilność działania — mniej luzów i przypadkowych odstępstw",
        hint: "Tolerancje i testy tylko jeśli są w danych — bez obietnic laboratoryjnych bez pokrycia.",
      },
      {
        key: "energy_efficient",
        label: "Niskie zużycie energii",
        snippet: "rozsądne zużycie energii lub paliwa — niższe koszty eksploatacji przy codziennym użyciu",
        hint: "Klasy energetyczne i zużycie tylko z etykiety lub cech — bez wyliczania rachunków rocznych z niczego.",
      },
      {
        key: "repairable",
        label: "Serwis / części",
        snippet: "możliwość serwisu lub dostępność części — dłuższe życie produktu przy rozsądnej pielęgnacji",
        hint: "Informacje o serwisie tylko jeśli wynikają z oferty — bez obietnic o czasie naprawy.",
      },
      {
        key: "natural",
        label: "Naturalne materiały",
        snippet: "naturalne materiały lub stonowany skład — przyjemniejszy kontakt i świadomy wybór",
        hint: "Skład i certyfikaty tylko z cech — bez obietnic „100% naturalne” bez podstaw.",
      },
      {
        key: "professional",
        label: "Dla wymagających",
        snippet: "dla bardziej wymagających użytkowników: wyższa klasa wykonania i powtarzalność rezultatu",
        hint: "Bez deprecjonowania amatorów — kąt „pro” tylko gdy produkt to realnie uzasadnia.",
      },
      {
        key: "beginner",
        label: "Dla początkujących",
        snippet: "przyjazny pierwszym krokom: jasne zasady, mniejsza bariera wejścia i szybszy pierwszy sukces",
        hint: "Bez obietnic „zero nauki” — chyba że produkt to realnie prosty (np. zestaw startowy).",
      },
      {
        key: "family_safe",
        label: "Bezpieczne przy dzieciach",
        snippet: "bezpieczny kontakt z dziećmi w domu: stabilność, zaokrąglenia i rozsądne ostrzeżenia z instrukcji",
        hint: "Wiek i zastosowanie tylko z cech lub norm — bez obietnic „bezpieczne dla każdego wieku”.",
      },
      {
        key: "sensitive_skin",
        label: "Do wrażliwej skóry",
        snippet: "delikatny profil dla wrażliwej skóry — mniej podrażnień przy regularnym użytkowaniu",
        hint: "Stwierdzenia hipoalergiczne i testy tylko jeśli są w opisie — bez diagnozowania alergii.",
      },
      {
        key: "weather_resist",
        label: "Odporność na pogodę",
        snippet: "odporność na deszcz, wilgoć lub kurz — spokój w typowych warunkach użytkowania",
        hint: "Klasy IP, normy i testy tylko z cech — bez obietnic o zanurzeniu i ekstremach.",
      },
      {
        key: "breathable",
        label: "Oddychalność",
        snippet: "lepsza cyrkulacja i komfort termiczny — mniej „pocenia się” i dyskomfortu przy dłuższym użytku",
        hint: "Materiały i certyfikaty tylko z cech — bez obietnic medycznych.",
      },
      {
        key: "adjustable",
        label: "Regulacja / dopasowanie",
        snippet: "regulacja i dopasowanie do sylwetki, stanowiska lub preferencji — wygodniej na dłużej",
        hint: "Zakres regulacji i jednostki tylko z cech — bez wymyślania rozmiarów użytkownika.",
      },
      {
        key: "modular",
        label: "Modułowość",
        snippet: "modułowa budowa lub rozbudowa o akcesoria — elastyczny zestaw na przyszłość",
        hint: "Kompatybilność i akcesoria tylko z cech — bez obietnic o gratisach i przyszłych kolekcjach.",
      },
      {
        key: "wireless",
        label: "Bezprzewodowe",
        snippet: "bezprzewodowa wygoda — mniej plątaniny kabli i większa swoboda użytkowania",
        hint: "Zasięg, czas pracy na baterii i standardy łączności tylko z cech.",
      },
      {
        key: "fast_charging",
        label: "Szybkie ładowanie",
        snippet: "krótszy czas do gotowości — wygodniej przy codziennym tempie dnia",
        hint: "Waty, czasy i standardy tylko z cech — bez porównań z konkurencją bez liczb.",
      },
      {
        key: "recycled",
        label: "Recykling / mniej odpadów",
        snippet: "materiały z recyklingu lub mniejszy ślad opakowaniowy — świadomiejszy wybór",
        hint: "Procenty i certyfikaty tylko jeśli podane — bez zielonego PR-u bez pokrycia.",
      },
      {
        key: "eu_made",
        label: "Produkcja UE",
        snippet: "produkcja w UE lub europejskie standardy jakości — przejrzystość i spójne oczekiwania",
        hint: "Kraj i certyfikaty tylko z cech — bez obietnic „unijnych” bez podstaw w danych.",
      },
      {
        key: "gift_ready",
        label: "Ładne opakowanie",
        snippet: "estetyczne opakowanie i przyjemne wrażenie z rozpakowania — gotowe pod prezent lub półkę",
        hint: "Opis opakowania tylko z cech — bez obietnic o gratisowych torebkach.",
      },
      {
        key: "scratch_resist",
        label: "Odporność na zarysowania",
        snippet: "odporność na zarysowania i ślady codziennego użytku — dłużej schludny wygląd",
        hint: "Twardość powłok i testy tylko z cech — bez obietnic „nie porysuje się nigdy”.",
      },
      {
        key: "stable",
        label: "Stabilność",
        snippet: "stabilna konstrukcja i pewne podstawienie — mniej przypadkowych przechyłów i stresu",
        hint: "Obciążenia i montaż tylko z cech — bez wymyślania podłoża i podłogi użytkownika.",
      },
      {
        key: "uv_protection",
        label: "Ochrona UV",
        snippet: "ochrona przed promieniowaniem UV — spokojniej przy wystawieniu na słońce",
        hint: "Filtry, UPF i normy tylko z cech — bez obietnic zdrowotnych.",
      },
      {
        key: "low_maintenance",
        label: "Mało konserwacji",
        snippet: "niewiele zabiegów konserwacyjnych — prostsza codzienna pielęgnacja produktu",
        hint: "Częstotliwość i środki tylko z cech — bez obietnic „zero pielęgnacji” bez podstaw.",
      },
      {
        key: "stackable",
        label: "Możliwość układania",
        snippet: "łatwe przechowywanie w zestawie: układanie w stos lub wspólny organizer",
        hint: "Wymiary i kompatybilność zestawów tylko z cech — bez obietnic o dowolnym układzie.",
      },
    ],
  },
]

const PRODUCT_NAME_CHIP_HINTS: { re: RegExp; keys: string[] }[] = [
  { re: /koszulk|t-?shirt|bluzk|spodni|sukien|marynark|kurt|swetr|bluz|spódnic/i, keys: ["mat", "size", "col", "care"] },
  { re: /but|sanda|obuw|kozak|trampk/i, keys: ["size", "mat", "col", "care", "use"] },
  {
    re: /laptop|telefon|słuchawk|monitor|mysz|klawiatur|tablet|smartwatch/i,
    keys: ["ean", "sku", "weight", "dims", "warranty", "unique", "use", "prod", "gram"],
  },
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
  // Moda damska / damskie
  moda_damska: ["mat", "size", "col", "care", "prod"],
  kobiece: ["mat", "size", "col", "care", "prod"],
  sukienki: ["mat", "size", "col", "care", "prod"],
  bluzki: ["mat", "size", "col", "care", "prod"],
  spodnie_damskie: ["mat", "size", "col", "care", "prod"],
  // Moda meska / meskie
  moda_meska: ["mat", "size", "col", "care", "prod"],
  koszule: ["mat", "size", "col", "care", "prod"],
  spodnie_meskie: ["mat", "size", "col", "care", "prod"],
  // Moda dziecieca
  moda_dziecieca: ["mat", "size", "col", "care", "prod"],
  dzieci: ["mat", "size", "col", "care", "prod"],
  niemowl: ["mat", "size", "col", "care", "prod"],
  // Ogólna odzież
  bielizna: ["mat", "size", "col", "care", "prod"],
  akcesoria_modowe: ["mat", "size", "col", "care", "use"],
  odziez: ["mat", "size", "col", "care", "prod"],
  odzież: ["mat", "size", "col", "care", "prod"],
  ubrania: ["mat", "size", "col", "care", "prod"],
  textile: ["mat", "size", "col", "care", "prod"],
  // Obuwie
  obuwie: ["size", "mat", "col", "care", "use"],
  buty: ["size", "mat", "col", "care", "use"],
  sneakers: ["size", "mat", "col", "care", "use"],
  // Elektronika
  elektronika: ["ean", "sku", "weight", "dims", "warranty", "unique", "use", "prod", "gram"],
  komputer: ["ean", "sku", "dims", "weight", "warranty", "unique", "prod"],
  telefon: ["ean", "sku", "dims", "weight", "warranty", "unique", "prod"],
  agd: ["ean", "sku", "dims", "weight", "warranty", "unique", "use", "prod"],
  rtv: ["ean", "sku", "dims", "weight", "warranty", "unique", "use", "prod"],
  // Dom i ogród
  dom: ["mat", "gram", "size", "col", "use", "care"],
  kuchnia: ["mat", "gram", "dims", "use", "care", "prod"],
  meble: ["mat", "dims", "weight", "col", "use", "warranty"],
  ogrod: ["mat", "dims", "use", "care", "prod"],
  // Sport i fitness
  sport: ["mat", "size", "use", "care", "gram"],
  fitness: ["mat", "size", "use", "care", "weight"],
  outdoor: ["mat", "size", "use", "care", "warranty"],
  // Uroda i pielęgnacja
  uroda: ["use", "care", "prod", "unique", "gram"],
  kosmetyki: ["use", "care", "prod", "unique", "gram"],
  pielegnacja: ["use", "care", "prod", "unique", "gram"],
  perfumy: ["gram", "prod", "unique", "use"],
  // Zdrowie
  zdrowie: ["use", "care", "prod", "unique", "gram"],
  suplementy: ["gram", "use", "care", "prod", "unique"],
  // Zabawki
  zabawki: ["use", "size", "warranty", "prod", "mat"],
  gry: ["use", "age", "warranty", "prod"],
  // Motoryzacja
  motoryzacja: ["use", "warranty", "unique", "prod", "mat"],
  auto: ["use", "warranty", "unique", "prod", "ean"],
  // Narzędzia / majsterkowanie
  narzedzia: ["use", "warranty", "dims", "weight", "prod"],
  // Książki / media
  ksiazki: ["prod", "unique", "use"],
  ksiazka: ["prod", "unique", "use"],
  // Zwierzęta
  zwierzeta: ["use", "gram", "care", "prod", "unique"],
  pupil: ["use", "gram", "care", "prod"],
}

function getChipOrder(category: string): string[] {
  const cat = category.toLowerCase()
  for (const [keyword, order] of Object.entries(CATEGORY_CHIP_PRIORITY)) {
    if (cat.includes(keyword)) return order
  }
  return []
}

/** Gdy kategoria nie mapuje się na listę — pierwsze pola ogólne pod „kluczowe dla kategorii”. */
const DEFAULT_PRIORITY_CHIP_KEYS = [
  "mat",
  "size",
  "col",
  "use",
  "weight",
  "dims",
  "compat",
  "ean",
] as const

/** Chipy cech szczegolnie wazne per platforma (np. EAN na Allegro, waga przy wysylce). */
const PLATFORM_CHIP_PRIORITY: Record<string, string[]> = {
  allegro: ["ean", "sku", "mat", "size", "col", "weight", "dims", "compat"],
  amazon: ["ean", "sku", "weight", "dims", "compat", "unique", "prod", "mat"],
  etsy: ["mat", "col", "size", "unique", "care", "prod"],
  shopify: ["ean", "sku", "weight", "dims", "compat", "mat", "col"],
  woocommerce: ["ean", "sku", "weight", "dims", "compat", "mat", "col"],
  ebay: ["state", "ean", "sku", "weight", "dims", "mat", "unique", "compat"],
  vinted: ["state", "mat", "size", "col", "care", "unique"],
  olx: ["state", "mat", "size", "col", "unique", "dims"],
  empikplace: ["ean", "sku", "mat", "unique", "prod", "compat"],
}

function getPriorityChipKeysForCategory(category: string): string[] {
  const o = getChipOrder(category)
  return o.length > 0 ? o : [...DEFAULT_PRIORITY_CHIP_KEYS]
}

const RECOMMENDED_INSERT_SLICE = 7

/** Kolejność: pierwsze N z priorytetu kategorii (lub domyślne), potem brakujące sugestie z nazwy — bez duplikatów. */
function getRecommendedMissingChipKeys(
  category: string,
  productName: string
): string[] {
  const baseOrder = getChipOrder(category)
  const keysFromPriority = (
    baseOrder.length > 0 ? baseOrder : [...DEFAULT_PRIORITY_CHIP_KEYS]
  ).slice(0, RECOMMENDED_INSERT_SLICE)
  const suggested = getSuggestedChipKeysFromProductName(productName)
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const k of keysFromPriority) {
    if (!seen.has(k)) {
      seen.add(k)
      ordered.push(k)
    }
  }
  for (const k of suggested) {
    if (!seen.has(k)) {
      seen.add(k)
      ordered.push(k)
    }
  }
  return ordered
}

function sortChipsByCategory(chips: SuggestionChip[], category: string): SuggestionChip[] {
  const priorityOrder = getChipOrder(category)
  if (priorityOrder.length === 0) return chips
  return [...chips].sort((a, b) => {
    const aIdx = priorityOrder.indexOf(a.key)
    const bIdx = priorityOrder.indexOf(b.key)
    if (aIdx === -1 && bIdx === -1) return 0
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })
}

/** Jednolity system podpowiedzi w generatorze — dark premium, czytelność, subtelny emerald */
const HUB_TOOLTIP_CLASS =
  "max-w-[240px] rounded-lg border border-emerald-500/20 bg-gray-950/98 px-3 py-2 text-[13px] leading-snug text-gray-50 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl [&_p]:m-0 [&_p]:leading-relaxed"
const HUB_TOOLTIP_ARROW = "bg-gray-950 fill-gray-950"
const HUB_INFO_TRIGGER =
  "inline-flex cursor-help rounded-md p-0.5 text-muted-foreground/55 transition-colors hover:bg-white/5 hover:text-emerald-400/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const FEATURES_PLACEHOLDER =
  "Np. wymiary, konstrukcja, zestaw — jedna linia na cechę. Typ, marka itd. edytujesz w polach pod zdjęciem. Szablony: rozwiń „Szablony cech” niżej."

const FEATURES_EXAMPLE_LINES = `Materiał: 95% bawełna, 5% elastan
Rozmiary: S, M, L, XL
Kolory: czarny, biały, granatowy
Miary i pojemność: 200 g/m² (tkanina) / 500 ml / 250 g netto — dopisz z etykiety
Kompatybilność: iPhone 15 / MagSafe
EAN: 5901234567890
Waga: 450 g
Wymiary produktu: 25 × 18 × 6 cm
Zastosowanie: na co dzień, do biura`

export type DescriptionWizardStep = 1 | 2 | 3

const WIZARD_STEP_LABELS = ["Platforma", "Dane produktu", "Ustawienia generacji"] as const

const PLATFORM_WIZARD_GROUP_ORDER: PlatformGroupId[] = ["marketplace", "store", "universal"]

/** Jedna linia pod nazwą kafelka — szybka orientacja bez tooltipów. */
const PLATFORM_TILE_HINTS: Record<string, string> = {
  allegro: "Marketplace PL · HTML · parametry w ofercie",
  amazon: "Globalny · bullet points + opis HTML",
  shopify: "Sklep SaaS · SEO · karta produktu",
  woocommerce: "WordPress/Woo · krótki + długi HTML",
  ebay: "Aukcje · tytuł 80 zn. · opis HTML",
  etsy: "Handmade · plain text · 13 tagów",
  vinted: "C2C · plain text · hashtagi",
  empikplace: "Marketplace · HTML · parametry",
  olx: "Ogłoszenia · plain text",
  ogolny: "Szablon HTML · limity uniwersalne",
  ogolny_plain: "Tylko tekst · bez HTML",
}

type Props = {
  wizardStep: DescriptionWizardStep
  setWizardStep: (step: DescriptionWizardStep) => void
  productName: string
  setProductName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  features: string
  setFeatures: Dispatch<SetStateAction<string>>
  platform: string
  setPlatform: (v: string) => void
  tone: string
  setTone: (v: string) => void
  listingEmojis: boolean
  setListingEmojis: (v: boolean) => void
  listingIntent: string
  setListingIntent: Dispatch<SetStateAction<string>>
  descriptionImageUrls: string
  setDescriptionImageUrls: Dispatch<SetStateAction<string>>
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
  refineNotes?: string
  setRefineNotes?: Dispatch<SetStateAction<string>>
  onListingAudit?: () => void | Promise<void>
  listingAuditLoading?: boolean
  listingAudit?: ListingAuditResult | null
  result: GenerateResponse | null
  error: string
  creditsRemaining: number
  productImages: ProductImageEntry[]
  onAddProductImages: (files: FileList | null) => void
  onRemoveProductImage: (id: string) => void
  imageAnalysis: ProductImageAnalysis | null
  setImageAnalysis: (v: ProductImageAnalysis | null) => void
  imageAnalyzing: boolean
  onAnalyzeProductImage: () => void | Promise<void>
  onClearProductImageAnalysis: () => void
  /** Vision (analiza zdjęcia w kreatorze) — Pro i Scale. */
  productImageVisionUnlocked: boolean
  /** Zamyka pełnoekranowy wynik / stan generowania i wraca do kreatora. */
  onClearResult?: () => void
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
  wizardStep,
  setWizardStep,
  productName,
  setProductName,
  category,
  setCategory,
  features,
  setFeatures,
  platform,
  setPlatform,
  tone,
  setTone,
  listingEmojis,
  setListingEmojis,
  listingIntent,
  setListingIntent,
  descriptionImageUrls,
  setDescriptionImageUrls,
  useBrandVoice,
  setUseBrandVoice,
  brandVoiceData,
  loading,
  loadingStep,
  loadingMessages,
  handleGenerate,
  handleRefineQuality: handleRefineQualityProp,
  refineAlreadyUsed = false,
  refineNotes = "",
  setRefineNotes: setRefineNotesProp,
  onListingAudit: onListingAuditProp,
  listingAuditLoading = false,
  listingAudit = null,
  result,
  error,
  creditsRemaining,
  productImages,
  onAddProductImages,
  onRemoveProductImage,
  imageAnalysis,
  setImageAnalysis,
  imageAnalyzing,
  onAnalyzeProductImage,
  onClearProductImageAnalysis,
  productImageVisionUnlocked,
  onClearResult,
}: Props) {
  const [showPlatformHint, setShowPlatformHint] = useState(false)
  const platformHintAnchorRef = useRef<HTMLDivElement>(null)
  const platformHintHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [platformHintFixed, setPlatformHintFixed] = useState<{ top: number; left: number } | null>(null)

  const updatePlatformHintFixed = useCallback(() => {
    const el = platformHintAnchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const w = 256
    setPlatformHintFixed({
      top: r.bottom + 8,
      left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
    })
  }, [])

  const openPlatformHint = useCallback(() => {
    if (platformHintHideTimerRef.current) {
      clearTimeout(platformHintHideTimerRef.current)
      platformHintHideTimerRef.current = null
    }
    updatePlatformHintFixed()
    setShowPlatformHint(true)
  }, [updatePlatformHintFixed])

  const scheduleClosePlatformHint = useCallback(() => {
    if (platformHintHideTimerRef.current) clearTimeout(platformHintHideTimerRef.current)
    platformHintHideTimerRef.current = setTimeout(() => {
      setShowPlatformHint(false)
      platformHintHideTimerRef.current = null
    }, 100)
  }, [])

  const cancelClosePlatformHint = useCallback(() => {
    if (platformHintHideTimerRef.current) {
      clearTimeout(platformHintHideTimerRef.current)
      platformHintHideTimerRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    if (!showPlatformHint) return
    updatePlatformHintFixed()
    const sync = () => updatePlatformHintFixed()
    window.addEventListener("scroll", sync, true)
    window.addEventListener("resize", sync)
    return () => {
      window.removeEventListener("scroll", sync, true)
      window.removeEventListener("resize", sync)
    }
  }, [showPlatformHint, updatePlatformHintFixed])

  useEffect(() => {
    return () => {
      if (platformHintHideTimerRef.current) clearTimeout(platformHintHideTimerRef.current)
    }
  }, [])
  const [listingIntentGroupOpen, setListingIntentGroupOpen] = useState<Record<string, boolean>>({})
  const [listingIntentChipQuery, setListingIntentChipQuery] = useState("")
  /** Szablony cech: domyślnie zwinięte — użytkownik otwiera ręcznie. */
  const [featuresTemplatesOpen, setFeaturesTemplatesOpen] = useState(false)
  const [listingIntentEditorOpen, setListingIntentEditorOpen] = useState(true)
  const [listingIntentIdeasOpen, setListingIntentIdeasOpen] = useState(false)
  const daneProduktuSectionRef = useRef<HTMLElement>(null)
  const hubScrollRef = useRef<HTMLDivElement>(null)
  const platformStepSummaryRef = useRef<HTMLDivElement>(null)
  const platformScrollPrimed = useRef(false)

  const scrollWizardToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
    requestAnimationFrame(() => {
      hubScrollRef.current?.scrollTo({ top: 0, behavior: "auto" })
    })
  }, [])
  const productNameInputRef = useRef<HTMLInputElement>(null)
  const featuresRef = useRef<HTMLTextAreaElement>(null)
  const latestFeaturesRef = useRef(features)
  latestFeaturesRef.current = features

  const nameMax = 200
  const featMax = 6000
  const intentMax = 400
  const imgLinksMax = 8000
  const namePct = charBarPct(productName.length, nameMax)
  const featPct = charBarPct(features.length, featMax)
  const intentPct = charBarPct(listingIntent.length, intentMax)
  const combinedFeaturesContext = useMemo(() => features.trim(), [features])
  const canGenerate = Boolean(
    !loading &&
      (productName.trim() ||
        features.trim() ||
        descriptionImageUrls.trim() ||
        productImages.length > 0)
  )

  const handleApplyImageAnalysis = useCallback(() => {
    if (!imageAnalysis) return
    const name = imageAnalysis.detectedProductName.trim()
    if (name) setProductName(name)
    setFeatures(formatProductImageAnalysisForFeaturesField(imageAnalysis, platform))
    toast.success("Przeniesiono nazwę i szczegóły — podstawowe pola pod panelem zdjęcia, reszta w polu Cechy.")
  }, [imageAnalysis, platform, setProductName, setFeatures])

  useLayoutEffect(() => {
    const el = featuresRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }, [features])

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
  const priorityChipKeys = useMemo(() => getPriorityChipKeysForCategory(category), [category])
  const priorityFilledCount = useMemo(() => {
    let n = 0
    for (const k of priorityChipKeys) {
      const chip = SUGGESTION_CHIPS.find((c) => c.key === k)
      if (chip && chipSectionFilled(features, chip)) n += 1
    }
    return n
  }, [features, priorityChipKeys])
  const priorityTotal = priorityChipKeys.length
  const priorityPct = useMemo(
    () => Math.min(100, Math.round((priorityFilledCount / Math.max(1, priorityTotal)) * 100)),
    [priorityFilledCount, priorityTotal]
  )

  const suggestedChipKeys = useMemo(
    () => getSuggestedChipKeysFromProductName(productName),
    [productName]
  )
  const recommendedChipKeys = useMemo(() => {
    const base = getRecommendedMissingChipKeys(category, productName)
    const platformExtra = PLATFORM_CHIP_PRIORITY[platform] ?? []
    const seen = new Set(base)
    const merged = [...base]
    for (const k of platformExtra) {
      if (!seen.has(k)) {
        seen.add(k)
        merged.push(k)
      }
    }
    return merged
  }, [category, productName, platform])
  const chipOrderIndex = useMemo(
    () => new Map(sortedChips.map((c, i) => [c.key, i])),
    [sortedChips]
  )
  const visibleChips = useMemo(() => {
    return [...sortedChips].sort((a, b) => {
      const sa = suggestedChipKeys.has(a.key) ? 0 : 1
      const sb = suggestedChipKeys.has(b.key) ? 0 : 1
      if (sa !== sb) return sa - sb
      const fa = chipSectionFilled(features, a) ? 1 : 0
      const fb = chipSectionFilled(features, b) ? 1 : 0
      if (fa !== fb) return fa - fb
      return (chipOrderIndex.get(a.key) ?? 0) - (chipOrderIndex.get(b.key) ?? 0)
    })
  }, [sortedChips, features, suggestedChipKeys, chipOrderIndex])
  const highlightedChipKeySet = useMemo(() => new Set(recommendedChipKeys), [recommendedChipKeys])
  const chipSections = useMemo(() => {
    const highlighted = visibleChips.filter(
      (chip) =>
        highlightedChipKeySet.has(chip.key) &&
        !chipSectionFilled(features, chip) &&
        !FEATURE_CHIP_KEYS_NO_PRIORITY_STRIP.has(chip.key)
    )
    const highlightedKeys = new Set(highlighted.map((chip) => chip.key))
    const rest = visibleChips.filter((chip) => !highlightedKeys.has(chip.key))
    const assigned = new Set<string>()
    const sections = FEATURE_CHIP_GROUPS.map((group) => {
      const chips = rest.filter((chip) => group.keys.includes(chip.key))
      for (const chip of chips) assigned.add(chip.key)
      return { ...group, chips }
    }).filter((group) => group.chips.length > 0)
    const extra = rest.filter((chip) => !assigned.has(chip.key))
    return { highlighted, sections, extra }
  }, [visibleChips, highlightedChipKeySet, features])
  const [featureChipGroupOpen, setFeatureChipGroupOpen] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(FEATURE_CHIP_GROUPS.map((group) => [group.id, false])),
    highlighted: false,
  }))
  useEffect(() => {
    setFeatureChipGroupOpen((prev) => {
      let changed = false
      const next = { ...prev }
      for (const group of chipSections.sections) {
        if (next[group.id] === undefined) {
          next[group.id] = false
          changed = true
        }
      }
      if (chipSections.highlighted.length > 0 && next.highlighted === undefined) {
        next.highlighted = false
        changed = true
      }
      if (chipSections.extra.length > 0 && next.extra === undefined) {
        next.extra = false
        changed = true
      }
      return changed ? next : prev
    })
  }, [chipSections.sections, chipSections.extra.length, chipSections.highlighted.length])
  const toggleFeatureChipGroup = useCallback((groupId: string) => {
    setFeatureChipGroupOpen((prev) => ({ ...prev, [groupId]: !(prev[groupId] ?? false) }))
  }, [])
  const chipScrollRef = useRef<HTMLDivElement>(null)
  const [chipScrollEdges, setChipScrollEdges] = useState({
    left: false,
    right: false,
    overflow: false,
  })
  const updateChipScrollEdges = useCallback(() => {
    const el = chipScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth > clientWidth + 1
    setChipScrollEdges({
      left: overflow && scrollLeft > 4,
      right: overflow && scrollLeft + clientWidth < scrollWidth - 4,
      overflow,
    })
  }, [])
  useLayoutEffect(() => {
    updateChipScrollEdges()
    const el = chipScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateChipScrollEdges())
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateChipScrollEdges, visibleChips.length])
  useEffect(() => {
    window.addEventListener("resize", updateChipScrollEdges)
    return () => window.removeEventListener("resize", updateChipScrollEdges)
  }, [updateChipScrollEdges])
  const platformProfile = useMemo(() => getPlatformProfile(platform), [platform])

  useEffect(() => {
    if (wizardStep !== 1) return
    if (!platformScrollPrimed.current) {
      platformScrollPrimed.current = true
      return
    }
    platformStepSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [platform, wizardStep])
  const selectedPlatformLabel = useMemo(
    () => PLATFORMS.find((p) => p.value === platform)?.label ?? platform,
    [platform]
  )
  const platformStepBannerHint = useMemo(() => getPlatformStepBannerHint(platform), [platform])
  const platformBannerLogoSrc = PLATFORM_BANNER_LOGO_SRC[platform]
  /**
   * Tryb pola „Grafiki w opisie":
   * - "embed"   → platforma HTML, wolno osadzać <img> (Allegro, Shopify, WooCommerce, Empik, Ogólny, Amazon)
   * - "warn"    → platforma HTML, ale regulamin zabrania zewnętrznych obrazów (eBay)
   * - "context" → platforma plain text, linki to tylko kontekst dla AI (Etsy, Vinted, OLX, Ogólny tekst)
   */
  const descImgMode = useMemo((): "embed" | "warn" | "context" => {
    if (platform === "ebay") return "warn"
    if (platformProfile.descriptionFormat !== "html") return "context"
    return "embed"
  }, [platform, platformProfile.descriptionFormat])
  const descImgEmbedCap = useMemo(() => getDescriptionImageEmbedCap(platform), [platform])
  const smartTitleTrimmingActive = useMemo(
    () => needsSmartTitleTrimming(productName, platformProfile.titleMaxChars),
    [productName, platformProfile.titleMaxChars]
  )
  const categoryProductHint = useMemo(
    () => getCategoryProductNameHint(productName, category, combinedFeaturesContext),
    [productName, category, combinedFeaturesContext]
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

  const applyFeatureChipLine = useCallback(
    (chip: SuggestionChip, valueAfterColon: string) => {
      const next = replaceFeatureChipLine(latestFeaturesRef.current, chip, valueAfterColon)
      setFeatures(next)
      setTimeout(() => {
        const el = featuresRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(next.length, next.length)
      }, 0)
    },
    [setFeatures]
  )

  const renderFeatureChip = useCallback((chip: SuggestionChip) => {
    const used = chipExistsIn(features, chip)
    const filled = chipSectionFilled(features, chip)
    const suggested = suggestedChipKeys.has(chip.key)
    const chipClassName = cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all hover:scale-[1.02]",
      filled
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : used
          ? "border-amber-500/35 bg-amber-500/8 text-amber-100"
          : suggested
            ? "border-cyan-500/40 bg-cyan-500/5 text-cyan-100 ring-1 ring-cyan-500/25"
            : "border-white/10 bg-white/3 text-muted-foreground hover:border-cyan-500/30 hover:bg-emerald-500/10 hover:text-emerald-100"
    )
    const presets = SUGGESTION_CHIP_PRESETS[chip.key]
    if (presets?.length) {
      return (
        <FeatureChipPresetDropdown
          key={chip.key}
          chip={chip}
          presets={presets}
          used={used}
          filled={filled}
          suggested={suggested}
          chipClassName={chipClassName}
          ariaLabel={`${chipButtonAriaLabel(chip, filled, used)} Otwórz listę gotowych wartości.`}
          onApplySelectedValues={(values) => applyFeatureChipLine(chip, values.join(", "))}
          onRemoveInsert={() => insertChip(chip)}
        />
      )
    }
    return (
      <Tooltip key={chip.key}>
        <TooltipTrigger asChild>
          <motion.button
            layout
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            type="button"
            aria-label={chipButtonAriaLabel(chip, filled, used)}
            onClick={() => insertChip(chip)}
            className={chipClassName}
          >
            <chip.Icon
              className={cn(
                "h-3 w-3",
                filled
                  ? "text-emerald-400"
                  : used
                    ? "text-amber-400"
                    : suggested
                      ? "text-cyan-400"
                      : "text-cyan-400/75"
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
  }, [features, suggestedChipKeys, applyFeatureChipLine, insertChip])

  const toggleListingIntentSnippet = useCallback(
    (snippet: string) => {
      const add = snippet.trim()
      if (!add) return
      setListingIntent((prev) => {
        const t = prev.trim()
        const tl = t.toLowerCase()
        const al = add.toLowerCase()
        if (tl.includes(al)) {
          return removeListingIntentSnippetFromText(prev, add)
        }
        if (!t) return add.slice(0, intentMax)
        const next = `${t}${LISTING_INTENT_SEGMENT_SEP}${add}`
        return next.length <= intentMax ? next : next.slice(0, intentMax)
      })
    },
    [setListingIntent, intentMax]
  )

  const filteredListingIntentGroups = useMemo(() => {
    const q = listingIntentChipQuery.trim().toLowerCase()
    const platformChips = PLATFORM_INTENT_SNIPPETS[platform] ?? []
    const allGroups: ListingIntentGroup[] = [
      ...LISTING_INTENT_GROUPS,
      ...(platformChips.length > 0
        ? [{ id: "platform", title: `Dla ${selectedPlatformLabel}`, chips: platformChips }]
        : []),
    ]
    return allGroups.map((g) => ({
      ...g,
      chips: !q
        ? g.chips
        : g.chips.filter(
            (c) =>
              c.label.toLowerCase().includes(q) ||
              c.snippet.toLowerCase().includes(q) ||
              c.hint.toLowerCase().includes(q)
          ),
    }))
  }, [listingIntentChipQuery, platform, selectedPlatformLabel])

  useEffect(() => {
    const q = listingIntentChipQuery.trim()
    if (!q) return
    setListingIntentGroupOpen((prev) => {
      const next = { ...prev }
      for (const g of filteredListingIntentGroups) {
        if (g.chips.length > 0) next[g.id] = true
      }
      return next
    })
  }, [listingIntentChipQuery, filteredListingIntentGroups])

  const expandAllListingIntentGroups = useCallback(() => {
    const o: Record<string, boolean> = {}
    for (const g of filteredListingIntentGroups) o[g.id] = true
    setListingIntentGroupOpen(o)
  }, [filteredListingIntentGroups])

  const collapseAllListingIntentGroups = useCallback(() => {
    setListingIntentGroupOpen({})
  }, [])

  const listingIntentIdeasPanelContent = (
    <>
      <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground/85">
        Wybierz frazy, które mają wybrzmieć w ofercie. Klik dodaje fragment do pola, ponowne kliknięcie go usuwa.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-400/55"
            aria-hidden
          />
          <input
            id="listingIntent-chip-search"
            type="search"
            value={listingIntentChipQuery}
            onChange={(e) => setListingIntentChipQuery(e.target.value)}
            placeholder="Szukaj gotowej frazy…"
            autoComplete="off"
            className={cn(
              "w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-8 text-xs text-gray-100 shadow-inner placeholder:text-muted-foreground/45 focus:border-emerald-500/55 focus:outline-none focus:ring-2 focus:ring-emerald-500/15",
              listingIntentChipQuery.trim() ? "pr-9" : "pr-3",
            )}
          />
          {listingIntentChipQuery.trim() ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              onClick={() => setListingIntentChipQuery("")}
              aria-label="Wyczyść wyszukiwanie pomysłów"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        {listingIntentChipQuery.trim() ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={expandAllListingIntentGroups}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1.5 text-[10px] font-medium text-emerald-100/90 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/15"
            >
              Rozwiń wszystkie
            </button>
            <button
              type="button"
              onClick={collapseAllListingIntentGroups}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/10 hover:text-emerald-100"
            >
              Zwiń wszystkie
            </button>
          </div>
        ) : null}
      </div>
      {listingIntentChipQuery.trim() &&
      filteredListingIntentGroups.every((g) => g.chips.length === 0) ? (
        <p className="mt-2 text-[10px] text-emerald-200/85">
          Brak dopasowań — spróbuj innej frazy lub wyczyść pole wyszukiwania.
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {filteredListingIntentGroups.map((group) => {
          if (group.chips.length === 0) return null
          const open = listingIntentGroupOpen[group.id] ?? false
          const GroupIcon = LISTING_INTENT_GROUP_ICONS[group.id]
          return (
            <div
              key={group.id}
              className={cn(
                "overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-emerald-500/[0.07] via-black/28 to-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-l-[3px]",
                LISTING_INTENT_GROUP_ACCENT[group.id] ?? "border-l-emerald-500/50",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setListingIntentGroupOpen((p) => ({
                    ...p,
                    [group.id]: !open,
                  }))
                }
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-emerald-500/10 active:bg-emerald-500/12 sm:px-3.5"
                aria-expanded={open}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {GroupIcon ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                      <GroupIcon className="h-4 w-4 text-emerald-300/95" aria-hidden />
                    </span>
                  ) : null}
                  <span className="min-w-0 text-[12px] font-bold leading-snug tracking-tight text-gray-100">
                    {group.title}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="min-w-7 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums text-emerald-100/95">
                    {group.chips.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-emerald-400/70 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key={`${group.id}-panel`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden border-t border-emerald-500/15 bg-emerald-950/15"
                  >
                    <div className="-mx-1 overflow-x-auto px-2 pb-3 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex min-w-min flex-nowrap gap-1.5 md:flex-wrap">
                        {group.chips.map((c) => {
                          const active = listingIntent
                            .toLowerCase()
                            .includes(c.snippet.toLowerCase())
                          return (
                            <Tooltip key={c.key}>
                              <TooltipTrigger asChild>
                                <motion.button
                                  layout
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggleListingIntentSnippet(c.snippet)}
                                  className={cn(
                                    "inline-flex max-w-[min(100vw-4rem,220px)] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug transition-all hover:scale-[1.02] sm:max-w-none",
                                    active
                                      ? "border-emerald-500/45 bg-emerald-500/16 text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                                      : "border-white/10 bg-white/4 text-muted-foreground hover:border-emerald-500/35 hover:bg-emerald-500/10 hover:text-emerald-100",
                                  )}
                                >
                                  <Sparkles className="h-3 w-3 shrink-0 text-emerald-400/85" aria-hidden />
                                  <span className="min-w-0">{c.label}</span>
                                </motion.button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={8}
                                arrowClassName={HUB_TOOLTIP_ARROW}
                                className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,340px)]")}
                              >
                                <p className="font-medium text-gray-100">Wstawi w pole:</p>
                                <p className="mt-1 font-mono text-[12px] text-emerald-200/95">
                                  „{c.snippet}”
                                </p>
                                <p className="mt-2 border-t border-white/10 pt-2 text-[12px] leading-relaxed text-gray-300/95">
                                  {c.hint}{" "}
                                  <span className="text-gray-400/95">
                                    Ponowne kliknięcie usuwa ten fragment z pola.
                                  </span>
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </>
  )

  useEffect(() => {
    if (wizardStep !== 2) return
    const id = window.setTimeout(() => {
      productNameInputRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => clearTimeout(id)
  }, [wizardStep])

  const wizardAriaLabel = `Kreator opisu produktu, krok ${wizardStep} z 3: ${WIZARD_STEP_LABELS[wizardStep - 1]}`

  const showFullPageOutput = loading || result != null

  if (showFullPageOutput) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="w-full min-w-0 space-y-4">
          {/* ── Result page header bar ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Back button — compact, icon-only hint */}
            <button
              type="button"
              onClick={() => {
                if (loading) return
                onClearResult?.()
              }}
              disabled={loading || !onClearResult}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium transition-all duration-200",
                loading || !onClearResult
                  ? "cursor-not-allowed opacity-40"
                  : "text-muted-foreground/80 hover:border-white/20 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              )}
              title={loading ? "Poczekaj na zakończenie generowania" : undefined}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Wróć</span>
            </button>

            {/* Context pills */}
            {!loading && result ? (() => {
              const PlatIcon = PLATFORM_ICONS[platform] ?? Package
              const platColor = PLATFORM_ICON_COLORS[platform]
              const toneLabel = TONES.find((t) => t.value === tone)?.label ?? tone
              const ToneIcon = TONE_ICONS[tone] ?? Sparkles
              const score = result.qualityScore ?? 0
              return (
                <>
                  {/* Platform chip — colored */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground/80 backdrop-blur-sm">
                    <PlatIcon className="h-3.5 w-3.5 shrink-0" style={{ color: platColor }} aria-hidden />
                    {selectedPlatformLabel}
                  </span>

                  {/* Product name chip */}
                  {productName ? (
                    <span className="max-w-[200px] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground/80 backdrop-blur-sm sm:max-w-xs">
                      {productName}
                    </span>
                  ) : null}

                  {/* Tone chip */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground/80 backdrop-blur-sm">
                    <ToneIcon className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" aria-hidden />
                    {toneLabel}
                  </span>

                  {/* Score badge — right side */}
                  <span className="ml-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-sm"
                    style={{
                      borderColor: score >= 80 ? "rgba(16,185,129,0.35)" : score >= 60 ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.35)",
                      background: score >= 80 ? "rgba(16,185,129,0.08)" : score >= 60 ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)",
                      color: score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171",
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ background: score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171" }} />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                        style={{ background: score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171" }} />
                    </span>
                    {score}/100
                  </span>
                </>
              )
            })() : loading ? (
              <span className="text-sm text-muted-foreground/70">Generowanie opisu…</span>
            ) : null}
          </div>

          {loading ? (
            <div className="w-full min-w-0">
              <LivePreviewPanel
                loading={loading}
                loadingStep={loadingStep}
                loadingMessages={loadingMessages}
                result={result}
                error={error || null}
                productName={productName}
                platformSlug={platform}
              />
            </div>
          ) : result ? (
            <div className="w-full min-w-0 space-y-4">
              <DescriptionResult
                result={result}
                productName={productName}
                featuresText={combinedFeaturesContext}
                onRegenerate={() => void handleGenerate()}
                onRefineQuality={handleRefineQualityProp}
                refineAlreadyUsed={refineAlreadyUsed}
                refineNotes={refineNotes}
                onRefineNotesChange={setRefineNotesProp}
                onListingAudit={onListingAuditProp}
                listingAuditLoading={listingAuditLoading}
                listingAudit={listingAudit}
                loading={loading}
                creditsRemaining={creditsRemaining}
              />
            </div>
          ) : null}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left: scrollable form */}
        <div
          ref={hubScrollRef}
          className="scrollbar-hub min-h-0 w-full min-w-0 max-w-full flex-1 space-y-4 overflow-x-hidden overflow-y-auto pb-8 pr-0 lg:max-h-[calc(100vh-11rem)] lg:pr-2"
        >
          <div
            role="group"
            aria-label={wizardAriaLabel}
            className="w-full min-w-0 space-y-3"
          >
            <nav
              aria-label="Postęp kreatora — trzy kroki"
              className="min-w-0 max-w-full rounded-xl border border-[#1a2e1c] bg-[#0a1410] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_24px_-8px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            >
              <div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[#132318]"
                  role="progressbar"
                  aria-valuenow={wizardStep}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-label={`Ukończono ${wizardStep} z 3 kroków`}
                >
                  <div
                    className="h-full rounded-full shadow-[0_0_12px_rgba(34,197,94,0.4)] transition-[width] duration-300 ease-out"
                    style={{ background: "linear-gradient(90deg, #22c55e, #16a34a)", width: `${(100 * wizardStep) / 3}%` }}
                  />
                </div>
              </div>

              <ol className="mt-2 grid list-none grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
                {([1, 2, 3] as const).map((s) => {
                  const active = wizardStep === s
                  const done = wizardStep > s
                  const labelFull = `${s}. ${WIZARD_STEP_LABELS[s - 1]}`

                  if (active) {
                    return (
                      <li
                        key={s}
                        className="min-w-0"
                        aria-current="step"
                      >
                        <span
                          className={cn(
                            "flex min-h-9 w-full items-center justify-center rounded-lg border border-emerald-500/35 bg-[#0f2e1a] px-2 py-2 text-center text-[11px] font-bold leading-tight tracking-wide text-emerald-300 shadow-[0_0_16px_-4px_rgba(34,197,94,0.25),inset_0_1px_0_rgba(255,255,255,0.04)] sm:min-h-0 sm:text-xs"
                          )}
                        >
                          <span className="sm:line-clamp-2">{labelFull}</span>
                        </span>
                      </li>
                    )
                  }

                  if (done) {
                    return (
                      <li key={s} className="min-w-0">
                        <button
                          type="button"
                          aria-label={`Wróć do kroku ${s}: ${WIZARD_STEP_LABELS[s - 1]}`}
                          onClick={() => setWizardStep(s)}
                          className={cn(
                            "flex min-h-9 w-full items-center justify-center rounded-lg border border-[#1a2e1c] bg-[#0a1410] px-2 py-2 text-center text-[11px] font-medium leading-tight tracking-wide text-[#4a7a52] transition-colors sm:min-h-0 sm:text-xs",
                            "hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          )}
                        >
                          <span className="sm:line-clamp-2">{labelFull}</span>
                        </button>
                      </li>
                    )
                  }

                  return (
                    <li key={s} className="min-w-0">
                      <span
                        aria-disabled="true"
                        className={cn(
                          "flex min-h-9 w-full cursor-not-allowed items-center justify-center rounded-lg border border-[#162a1a] bg-[#0a1410]/60 px-2 py-2 text-center text-[11px] font-medium leading-tight text-[#2d4532] sm:min-h-0 sm:text-xs"
                        )}
                      >
                        <span className="sm:line-clamp-2">{labelFull}</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            </nav>

          {wizardStep === 1 ? (
          <motion.section
            layout
            className="relative min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/9 bg-linear-to-br from-white/6 via-white/4 to-cyan-950/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_48px_-28px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 will-change-transform hover:border-white/12 hover:shadow-[0_0_28px_-16px_rgba(16,185,129,0.08)] sm:p-4 md:p-6 lg:p-7"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/3 to-transparent" />
            <div className="pointer-events-none absolute -right-20 -top-24 h-44 w-44 rounded-full bg-cyan-500/5 blur-3xl" aria-hidden />

            <div className="relative z-10 flex w-full flex-col gap-2 text-left">
              <span className="flex items-center gap-2.5">
                <Store className="h-5 w-5 shrink-0 text-cyan-400/90 drop-shadow-[0_0_14px_rgba(34,211,238,0.12)]" />
                <span className="bg-linear-to-r from-white/95 to-gray-500/90 bg-clip-text text-xs font-bold uppercase tracking-[0.28em] text-transparent sm:text-sm lg:text-base">
                  Platforma docelowa
                </span>
              </span>
              <p className="max-w-2xl wrap-break-word text-sm leading-relaxed text-muted-foreground/85 sm:text-base">
                Inteligentnie dopasowujemy limity i reguły AI do specyfiki wybranej platformy — od tytułu po format
                opisu.
              </p>
            </div>

            {(() => {
              const SummaryIcon = PLATFORM_ICONS[platform] ?? Package
              const summaryIconColor = PLATFORM_ICON_COLORS[platform] ?? "currentColor"
              const fmt =
                platformProfile.descriptionFormat === "html"
                  ? "Opis długi: HTML"
                  : "Opis: plain text"
              const hint = PLATFORM_TILE_HINTS[platform] ?? "Profil platformy — limity w promptach AI."
              return (
                <div
                  ref={platformStepSummaryRef}
                  className="relative z-10 mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 shadow-[0_0_0_1px_rgba(52,211,153,0.06),0_8px_32px_-12px_rgba(16,185,129,0.12)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1"
                  role="status"
                  aria-live="polite"
                  title={hint}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/4"
                      aria-hidden
                    >
                      <SummaryIcon
                        className="h-5 w-5"
                        strokeWidth={1.65}
                        style={{ color: summaryIconColor }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-sm font-semibold text-foreground/95">{selectedPlatformLabel}</span>
                        <span className="shrink-0 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.22em] text-emerald-100/95">
                          Wybrana
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground/80 sm:line-clamp-1">
                        {hint}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end sm:pl-2">
                    <span className="rounded-md border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] font-medium tabular-nums text-gray-200/95">
                      Tytuł ≤{platformProfile.titleMaxChars} zn.
                    </span>
                    {platformProfile.charLimits.shortDesc > 0 ? (
                      <span className="rounded-md border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] font-medium tabular-nums text-gray-200/95">
                        Skrót ≤{platformProfile.charLimits.shortDesc} zn.
                      </span>
                    ) : null}
                    <span className="rounded-md border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-gray-200/95">
                      {fmt}
                    </span>
                  </div>
                </div>
              )
            })()}

                  <div className="relative z-10 space-y-4 pt-7 pb-1">
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-100/95">
                        <span>Wybierz platformę</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: platforma docelowa">
                              <Info className="h-3.5 w-3.5" />
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

                      {PLATFORM_WIZARD_GROUP_ORDER.map((groupId) => {
                        const groupPlatforms = PLATFORMS.filter((p) => p.group === groupId)
                        if (groupPlatforms.length === 0) return null
                        return (
                          <div key={groupId} className="space-y-2.5">
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                              {PLATFORM_GROUP_LABELS[groupId]}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
                              {groupPlatforms.map((p) => {
                                const Icon = PLATFORM_ICONS[p.value] ?? Package
                                const iconColor = PLATFORM_ICON_COLORS[p.value] ?? "currentColor"
                                const isActive = platform === p.value
                                const tileHint = PLATFORM_TILE_HINTS[p.value]
                                const universalTile = p.value === "ogolny" || p.value === "ogolny_plain"
                                return (
                                  <button
                                    key={p.value}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => {
                                      setPlatform(p.value)
                                    }}
                                    className={cn(
                                      "group relative flex min-h-[80px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 py-2 text-center transition-all duration-200 ease-out will-change-transform sm:min-h-[92px] sm:gap-1.5 sm:px-2 sm:py-2.5",
                                      "border-white/10 bg-linear-to-br from-white/7 via-white/2 to-transparent",
                                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm",
                                      "hover:border-cyan-400/40 hover:shadow-[0_0_28px_-10px_rgba(34,211,238,0.32),0_0_12px_rgba(255,255,255,0.04)] active:scale-[0.98] sm:hover:scale-[1.03]",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                      isActive
                                        ? "border-emerald-400/55 bg-emerald-500/14 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_6px_28px_-14px_rgba(16,185,129,0.28)] ring-1 ring-emerald-400/30"
                                        : "text-muted-foreground hover:border-cyan-500/25 hover:bg-white/4 hover:text-gray-100"
                                    )}
                                  >
                                    {isActive ? (
                                      <span
                                        className="pointer-events-none absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-linear-to-r from-emerald-400/15 via-emerald-400/80 to-emerald-400/15"
                                        aria-hidden
                                      />
                                    ) : null}
                                    {isActive ? (
                                      <span
                                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 ring-1 ring-emerald-400/40"
                                        aria-hidden
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-100" strokeWidth={2.5} />
                                      </span>
                                    ) : null}
                                    <span
                                      className={cn(
                                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors sm:h-12 sm:w-12",
                                        isActive
                                          ? "border-emerald-400/35 bg-emerald-500/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                                          : universalTile
                                            ? "border-white/15 bg-linear-to-br from-slate-500/25 via-cyan-500/12 to-emerald-500/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] group-hover:border-cyan-400/35"
                                            : "border-white/10 bg-white/6 group-hover:border-cyan-400/25"
                                      )}
                                    >
                                      <Icon
                                        className={cn(
                                          "h-8 w-8 opacity-95 sm:h-9 sm:w-9",
                                          isActive && "drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                                        )}
                                        strokeWidth={1.65}
                                        style={{ color: iconColor }}
                                      />
                                    </span>
                                    <span className="line-clamp-2 px-0.5 text-xs font-semibold leading-tight tracking-wide sm:text-sm">
                                      {p.label}
                                    </span>
                                    {tileHint ? (
                                      <span className="line-clamp-2 max-w-52 px-0.5 text-[8px] font-medium leading-snug text-muted-foreground/75 sm:text-[9px]">
                                        {tileHint}
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {platform === "ogolny" || platform === "ogolny_plain" ? (
                        <div
                          className="mt-1 rounded-2xl border border-cyan-500/25 bg-linear-to-br from-cyan-500/12 via-cyan-500/5 to-transparent px-4 py-3 text-[10px] leading-snug text-cyan-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          role="status"
                        >
                          <div className="flex gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/15">
                              <Lightbulb className="h-4 w-4 text-cyan-200" strokeWidth={2} aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold tracking-wide text-cyan-100/95">Tryb ogólny</p>
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
                          </div>
                        </div>
                      ) : null}
                      <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/6 via-emerald-950/10 to-cyan-950/15 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="flex gap-2.5">
                          <span className="assistant-sparkle-glow relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
                            <Sparkles className="relative z-1 h-4 w-4 text-emerald-300" strokeWidth={2} aria-hidden />
                          </span>
                          <div className="min-w-0 space-y-2">
                            <p className="text-[11px] font-semibold text-emerald-100/95">Asystent AI podpowiada</p>
                            {(platformProfile.uiKeyPoints ?? []).length > 0 ? (
                              <ul className="space-y-1.5 text-[10px] leading-snug text-muted-foreground/90">
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
                            <p className="text-[10px] leading-snug text-muted-foreground/75">
                              Na wynik AI wpływają:{" "}
                              <strong className="font-medium text-muted-foreground/90">platforma</strong>,{" "}
                              <strong className="font-medium text-muted-foreground/90">ton</strong>,{" "}
                              <strong className="font-medium text-muted-foreground/90">nazwa</strong> i{" "}
                              <strong className="font-medium text-muted-foreground/90">cechy do opisu</strong>.
                              Szczegóły limitów są w rozwinięciu pod tym boxem — to tylko podpowiedź, nie zmienia sama w
                              sobie wygenerowanego tekstu.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 border-t border-white/10 pt-3">
                          <button
                            type="button"
                            onClick={togglePlatformDetails}
                            className={cn(
                              "group inline-flex w-full max-w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[10px] font-semibold tracking-wide transition-all duration-200 ease-out sm:w-auto sm:justify-start",
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
                        </div>
                        <AnimatePresence initial={false}>
                          {platformInfoOpen ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden border-t border-white/10 pt-3 will-change-[height,opacity]"
                            >
                              <div className="space-y-3 text-[10px] leading-[1.6] text-muted-foreground/85">
                              <p>
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
                              <ul className="list-inside list-disc space-y-1.5 pl-0.5 text-muted-foreground/75">
                                {platformProfile.uiAccordionBullets.map((line, i) => (
                                  <li key={i}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground/70">
                                {platformProfile.seoNotes}
                              </p>
                            )}
                            {platformProfile.uiOfferComparison?.rows?.length ? (
                              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-2.5 sm:p-3">
                                {platformProfile.uiOfferComparison.caption ? (
                                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90">
                                    {platformProfile.uiOfferComparison.caption}
                                  </p>
                                ) : null}
                                <div className="space-y-2 md:hidden">
                                  {platformProfile.uiOfferComparison.rows.map((row, i) => (
                                    <div
                                      key={i}
                                      className="rounded-lg border border-white/8 bg-black/20 p-2.5"
                                    >
                                      <p className="text-[10px] font-semibold text-cyan-200/95">
                                        {row.element}
                                      </p>
                                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/90">
                                        <span className="font-medium text-zinc-200/95">Co robi AI: </span>
                                        {row.aiDoes}
                                      </p>
                                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/85">
                                        <span className="font-medium text-zinc-200/90">Dlaczego ważne: </span>
                                        {row.why}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                <div className="hidden overflow-x-auto rounded-lg md:block">
                                  <table className="w-full min-w-[520px] border-collapse text-left text-[10px] leading-normal">
                                    <thead>
                                      <tr className="border-b border-cyan-500/25">
                                        <th className="p-3 pr-2 text-left font-bold text-cyan-300/95">
                                          Element oferty
                                        </th>
                                        <th className="p-3 px-2 text-left font-bold text-cyan-300/95">
                                          Co robi AI
                                        </th>
                                        <th className="p-3 pl-2 text-left font-bold text-cyan-300/95">
                                          Dlaczego to ważne
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-muted-foreground/90">
                                      {platformProfile.uiOfferComparison.rows.map((row, i) => (
                                        <tr
                                          key={i}
                                          className={cn(
                                            "border-b border-white/6 last:border-0",
                                            i % 2 === 1 ? "bg-white/[0.035]" : "bg-transparent"
                                          )}
                                        >
                                          <td className="p-3 pr-2 align-top font-medium text-zinc-200/95">
                                            {row.element}
                                          </td>
                                          <td className="p-3 px-2 align-top">{row.aiDoes}</td>
                                          <td className="p-3 pl-2 align-top">{row.why}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : null}
                              </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                  </div>
            <div className="sticky bottom-0 z-20 mt-4 flex justify-end border-t border-white/10 bg-linear-to-t from-background via-background/95 to-background/80 py-3 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setWizardStep(2)
                  scrollWizardToTop()
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(16,185,129,0.35)] transition-all sm:px-6",
                  "bg-linear-to-r from-cyan-500/90 via-teal-600/90 to-emerald-800/95",
                  "hover:brightness-110 hover:shadow-[0_12px_36px_-8px_rgba(34,211,238,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                Dalej
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </motion.section>
          ) : null}

          {wizardStep === 2 ? (
          <motion.section
            ref={daneProduktuSectionRef}
            layout
            className="relative min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#1a2e1c] bg-[#080f0d] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-40px_rgba(0,0,0,0.55)] transition-[transform,box-shadow,border-color] duration-200 will-change-transform hover:-translate-y-px hover:border-emerald-500/20 hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.12)] sm:p-5 md:p-6"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/3 to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-emerald-500/6 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -left-12 h-36 w-36 rounded-full bg-emerald-600/8 blur-3xl" aria-hidden />

                  <div className="relative z-10 space-y-6 pt-0">
                    <div className="relative mb-3 flex items-center gap-3 overflow-hidden rounded-xl border border-[#1a2e1c] bg-[#0d1a0f] py-2.5 pl-4 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                      <div
                        className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-xl bg-linear-to-b from-emerald-400/80 via-emerald-500/50 to-transparent"
                        aria-hidden
                      />
                      {platformBannerLogoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={platformBannerLogoSrc}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-white/5">
                          {(() => {
                            const PlatformMark = PLATFORM_ICONS[platform] ?? Package
                            const markColor = PLATFORM_ICON_COLORS[platform] ?? "currentColor"
                            return (
                              <PlatformMark
                                className="h-4 w-4"
                                strokeWidth={1.65}
                                style={{ color: markColor }}
                                aria-hidden
                              />
                            )
                          })()}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-emerald-300/90">{selectedPlatformLabel}</span>
                      <span className="mx-1.5 text-[11px] text-emerald-500/40" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 flex-1 text-[11px] text-[#5a8a5e]">{platformStepBannerHint}</span>
                      <div
                        ref={platformHintAnchorRef}
                        className="relative ml-auto shrink-0"
                        onMouseEnter={openPlatformHint}
                        onMouseLeave={scheduleClosePlatformHint}
                      >
                        <button
                          type="button"
                          className="-m-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#5a8a5e] transition-colors hover:bg-white/5 hover:text-emerald-300"
                          aria-label="Szczegóły limitów platformy"
                          aria-expanded={showPlatformHint}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        {showPlatformHint &&
                          platformHintFixed &&
                          typeof document !== "undefined" &&
                          createPortal(
                            <div
                              role="tooltip"
                              className="fixed z-[9999] w-64 rounded-xl border border-[#1a2e1c] bg-[#0b1610] p-3.5 text-[11px] leading-relaxed text-[#9ac09e] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]"
                              style={{ top: platformHintFixed.top, left: platformHintFixed.left }}
                              onMouseEnter={cancelClosePlatformHint}
                              onMouseLeave={scheduleClosePlatformHint}
                            >
                              {platformProfile.uiLimitsSummary ?? platformProfile.seoNotes}
                            </div>,
                            document.body
                          )}
                      </div>
                    </div>

                    <ProductImageVisionPanel
                      productImages={productImages}
                      onAddImages={onAddProductImages}
                      onRemoveImage={onRemoveProductImage}
                      imageAnalysis={imageAnalysis}
                      setImageAnalysis={setImageAnalysis}
                      imageAnalyzing={imageAnalyzing}
                      onAnalyzeClick={() => void onAnalyzeProductImage()}
                      onClearClick={onClearProductImageAnalysis}
                      platformSlug={platform}
                      visionUnlocked={productImageVisionUnlocked}
                      userProductName={productName}
                      onApplyVisionProductName={(name) => {
                        setProductName(name)
                        requestAnimationFrame(() => {
                          productNameInputRef.current?.focus({ preventScroll: true })
                        })
                      }}
                    />

                    {productImageVisionUnlocked && imageAnalysis ? (
                      <>
                        <div className="flex items-center gap-3 my-3">
                          <div className="h-px flex-1 bg-emerald-500/10" />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-500/40">
                            Edytuj dane ze zdjęcia
                          </span>
                          <div className="h-px flex-1 bg-emerald-500/10" />
                        </div>
                        <VisionExtractionEditor analysis={imageAnalysis} onChange={setImageAnalysis} />
                      </>
                    ) : null}

                    {productImageVisionUnlocked && imageAnalysis ? (
                      <button
                        type="button"
                        onClick={handleApplyImageAnalysis}
                        id="vision-apply-to-form"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 py-3 text-[13px] font-semibold text-emerald-400 transition-all duration-200 hover:border-emerald-500/35 hover:bg-emerald-500/15 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                      >
                        <ArrowDownToLine className="h-4 w-4" strokeWidth={2} aria-hidden />
                        Wypełnij formularz danymi ze zdjęcia
                      </button>
                    ) : null}

                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-[#0d1a0f] p-4 md:p-5">
                      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                              Start oferty
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
                              <Tag className="h-4 w-4 text-emerald-300/80" aria-hidden />
                            </span>
                            <Label htmlFor="productName" className="text-sm font-semibold text-gray-100">
                              Nazwa produktu
                              <span className="ml-1 text-emerald-400/90">*</span>
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
                            <p>
                              {platform === "allegro" ? (
                                <>
                                  Allegro: tytuł oferty to max {platformProfile.titleMaxChars} znaków — najważniejsze
                                  frazy na początku, bez CAPS i „promocyjnego” spamu w nazwie. Podaj produkt, materiał,
                                  rozmiar, kolor — stąd powstanie tytuł SEO (przy długiej nazwie zadziała Smart Trimming).
                                </>
                              ) : (
                                <>Jak w sklepie: materiał, rozmiar, kolor — stąd powstanie tytuł SEO.</>
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                          </div>
                          <p className="max-w-2xl text-[11px] leading-relaxed text-cyan-50/80">
                            Tu nadajesz kierunek generatorowi: dobra nazwa i trafna kategoria mocno podbijają jakość
                            tytułu, opisu i dopasowania pod {selectedPlatformLabel}.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-gray-200/90">
                            SEO start
                          </span>
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100/90">
                            {selectedPlatformLabel}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/12">
                              <Tag className="h-3.5 w-3.5 text-gray-300/90" aria-hidden />
                            </span>
                            <Label htmlFor="productName" className="text-sm font-semibold text-gray-100">
                              Nazwa produktu
                              <span className="ml-1 text-cyan-400/90">*</span>
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
                            <p>
                              {platform === "allegro" ? (
                                <>
                                  Allegro: tytuł oferty to max {platformProfile.titleMaxChars} znaków — najważniejsze
                                  frazy na początku, bez CAPS i „promocyjnego” spamu w nazwie. Podaj produkt, materiał,
                                  rozmiar, kolor — stąd powstanie tytuł SEO (przy długiej nazwie zadziała Smart Trimming).
                                </>
                              ) : (
                                <>Jak w sklepie: materiał, rozmiar, kolor — stąd powstanie tytuł SEO.</>
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                          </div>
                          <div className="relative">
                        <input
                          ref={productNameInputRef}
                          id="productName"
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder=" "
                          maxLength={nameMax}
                          className={cn(
                            "peer w-full rounded-xl border border-white/10 bg-black/25 px-4 pb-2.5 pt-5 text-sm text-gray-100 shadow-inner shadow-cyan-950/20",
                            "placeholder:text-transparent",
                            "transition-all duration-200",
                            "hover:border-cyan-400/25 hover:bg-black/35",
                            "focus:border-cyan-400 focus:outline-none focus:ring-[3px] focus:ring-cyan-500/12"
                          )}
                        />
                        <Label
                          htmlFor="productName"
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-all duration-200 peer-focus:top-2.5 peer-focus:text-[10px] peer-focus:text-cyan-400/85 peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:text-[10px]"
                        >
                          Nazwa produktu *
                        </Label>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                          <motion.div
                            className={cn("h-full rounded-full", charBarColor(namePct))}
                            style={{ width: `${namePct}%` }}
                            layout
                          />
                        </div>
                        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground/60">
                          {productName.length}/{nameMax}
                        </span>
                          </div>
                          {smartTitleTrimmingActive ? (
                        <p className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-cyan-100/90">
                          <span className="font-medium text-cyan-200/95">Smart Trimming:</span> nazwa dłuższa niż limit
                          tytułu na {platformProfile.name} ({platformProfile.titleMaxChars} zn.) — model złoży tytuł
                          SEO od nowa z najważniejszymi słowami.
                        </p>
                          ) : (
                            <p className="mt-2 text-[10px] leading-snug text-muted-foreground/70">
                              Najmocniejsze słowa daj na początek. Generator lepiej zbuduje tytuł, gdy nazwa już teraz
                              brzmi jak realna oferta.
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/12">
                              <Layers className="h-3.5 w-3.5 text-gray-300/90" aria-hidden />
                            </span>
                            <span className="text-sm font-semibold text-gray-100">Kategoria</span>
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
                              {platform === "allegro" ? (
                                <>
                                  Wybierz kategorię z drzewa Allegro — AI dostaje pełną ścieżkę jako kontekst branżowy.
                                  Dobra kategoria ułatwia też dopasowanie parametrów i produktyzację w panelu
                                  wystawiania.
                                </>
                              ) : (
                                <>
                                  Wybierz kategorię z hierarchii — AI dostanie pełną ścieżkę jako kontekst branżowy do
                                  lepszych opisów i tagów.
                                </>
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                          </div>
                          <p className="mb-2 text-[10px] leading-snug text-muted-foreground/75">
                            To pomaga AI złapać kontekst branżowy i lepiej dobrać styl oraz priorytety.
                          </p>
                          <CategoryCombobox
                        value={category}
                        onChange={setCategory}
                        productName={productName}
                        features={combinedFeaturesContext}
                          />
                          {categoryProductHint ? (
                        <p
                          className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100/90"
                          role="status"
                        >
                          <span className="font-medium text-amber-200/95">Kategoria vs nazwa:</span>{" "}
                          {categoryProductHint}
                        </p>
                          ) : (
                            <div className="mt-2 rounded-lg border border-white/8 bg-white/4 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground/75">
                              Im trafniejsza kategoria, tym lepsze sugestie cech i mniejsza szansa na „ogólnikowy”
                              opis.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-linear-to-br from-cyan-500/7 via-white/4 to-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_-44px_rgba(34,211,238,0.28)] md:p-5">
                      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
                      <div className="relative mb-4 flex flex-wrap items-center gap-2.5">
                        <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300/90">
                          Krok 1
                        </span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 ring-1 ring-cyan-500/20">
                          <List className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                        </span>
                        <Label htmlFor="features" className="text-sm font-semibold text-gray-100">
                          Fakty i parametry
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: fakty o produkcie">
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
                              Materiał, wymiary, stan, zestaw, EAN — to, co możesz potwierdzić. Jedna linia = jedna
                              cecha. Chip dodaje szablon „Etykieta: ”.
                            </p>
                            <p className="mt-2 text-[12px] text-gray-300/90">
                              <strong className="font-medium text-gray-200">Ton sprzedaży i obietnice</strong> — w
                              polu „Kąt sprzedaży” niżej, nie tutaj.
                            </p>
                            <p className="mt-2 text-[11px] font-medium text-gray-400">Przykład:</p>
                            <p className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-300/85">
                              {FEATURES_EXAMPLE_LINES}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-100/90">
                          Serce promptu
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-gray-200/85">
                          Twarde dane
                        </span>
                        {platform === "allegro" ? (
                          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-100/85">
                            Filtry Allegro osobno
                          </span>
                        ) : null}
                      </div>
                      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground/85">
                        Potwierdzone fakty, liczby i parametry — stąd AI buduje opis i tytuł. Im lepsze dane wejściowe,
                        tym mniej „lania wody” w generatorze.
                      </p>

                      <FeaturesSectionPreview text={features} />

                      <textarea
                        ref={featuresRef}
                        id="features"
                        value={features}
                        onChange={(e) => setFeatures(e.target.value)}
                        placeholder={FEATURES_PLACEHOLDER}
                        maxLength={featMax}
                        spellCheck={false}
                        className="scroll-mt-24 min-h-[128px] w-full resize-y rounded-xl border border-white/10 bg-linear-to-b from-black/20 to-black/35 px-4 py-3 text-sm text-gray-100 shadow-inner shadow-cyan-950/10 transition-all hover:border-cyan-400/20 focus:border-cyan-400 focus:outline-none focus:ring-[3px] focus:ring-cyan-500/12"
                      />
                      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn("h-full rounded-full transition-all", charBarColor(featPct))}
                          style={{ width: `${featPct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/60">
                        <span>Im więcej faktów, tym trafniejszy opis</span>
                        <span className="tabular-nums">
                          {features.length}/{featMax}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={() => setFeaturesTemplatesOpen((v) => !v)}
                          aria-expanded={featuresTemplatesOpen}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-gray-100 transition-colors hover:bg-white/5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Layers className="h-3.5 w-3.5 shrink-0 text-cyan-400/85" aria-hidden />
                            <span>
                              Gotowe pola do uzupełnienia{" "}
                              <span className="font-normal text-muted-foreground">(dodaj jednym kliknięciem)</span>
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              featuresTemplatesOpen && "rotate-180"
                            )}
                            aria-hidden
                          />
                        </button>
                        {featuresTemplatesOpen ? (
                          <div
                            ref={chipScrollRef}
                            onScroll={updateChipScrollEdges}
                            className="mx-3 mb-3 mt-3 max-h-[min(420px,56vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-linear-to-b from-black/30 via-black/20 to-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [-ms-overflow-style:none] [scrollbar-width:thin]"
                          >
                              <div className="space-y-4">
                                {visibleChips.length === 0 ? (
                                  <p className="w-full py-6 text-center text-[11px] text-muted-foreground">
                                    Brak chipów dla tej kategorii.
                                  </p>
                                ) : (
                                  <>
                                    {chipSections.highlighted.length > 0 ? (
                                      <div className="rounded-2xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 via-teal-500/6 to-black/30 p-3.5 shadow-[inset_0_1px_0_rgba(103,232,249,0.1)] transition-colors hover:border-cyan-400/30">
                                        <button
                                          type="button"
                                          onClick={() => toggleFeatureChipGroup("highlighted")}
                                          aria-expanded={featureChipGroupOpen.highlighted ?? false}
                                          className="flex w-full items-start justify-between gap-3 text-left"
                                        >
                                          <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/35">
                                              <HighlightChipGroupIcon
                                                className="h-4 w-4 text-cyan-200/95"
                                                aria-hidden
                                              />
                                            </span>
                                            <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-[13px] font-bold tracking-tight text-cyan-100">
                                                Najpierw uzupełnij
                                              </p>
                                              {PLATFORM_CHIP_PRIORITY[platform] ? (
                                                <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                                                  Priorytet {selectedPlatformLabel}
                                                </span>
                                              ) : null}
                                            </div>
                                            <p className="mt-1 text-[11px] leading-snug text-cyan-200/60">
                                              Najbardziej przydatne pola dla tej kategorii lub nazwy produktu.
                                            </p>
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-2">
                                            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200/90">
                                              {chipSections.highlighted.length} pól
                                            </span>
                                            <ChevronDown
                                              className={cn(
                                                "mt-0.5 h-4 w-4 text-muted-foreground/70 transition-transform",
                                                (featureChipGroupOpen.highlighted ?? false) && "rotate-180"
                                              )}
                                              aria-hidden
                                            />
                                          </div>
                                        </button>
                                        {featureChipGroupOpen.highlighted ? (
                                          <div className="mt-3 flex flex-wrap gap-2 border-t border-cyan-400/20 pt-3">
                                            {chipSections.highlighted.map(renderFeatureChip)}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {chipSections.sections.map((group) => {
                                      const groupOpen = featureChipGroupOpen[group.id] ?? false
                                      const SectionIcon = FEATURE_CHIP_GROUP_ICONS[group.id]
                                      return (
                                        <div
                                          key={group.id}
                                          className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 via-white/3 to-transparent p-3.5 transition-colors hover:border-white/12"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleFeatureChipGroup(group.id)}
                                            aria-expanded={groupOpen}
                                            className="flex w-full items-start justify-between gap-3 text-left"
                                          >
                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                              {SectionIcon ? (
                                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/12">
                                                  <SectionIcon
                                                    className="h-4 w-4 text-cyan-400/85"
                                                    aria-hidden
                                                  />
                                                </span>
                                              ) : null}
                                              <div className="min-w-0">
                                              <p className="text-[13px] font-bold tracking-tight text-gray-100">
                                                {group.title}
                                              </p>
                                              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
                                                {group.hint}
                                              </p>
                                              </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                              <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/90">
                                                {group.chips.length}
                                              </span>
                                              <ChevronDown
                                                className={cn(
                                                  "mt-0.5 h-4 w-4 text-muted-foreground/70 transition-transform",
                                                  groupOpen && "rotate-180"
                                                )}
                                                aria-hidden
                                              />
                                            </div>
                                          </button>
                                          {groupOpen ? (
                                            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                                              {group.chips.map(renderFeatureChip)}
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    })}

                                    {chipSections.extra.length > 0 ? (
                                      <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 via-white/3 to-transparent p-3.5 transition-colors hover:border-white/12">
                                        <button
                                          type="button"
                                          onClick={() => toggleFeatureChipGroup("extra")}
                                          aria-expanded={featureChipGroupOpen.extra ?? false}
                                          className="flex w-full items-start justify-between gap-3 text-left"
                                        >
                                          <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/12">
                                              <ExtraChipGroupIcon
                                                className="h-4 w-4 text-cyan-400/85"
                                                aria-hidden
                                              />
                                            </span>
                                            <div className="min-w-0">
                                            <p className="text-[13px] font-bold tracking-tight text-gray-100">
                                              Pozostałe
                                            </p>
                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
                                              Mniej typowe pola, które nadal mogą się przydać.
                                            </p>
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-2">
                                            <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/90">
                                              {chipSections.extra.length}
                                            </span>
                                            <ChevronDown
                                              className={cn(
                                                "mt-0.5 h-4 w-4 text-muted-foreground transition-transform",
                                                (featureChipGroupOpen.extra ?? false) && "rotate-180"
                                              )}
                                              aria-hidden
                                            />
                                          </div>
                                        </button>
                                        {featureChipGroupOpen.extra ? (
                                          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                                            {chipSections.extra.map(renderFeatureChip)}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative mt-6 space-y-4 overflow-hidden rounded-2xl border border-emerald-500/15 bg-linear-to-br from-emerald-500/8 via-white/4 to-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_-44px_rgba(16,185,129,0.24)] md:p-5">
                      <div className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
                      <div className="pointer-events-none absolute left-0 bottom-0 h-24 w-24 rounded-full bg-teal-500/8 blur-3xl" aria-hidden />
                      <div className="relative flex flex-wrap items-start gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/25">
                            <Target className="h-4 w-4 text-emerald-400" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-100/90">
                                Krok 2
                              </span>
                              <span className="text-xs font-semibold text-gray-100/90">Kąt sprzedaży</span>
                              <span className="rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Opcjonalnie
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={HUB_INFO_TRIGGER}
                                    aria-label="Pomoc: kąt sprzedaży"
                                  >
                                    <Info className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  sideOffset={8}
                                  arrowClassName={HUB_TOOLTIP_ARROW}
                                  className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,300px)]")}
                                >
                                  <p>
                                    Krótko: <strong className="font-medium text-gray-100">dla kogo</strong> i{" "}
                                    <strong className="font-medium text-gray-100">jaki efekt</strong> ma obiecywać oferta
                                    (np. prezent, pierwszy zakup w hobby, zamiennik droższego modelu). Model użyje tego do
                                    tonu i pierwszych zdań —{" "}
                                    <span className="text-emerald-200/90">bez dopisywania nowych faktów ani parametrów</span>.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-50/80">
                              Dodaj dla kogo jest oferta i jaki efekt ma wybrzmieć. To dopracowuje ton, emocję i
                              otwarcie opisu, ale nie zastępuje faktów.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-100/90">
                          Hook i ton
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-gray-200/85">
                          Dla pierwszych zdań
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-gray-200/85">
                          Bez nowych faktów
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={() => setListingIntentEditorOpen((v) => !v)}
                          aria-expanded={listingIntentEditorOpen}
                          aria-controls="listing-intent-editor"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-gray-100 transition-colors hover:bg-white/5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Target className="h-3.5 w-3.5 shrink-0 text-emerald-400/85" aria-hidden />
                            <span>
                              Wpisz kąt sprzedaży{" "}
                              <span className="font-normal text-muted-foreground">
                                {listingIntent.trim()
                                  ? `(${listingIntent.length} znaków)`
                                  : "(pole tekstowe)"}
                              </span>
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              listingIntentEditorOpen && "rotate-180"
                            )}
                            aria-hidden
                          />
                        </button>
                        {listingIntentEditorOpen ? (
                          <div
                            id="listing-intent-editor"
                            className="space-y-3 border-t border-white/8 px-3 pb-3 pt-3"
                          >
                            {listingIntent.trim() ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setListingIntent("")}
                                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-gray-200"
                                >
                                  Wyczyść pole
                                </button>
                              </div>
                            ) : null}
                            <Label htmlFor="listingIntent" className="sr-only">
                              Kąt sprzedaży — własny tekst
                            </Label>
                            <textarea
                              id="listingIntent"
                              value={listingIntent}
                              onChange={(e) => setListingIntent(e.target.value)}
                              placeholder="np. prezent dla dziecka 8+ · zabawa w domu i ogrodzie · stosunek jakości do ceny"
                              maxLength={intentMax}
                              rows={4}
                              aria-describedby="listingIntent-hint"
                              className="scroll-mt-24 min-h-[88px] w-full resize-y rounded-xl border border-white/10 bg-linear-to-b from-black/20 to-black/35 px-3 py-2.5 text-sm leading-relaxed text-gray-100 shadow-inner shadow-emerald-950/10 transition-all placeholder:text-muted-foreground/45 hover:border-emerald-400/20 focus:border-emerald-400 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/12"
                            />
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                  className={cn("h-full rounded-full", charBarColor(intentPct))}
                                  initial={false}
                                  animate={{ width: `${intentPct}%` }}
                                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                />
                              </div>
                              <span
                                className="shrink-0 tabular-nums text-[10px] text-muted-foreground/85"
                                aria-live="polite"
                              >
                                {listingIntent.length}/{intentMax}
                              </span>
                            </div>
                            <p id="listingIntent-hint" className="text-[10px] leading-snug text-muted-foreground/75">
                              Ustala <span className="text-gray-300/90">priorytet narracji</span> (hook, ton) w generowanym
                              tekście — <span className="text-gray-400/90">bez nowych faktów</span>; parametry zostają w
                              sekcji faktów.
                            </p>
                            <p className="text-[10px] leading-snug text-muted-foreground/65">
                              Przykłady: <span className="text-gray-300/85">prezent dla taty</span> ·{" "}
                              <span className="text-gray-300/85">dobry wybór na start</span> ·{" "}
                              <span className="text-gray-300/85">wersja premium bez przepłacania</span>
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-xl border border-emerald-500/15 bg-black/25">
                        <button
                          type="button"
                          onClick={() => setListingIntentIdeasOpen((v) => !v)}
                          aria-expanded={listingIntentIdeasOpen}
                          aria-controls="listing-intent-ideas"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-gray-100 transition-colors hover:bg-emerald-500/10"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400/85" aria-hidden />
                            <span>
                              Szybkie pomysły{" "}
                              <span className="font-normal text-emerald-200/65">(gotowe frazy)</span>
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-emerald-400/65 transition-transform",
                              listingIntentIdeasOpen && "rotate-180"
                            )}
                            aria-hidden
                          />
                        </button>
                        {listingIntentIdeasOpen ? (
                          <div
                            id="listing-intent-ideas"
                            className="border-t border-emerald-500/15 px-3 pb-3 pt-3"
                          >
                            <div className="rounded-xl border border-emerald-500/15 bg-linear-to-br from-emerald-950/35 via-black/35 to-black/45 p-3 md:p-4 shadow-[inset_0_1px_0_rgba(16,185,129,0.06)]">
                              {listingIntentIdeasPanelContent}
                            </div>
                          </div>
                        ) : null}
                      </div>

                    </div>

                    <div
                      className={cn(
                        "mt-6 space-y-2 rounded-xl border px-4 py-3",
                        descImgMode === "warn"
                          ? "border-amber-500/25 bg-amber-500/5"
                          : "border-white/8 bg-black/15"
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        <Label htmlFor="descriptionImageUrls" className="text-xs font-semibold text-gray-100/90">
                          {descImgMode === "embed"
                            ? "Grafiki w opisie"
                            : descImgMode === "warn"
                              ? "Grafiki — kontekst dla AI"
                              : "Linki do grafik"}
                          {" "}
                          <span className="font-normal text-muted-foreground">(opcjonalnie)</span>
                        </Label>
                        {descImgMode === "embed" && (
                          <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200/90">
                            osadzone w HTML
                          </span>
                        )}
                        {descImgMode === "context" && (
                          <span className="rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/85">
                            tylko kontekst AI
                          </span>
                        )}
                        {descImgMode === "warn" && (
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/90">
                            bez osadzania
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={HUB_INFO_TRIGGER}
                              aria-label="Pomoc: linki do grafik w opisie"
                            >
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,300px)]")}
                          >
                            {descImgMode === "embed" && (
                              <p>
                                Jedna linia = jeden adres (<span className="text-emerald-200/90">https</span>). W polu
                                parsujemy do {MAX_DESCRIPTION_IMAGE_URLS} poprawnych linków. W wygenerowanym opisie
                                HTML model może osadzić{" "}
                                <strong className="text-gray-100">co najwyżej {descImgEmbedCap}</strong> grafik przez{" "}
                                <code className="text-emerald-200/95">&lt;img src=&quot;…&quot;&gt;</code>
                                — wyłącznie z Twojej listy, bez zmyślonych URL-i.
                                {platform === "amazon"
                                  ? " Przy modułach A+ sensowny tekst alternatywny (alt) pomaga SEO."
                                  : null}
                              </p>
                            )}
                            {descImgMode === "context" && (
                              <p>
                                {selectedPlatformLabel} używa plain text — AI{" "}
                                <strong className="text-gray-100">nie osadzi</strong>{" "}
                                tagów <code className="text-amber-200/90">&lt;img&gt;</code>.
                                Linki przekazane tutaj posłużą jedynie jako kontekst (np. AI może wspomnieć
                                o zestawie zdjęć).
                              </p>
                            )}
                            {descImgMode === "warn" && (
                              <p>
                                eBay <strong className="text-gray-100">zabrania zewnętrznych obrazów</strong> w opisach
                                (wymagane eBay-hosted images). AI nie osadzi{" "}
                                <code className="text-amber-200/90">&lt;img&gt;</code> z tych URL-i.
                                Możesz tu wkleić linki — AI uwzględni je jako kontekst opisowy.
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {descImgMode === "warn" && (
                        <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-2.5 py-2 text-[10px] leading-snug text-amber-100/90">
                          <span className="font-semibold text-amber-200">eBay:</span> regulamin zabrania osadzania
                          zewnętrznych grafik w opisach — zdjęcia muszą być hostowane przez eBay. Linki poniżej
                          zostaną przekazane AI jako kontekst, ale{" "}
                          <span className="font-medium">nie jako &lt;img&gt;</span> w opisie.
                        </p>
                      )}

                      {descImgMode === "context" && (
                        <p className="rounded-lg border border-white/10 bg-white/4 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground/85">
                          <span className="font-medium text-gray-300/90">{selectedPlatformLabel}:</span> opis w plain
                          text — grafiki nie zostaną osadzone. AI uwzględni linki jako kontekst.
                        </p>
                      )}

                      <textarea
                        id="descriptionImageUrls"
                        value={descriptionImageUrls}
                        onChange={(e) => setDescriptionImageUrls(e.target.value)}
                        placeholder="https://example.com/zdjecie1.jpg&#10;https://example.com/zdjecie2.webp"
                        maxLength={imgLinksMax}
                        rows={3}
                        className={cn(
                          "min-h-[72px] w-full resize-y rounded-xl border px-3 py-2.5 font-mono text-[11px] leading-relaxed text-gray-100 shadow-inner transition-all placeholder:text-muted-foreground/45 focus:outline-none focus:ring-[3px]",
                          descImgMode === "warn"
                            ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 focus:border-amber-400/60 focus:ring-amber-500/10"
                            : "border-white/10 bg-black/25 hover:border-white/18 focus:border-emerald-500 focus:ring-emerald-500/12"
                        )}
                      />
                      <p className="text-[10px] leading-relaxed text-muted-foreground/75">
                        <span className="tabular-nums text-muted-foreground/85">
                          {descriptionImageUrls.length}/{imgLinksMax}
                        </span>{" "}
                        znaków
                        <span className="mx-1.5 text-white/25" aria-hidden>
                          ·
                        </span>
                        max {MAX_DESCRIPTION_IMAGE_URLS} adresów
                        <span className="mx-1.5 text-white/25" aria-hidden>
                          ·
                        </span>
                        1 URL na linię
                        <span className="mx-1.5 text-white/25" aria-hidden>
                          ·
                        </span>
                        tylko http(s)
                        {descImgMode === "embed" ? (
                          <>
                            <span className="mx-1.5 text-white/25" aria-hidden>
                              ·
                            </span>
                            w opisie HTML max{" "}
                            <span className="tabular-nums text-gray-300/88">{descImgEmbedCap}</span>{" "}
                            osadzonych grafik
                          </>
                        ) : null}
                      </p>
                    </div>

                    {(completenessPct < 40 || effectiveSectionFill < 3) &&
                    (productName.trim() !== "" || features.trim() !== "") ? (
                      <p
                        className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-2.5 py-2 text-[10px] leading-snug text-amber-100/90"
                        role="status"
                      >
                        Kompletność cech jest niska ({completenessPct}%, {effectiveSectionFill}/{CHIP_TOTAL} sekcji;
                        kluczowe dla kategorii: {priorityFilledCount}/{priorityTotal}). Dopisz fakty w polu powyżej albo
                        dodaj szablony z sekcji „Gotowe pola do uzupełnienia”.
                      </p>
                    ) : null}
                  </div>
            <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors",
                  "hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                )}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Wstecz
              </button>
              <button
                type="button"
                onClick={() => {
                  setWizardStep(3)
                  scrollWizardToTop()
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition-colors",
                  "hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                )}
              >
                Dalej
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </motion.section>
          ) : null}

          {wizardStep === 3 ? (
          <>
          {/* Ustawienia generacji */}
          <motion.section
            layout
            className="relative min-w-0 max-w-full overflow-hidden rounded-[24px] border border-white/8 bg-linear-to-br from-white/4.5 via-white/2 to-emerald-950/18 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow] duration-200 will-change-transform hover:-translate-y-px hover:border-white/12 hover:shadow-[0_0_40px_-12px_rgba(34,211,238,0.1)] sm:p-5 md:p-6"
          >
            <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-500/8 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/4 to-transparent" />
            <div className="relative z-10 flex w-full items-center gap-2 text-left">
              <Settings2 className="h-4 w-4 text-cyan-400/90 drop-shadow-[0_0_14px_rgba(34,211,238,0.12)]" />
              <span className="bg-linear-to-r from-white to-gray-400 bg-clip-text text-[11px] font-bold uppercase tracking-[0.2em] text-transparent">
                Ustawienia generacji
              </span>
            </div>
            <motion.div className="relative mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5" initial={false}>
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500/90 via-teal-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>

                  <div className="relative z-10 space-y-6 pt-6">
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
                      <button
                        type="button"
                        onClick={() => setListingEmojis(!listingEmojis)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all",
                          platformProfile.emojiPolicy === "discouraged"
                            ? "border-amber-500/20 bg-linear-to-r from-amber-950/30 to-gray-800/40 hover:border-amber-500/30"
                            : "border-white/10 bg-linear-to-r from-gray-800/60 to-gray-800/50 hover:border-cyan-500/25 hover:shadow-[0_0_24px_-8px_rgba(16,185,129,0.1)]"
                        )}
                        aria-pressed={listingEmojis}
                        aria-label={
                          listingEmojis
                            ? "Emoji w listingu w\u0142\u0105czone \u2014 kliknij, aby wy\u0142\u0105czy\u0107"
                            : "Emoji w listingu wy\u0142\u0105czone \u2014 kliknij, aby w\u0142\u0105czy\u0107"
                        }
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-100">Emoji w listingu</span>
                          {platformProfile.emojiPolicy === "restricted" && (
                            <span className="text-[10px] font-medium text-cyan-400/80">
                              Ta platforma: tylko w opisie, nie w tytule
                            </span>
                          )}
                          {platformProfile.emojiPolicy === "discouraged" && (
                            <span className="text-[10px] font-medium text-amber-400/80">
                              Rzadko stosowane na {selectedPlatformLabel}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
                            listingEmojis
                              ? "bg-linear-to-r from-cyan-500 to-emerald-500"
                              : "bg-gray-700"
                          )}
                          aria-hidden
                        >
                          <span
                            className={cn(
                              "absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-300",
                              listingEmojis ? "left-6" : "left-1"
                            )}
                          />
                        </span>
                      </button>
                      <p className="text-[10px] leading-relaxed text-muted-foreground/85">
                        {platformProfile.emojiPolicy === "restricted"
                          ? "W\u0142\u0105czone: emoji pojawi\u0105 si\u0119 tylko w opisie — ta platforma blokuje je w tytule oferty."
                          : platformProfile.emojiPolicy === "discouraged"
                          ? "Ta platforma u\u017cywa plain text — emoji s\u0105 mo\u017cliwe, ale mo\u017cna je wy\u0142\u0105czy\u0107 dla czystego stylu."
                          : "W\u0142\u0105czone: emotikony mog\u0105 pojawi\u0107 si\u0119 w tytule i opisach (z umiarem, wg tonu). Wy\u0142\u0105czone: sam tekst."}
                      </p>
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
            <div className="relative z-10 mt-5 flex justify-start border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors",
                  "hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                )}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Wstecz
              </button>
            </div>
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
                    Generuję… ({Math.min(loadingStep + 1, Math.max(loadingMessages.length, 1))}/{Math.max(loadingMessages.length, 1)})
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Generuj opis</span>
                      <span className="text-[10px] font-semibold text-white/70">1 kredyt</span>
                    </span>
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
          </>
          ) : null}

          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  )
}


