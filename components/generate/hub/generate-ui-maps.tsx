import type { LucideIcon } from "lucide-react"
import {
  AlignLeft,
  BookOpen,
  Briefcase,
  Crown,
  FileText,
  Megaphone,
  Settings,
  Smile,
  Zap,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import type { SimpleIcon } from "simple-icons"
import { siAllegro, siEbay, siShopify, siWoocommerce } from "simple-icons"

const AMAZON_SMILE_PATH =
  "M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z"

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
      <path fill="currentColor" d={AMAZON_SMILE_PATH} />
    </svg>
  )
}

function ShoperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect x="4" y="7" width="16" height="12" rx="3" fill="currentColor" />
      <path d="M8 9a4 4 0 0 1 8 0" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function OlxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <circle cx="7" cy="12" r="2.3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m10.8 9.8 5.4 4.4m0-4.4-5.4 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="12" r="2.3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function EtsyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M9 12h4.8M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

/** Brand-style platform chips. */
export const PLATFORM_ICONS: Record<string, PlatformIconComponent> = {
  allegro: (props) => <BrandSvg icon={siAllegro} {...props} />,
  amazon: AmazonIcon,
  shopify: (props) => <BrandSvg icon={siShopify} {...props} />,
  shoper: ShoperIcon,
  woocommerce: (props) => <BrandSvg icon={siWoocommerce} {...props} />,
  ebay: (props) => <BrandSvg icon={siEbay} {...props} />,
  etsy: EtsyIcon,
  vinted: VintedIcon,
  empikplace: EmpikPlaceIcon,
  olx: OlxIcon,
  ogolny: FileText,
  ogolny_plain: FileText,
}

export const PLATFORM_ICON_COLORS: Record<string, string> = {
  allegro: `#${siAllegro.hex}`,
  amazon: "#FF9900",
  shopify: `#${siShopify.hex}`,
  shoper: "#25D48B",
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
