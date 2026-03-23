"use client"

import { useReducedMotion } from "framer-motion"
import type { SimpleIcon } from "simple-icons"
import { siAllegro, siShopify, siWoocommerce } from "simple-icons"
import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Amazon „smile” — ścieżka z Simple Icons v8 (usunięta w nowszych wersjach). */
const AMAZON_SMILE_PATH =
  "M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z"

type LogoEntry = {
  id: string
  /** Kolor marki przy hover (np. `#ff5a00`, zmienna CSS `--brand`) */
  hoverColor: string
  /** Korekta skali (np. Woo ma cienką ikonę w viewBox 24) */
  innerClass?: string
  node: ReactNode
}

function BrandSvg({ icon }: { icon: SimpleIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="h-14 w-auto max-w-40 shrink-0 sm:h-16"
    >
      <path fill="currentColor" d={icon.path} />
    </svg>
  )
}

function OlxWordmark() {
  return (
    <svg
      viewBox="0 0 52 26"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="h-14 w-auto shrink-0 sm:h-16"
    >
      <text
        x="1"
        y="19.5"
        fill="currentColor"
        className="select-none"
        style={{
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        OLX
      </text>
    </svg>
  )
}

function AmazonSmile() {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="h-14 w-auto max-w-40 shrink-0 sm:h-16"
    >
      <path fill="currentColor" d={AMAZON_SMILE_PATH} />
    </svg>
  )
}

const LOGO_ENTRIES: LogoEntry[] = [
  {
    id: "allegro",
    hoverColor: `#${siAllegro.hex}`,
    innerClass: "origin-center scale-[1.22]",
    node: <BrandSvg icon={siAllegro} />,
  },
  {
    id: "shopify",
    hoverColor: `#${siShopify.hex}`,
    node: <BrandSvg icon={siShopify} />,
  },
  {
    id: "woocommerce",
    hoverColor: `#${siWoocommerce.hex}`,
    innerClass: "origin-center scale-[1.82]",
    node: <BrandSvg icon={siWoocommerce} />,
  },
  {
    id: "olx",
    hoverColor: "#7323dc",
    node: <OlxWordmark />,
  },
  {
    id: "amazon",
    hoverColor: "#ff9900",
    innerClass: "origin-center scale-[1.12]",
    node: <AmazonSmile />,
  },
]

const SLOT =
  "flex min-h-[5.25rem] shrink-0 items-center justify-center overflow-visible px-2 sm:min-h-[5.75rem] sm:px-3"
const SLOT_INNER =
  "flex items-center justify-center text-foreground opacity-40 grayscale transition-[opacity,filter,color,transform] duration-300 ease-out hover:opacity-100 hover:grayscale-0 hover:[color:var(--brand)]"

function LogoRow({ stripKey }: { stripKey: string }) {
  return (
    <div className="flex shrink-0 items-center gap-7 md:gap-9">
      {LOGO_ENTRIES.map(({ id, hoverColor, innerClass, node }) => (
        <div key={`${stripKey}-${id}`} className={SLOT}>
          <div
            className={cn(SLOT_INNER, innerClass)}
            style={{ "--brand": hoverColor } as CSSProperties}
          >
            {node}
          </div>
        </div>
      ))}
    </div>
  )
}

export function IntegrationLogosMarquee() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div
        className="flex flex-wrap items-center justify-center gap-x-7 gap-y-8 md:gap-x-9"
        aria-hidden
      >
        {LOGO_ENTRIES.map(({ id, hoverColor, innerClass, node }) => (
          <div key={id} className={SLOT}>
            <div
              className={cn(SLOT_INNER, innerClass)}
              style={{ "--brand": hoverColor } as CSSProperties}
            >
              {node}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative" aria-hidden>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-background via-background/90 to-transparent sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-background via-background/90 to-transparent sm:w-20" />
      <div className="overflow-x-hidden overflow-y-visible py-3">
        <div className="integration-marquee-track flex w-max">
          <LogoRow stripKey="a" />
          <LogoRow stripKey="b" />
        </div>
      </div>
    </div>
  )
}
