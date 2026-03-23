"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type BarTone = "secondary" | "red" | "yellow" | "emerald"

function getPasswordBarTones(length: number): BarTone[] {
  if (length === 0) {
    return ["secondary", "secondary", "secondary", "secondary"]
  }
  if (length <= 5) {
    return ["red", "secondary", "secondary", "secondary"]
  }
  if (length <= 8) {
    return ["yellow", "yellow", "secondary", "secondary"]
  }
  if (length <= 12) {
    return ["emerald", "emerald", "emerald", "secondary"]
  }
  return ["emerald", "emerald", "emerald", "emerald"]
}

const barClass: Record<BarTone, string> = {
  secondary: "bg-secondary",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  emerald: "bg-emerald-500",
}

function PasswordStrengthHint({ length }: { length: number }) {
  if (length === 0) {
    return null
  }
  if (length <= 5) {
    return <p className="mt-1 text-xs text-red-400">Słabe hasło</p>
  }
  if (length <= 8) {
    return <p className="mt-1 text-xs text-yellow-400">Średnie hasło</p>
  }
  if (length <= 12) {
    return <p className="mt-1 text-xs text-emerald-400">Dobre hasło</p>
  }
  return (
    <p className="mt-1 text-xs text-emerald-400">Silne hasło 💪</p>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const barTones = getPasswordBarTones(password.length)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError(
            "Ten email jest już zarejestrowany. Spróbuj się zalogować."
          )
        } else if (signUpError.message.includes("valid email")) {
          setError("Wpisz poprawny adres email.")
        } else if (signUpError.message.includes("at least")) {
          setError("Hasło musi mieć minimum 6 znaków.")
        } else {
          setError("Wystąpił błąd. Spróbuj ponownie za chwilę.")
        }
        return
      }

      if (data.user) {
        router.push("/onboarding")
      }
    } catch {
      setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 lg:hidden"
      >
        <span className="text-2xl" aria-hidden>
          ⚡
        </span>
        <span className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
          Listingo
        </span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Stwórz darmowe konto
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dołącz do sprzedawców, którzy sprzedają więcej
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Imię i nazwisko</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Jan Kowalski"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border-border/50 bg-secondary/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
        </div>

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
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 znaków"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border/50 bg-secondary/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
          />
          <div className="mt-2">
            <div className="flex gap-1">
              {barTones.map((tone, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${barClass[tone]}`}
                />
              ))}
            </div>
            <PasswordStrengthHint length={password.length} />
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 rounded border-border accent-emerald-500"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground">
            Akceptuję{" "}
            <Link
              href="#"
              className="text-emerald-400 hover:underline"
            >
              regulamin
            </Link>{" "}
            i{" "}
            <Link
              href="#"
              className="text-emerald-400 hover:underline"
            >
              politykę prywatności
            </Link>
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={
            loading ||
            !agreedToTerms ||
            !fullName ||
            !email ||
            !password
          }
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Tworzę konto...
            </>
          ) : (
            "Stwórz konto →"
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
        Masz już konto?{" "}
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
