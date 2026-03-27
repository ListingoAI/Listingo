"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { ListingoBoltMark } from "@/components/shared/ListingoBoltMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      )

      if (resetError) {
        setError(
          "Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie."
        )
        return
      }

      setSent(true)
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.")
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
        <h1 className="text-2xl font-bold text-foreground">Resetuj hasło</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Wyślemy Ci link do ustawienia nowego hasła.
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Twój email</Label>
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

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wysyłam...
              </>
            ) : (
              "Wyślij link resetujący →"
            )}
          </Button>
        </form>
      ) : (
        <div className="mt-8 space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
            📧
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sprawdź swoją skrzynkę!
          </h2>
          <p className="text-sm text-muted-foreground">
            Wysłaliśmy link do resetowania hasła na adres:
          </p>
          <p className="text-sm font-medium text-emerald-400">{email}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Kliknij link w mailu żeby ustawić nowe hasło. Link jest ważny przez
            24 godziny.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setSent(false)}
          >
            Wyślij ponownie
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pamiętasz hasło?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-400 hover:underline"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  )
}
