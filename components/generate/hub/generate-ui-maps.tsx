import type { LucideIcon } from "lucide-react"
import {
  AlignLeft,
  BookOpen,
  Briefcase,
  Crown,
  LayoutTemplate,
  Megaphone,
  Settings,
  Smile,
  Type,
  Zap,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import type { SimpleIcon } from "simple-icons"
import { siAllegro, siEbay, siShopify, siWoocommerce } from "simple-icons"

const AMAZON_INK = "#111111"
const AMAZON_ORANGE = "#FF9900"

export type PlatformIconComponent = ComponentType<SVGProps<SVGSVGElement>>

function BrandSvg({
  icon,
  ...props
}: SVGProps<SVGSVGElement> & { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <path fill="currentColor" d={icon.path} />
    </svg>
  )
}

function AmazonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <image href="/icon/amazon icon.png" x="0" y="0" height="24" width="24" />
    </svg>
  )
}




function VintedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <path d="M6 7.2h2.2l3.8 9.6 3.8-9.6H18l-4.9 11.6h-2.2z" fill="currentColor" />
    </svg>
  )
}

function EmpikPlaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" />
      <path
        d="M9 8.2h6v1.8h-4.1v1.3h3.8v1.7h-3.8v1.8H15v1.8H9z"
        fill="#111111"
      />
    </svg>
  )
}

function EbayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <image href="/icon/ebay icon.png" x="0" y="0" height="24" width="24" />
    </svg>
  )
}

function EtsyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <image href="/icon/etsy icon.png" x="0" y="0" height="24" width="24" />
    </svg>
  )
}

function OlxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <image href="/icon/olx icon.png" x="0" y="0" height="24" width="24" />
    </svg>
  )
}

function WoocommerceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <image href="/icon/woo comerce.png" x="0" y="0" height="24" width="24" />
    </svg>
  )
}

/** Brand-style platform chips. */
export const PLATFORM_ICONS: Record<string, PlatformIconComponent> = {
  allegro: (props) => <BrandSvg icon={siAllegro} {...props} />,
  amazon: AmazonIcon,
  shopify: (props) => <BrandSvg icon={siShopify} {...props} />,
  woocommerce: WoocommerceIcon,
  ebay: EbayIcon,
  etsy: EtsyIcon,
  vinted: VintedIcon,
  empikplace: EmpikPlaceIcon,
  olx: OlxIcon,
  /** Szablon HTML / uniwersalny — ikona „layout”, nie zwykły dokument */
  ogolny: LayoutTemplate,
  /** Plain text — ikona typografii */
  ogolny_plain: Type,
}

export const PLATFORM_ICON_COLORS: Record<string, string> = {
  allegro: `#${siAllegro.hex}`,
  amazon: "#FF9900",
  shopify: `#${siShopify.hex}`,
  woocommerce: `#${siWoocommerce.hex}`,
  ebay: `#${siEbay.hex}`,
  etsy: "#F1641E",
  vinted: "#09B1BA",
  empikplace: "#FFD200",
  olx: "#23E5DB",
  ogolny: "currentColor",
  ogolny_plain: "#94a3b8",
}

export const TONE_ICONS: Record<string, LucideIcon> = {
  profesjonalny: Briefcase,
  przyjazny: Smile,
  luksusowy: Crown,
  mlodziezowy: Zap,
  techniczny: Settings,
  sprzedazowy: Megaphone,
  narracyjny: BookOpen,
  zwiezly: AlignLeft,
}
