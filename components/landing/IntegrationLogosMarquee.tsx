"use client"

import type { SimpleIcon } from "simple-icons"
import { siAllegro, siShopify, siWoocommerce, siEbay } from "simple-icons"
import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Amazon „smile" — ścieżka z Simple Icons v8 (usunięta w nowszych wersjach). */
const AMAZON_SMILE_PATH =
  "M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z"

type LogoIconSize = "default" | "large" | "xlarge" | "xxlarge"

type LogoEntry = {
  id: string
  /** Kolor marki — widoczny po najechaniu (bez filtra monochromatycznego). */
  hoverColor: string
  /** `large` h-10 · `xlarge` h-12 (Allegro) · `xxlarge` h-14 (WooCommerce — szeroki znak w 24×24). */
  iconSize?: LogoIconSize
  node: ReactNode
}

/** Wspólna oś pozioma; wyższe rozmiary dla ikon, które w 24×24 wyglądą mało. */
function LogoSlot({
  children,
  size = "default",
}: {
  children: ReactNode
  size?: LogoIconSize
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center [&>svg]:block [&>svg]:w-auto [&>svg]:max-w-full [&>svg]:shrink-0 [&>svg]:object-contain",
        size === "xxlarge" &&
          "h-14 max-w-36 sm:max-w-44 [&>svg]:h-14 [&>svg]:max-h-14",
        size === "xlarge" &&
          "h-12 max-w-32 sm:max-w-40 [&>svg]:h-12 [&>svg]:max-h-12",
        size === "large" &&
          "h-10 max-w-24 sm:max-w-28 [&>svg]:h-10 [&>svg]:max-h-10",
        size === "default" &&
          "h-8 max-w-18 sm:max-w-20 [&>svg]:h-8 [&>svg]:max-h-8"
      )}
    >
      {children}
    </span>
  )
}

function BrandSvg({ icon }: { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="currentColor" d={icon.path} />
    </svg>
  )
}

function AmazonSmile() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="currentColor" d={AMAZON_SMILE_PATH} />
    </svg>
  )
}

function ShoperWordmark() {
  return (
    <svg viewBox="0 0 72 22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <text
        x="0"
        y="16"
        fill="currentColor"
        className="select-none"
        style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        shoper
      </text>
    </svg>
  )
}

const LOGO_ENTRIES: LogoEntry[] = [
  {
    id: "allegro",
    hoverColor: `#${siAllegro.hex}`,
    iconSize: "xlarge",
    node: (
      <LogoSlot size="xlarge">
        <BrandSvg icon={siAllegro} />
      </LogoSlot>
    ),
  },
  {
    id: "amazon",
    hoverColor: "#ff9900",
    node: (
      <LogoSlot>
        <AmazonSmile />
      </LogoSlot>
    ),
  },
  {
    id: "shopify",
    hoverColor: `#${siShopify.hex}`,
    node: (
      <LogoSlot>
        <BrandSvg icon={siShopify} />
      </LogoSlot>
    ),
  },
  {
    id: "shoper",
    hoverColor: "#25D48B",
    node: (
      <LogoSlot>
        <ShoperWordmark />
      </LogoSlot>
    ),
  },
  {
    id: "woocommerce",
    hoverColor: `#${siWoocommerce.hex}`,
    iconSize: "xxlarge",
    node: (
      <LogoSlot size="xxlarge">
        <BrandSvg icon={siWoocommerce} />
      </LogoSlot>
    ),
  },
  {
    id: "ebay",
    hoverColor: `#${siEbay.hex}`,
    iconSize: "large",
    node: (
      <LogoSlot size="large">
        <BrandSvg icon={siEbay} />
      </LogoSlot>
    ),
  },
]

function LogoCell({ entry }: { entry: LogoEntry }) {
  return (
    <div
      className="flex min-h-16 min-w-14 shrink-0 cursor-default items-center justify-center px-5 grayscale brightness-0 invert opacity-50 transition-[filter,opacity] duration-300 hover:filter-none hover:opacity-100"
      style={{ color: entry.hoverColor } as CSSProperties}
    >
      {entry.node}
    </div>
  )
}

export function IntegrationLogosMarquee() {
  return (
    <div className="flex w-full max-w-full flex-col items-center gap-5">
      {/* Statyczny układ przy prefers-reduced-motion */}
      <div
        className="hidden flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12 md:gap-x-16 motion-reduce:flex"
        aria-hidden
      >
        {LOGO_ENTRIES.map((entry) => (
          <LogoCell key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Karuzela nieskończona */}
      <div
        className="relative w-full max-w-5xl motion-reduce:hidden"
        aria-hidden
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background to-transparent sm:w-20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background to-transparent sm:w-20"
          aria-hidden
        />
        <div className="overflow-hidden py-1">
          <div className="integration-logos-marquee-track flex items-center">
            {LOGO_ENTRIES.map((entry) => (
              <LogoCell key={entry.id} entry={entry} />
            ))}
            {LOGO_ENTRIES.map((entry) => (
              <LogoCell key={`${entry.id}-dup`} entry={entry} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs font-medium tracking-wide text-muted-foreground/55">
        i ponad 20 innych platform
      </p>
    </div>
  )
}
