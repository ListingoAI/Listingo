import Image from "next/image"

import { cn } from "@/lib/utils"

/** Plik w `public/logos/listingo-logo.webp` */
export const LISTINGO_LOGO_SRC = "/logos/listingo-logo.webp"

/** Znak graficzny marki (logo) — używany w nav, stopce, dashboardzie. */
export function ListingoBoltMark({
  className,
  priority,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={LISTINGO_LOGO_SRC}
      alt=""
      width={200}
      height={56}
      className={cn(
        "h-8 w-auto shrink-0 object-contain object-left",
        className
      )}
      sizes="200px"
      priority={priority}
      aria-hidden
    />
  )
}
