import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl" aria-hidden>
            ⚡
          </span>
          <h1 className="bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent">
            Listingo
          </h1>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-8 shadow-sm backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-foreground">
            🎉 Witaj, {profile?.full_name ?? "Użytkowniku"}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Twoje konto zostało stworzone pomyślnie. Dashboard jest w budowie —
            wróć jutro!
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/30 p-3 text-left">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium capitalize text-emerald-400">
                {profile?.plan ?? "free"}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-left">
              <p className="text-xs text-muted-foreground">Kredyty</p>
              <p className="text-sm font-medium text-emerald-400">
                {profile?.credits_limit ?? 5} dostępnych
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-left">
              <p className="text-xs text-muted-foreground">Platforma</p>
              <p className="text-sm font-medium capitalize text-foreground">
                {profile?.default_platform ?? "allegro"}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-left">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.email ?? user.email}
              </p>
            </div>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-muted-foreground transition-colors hover:text-red-400"
          >
            Wyloguj się
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          🛠️ Pełny dashboard pojawi się w Dniu 4
        </p>
      </div>
    </div>
  )
}
