"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { ListingoBoltMark } from "@/components/shared/ListingoBoltMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login")) {
          setError("Nieprawidłowy email lub hasło.")
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Potwierdź swój email przed logowaniem.")
        } else {
          setError("Wystąpił błąd. Spróbuj ponownie.")
        }
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", data.user.id)
          .single()

        if (profile && !profile.onboarding_completed) {
          router.push("/onboarding")
        } else {
          router.push("/dashboard")
        }
        router.refresh()
      }
    } catch {
      setError("Wystąpił nieoczekiwany błąd.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Link href="/" className="mb-4 flex items-center gap-2 lg:hidden">
        <ListingoBoltMark className="h-8 w-auto" />
        <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
          Listingo
        </span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Zaloguj się</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Witaj z powrotem! Wróć do tworzenia opisów.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="jan@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-border/50 bg-secondary/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Hasło</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-emerald-400 hover:underline"
            >
              Zapomniałeś hasła?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Twoje hasło"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border/50 bg-secondary/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loguję...
            </>
          ) : (
            "Zaloguj się →"
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="flex-1 border-t border-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs text-muted-foreground">
            lub
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled
        className="w-full rounded-xl border-border/50 py-3 hover:border-emerald-500/30"
      >
        <span className="text-muted-foreground">
          🔗 Kontynuuj z Google (wkrótce)
        </span>
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-400 hover:underline"
        >
          Zarejestruj się
        </Link>
      </p>
    </div>
  )
}
