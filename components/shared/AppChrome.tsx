"use client"

import { usePathname } from "next/navigation"

import { Navbar } from "@/components/shared/Navbar"

const HIDE_MARKETING_NAV_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/forgot-password",
  "/onboarding",
] as const

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideMarketingNav = HIDE_MARKETING_NAV_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  const showNavbar = !hideMarketingNav && pathname !== "/"

  return (
    <>
      {showNavbar ? <Navbar /> : null}
      <div className={hideMarketingNav ? "" : "pt-16"}>{children}</div>
    </>
  )
}
