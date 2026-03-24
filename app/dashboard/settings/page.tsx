"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PLATFORMS, TONES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/useUser"
import { planLabel } from "@/lib/plans"
import { formatDate, PLANS } from "@/lib/utils"

function getInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "?"
  return fullName
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function creditsBarColor(pct: number): string {
  if (pct < 50) return "bg-emerald-500"
  if (pct <= 80) return "bg-yellow-500"
  return "bg-red-500"
}

type SettingsTab = "profile" | "plan" | "security"

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useUser()

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [fullName, setFullName] = useState("")
  const [defaultPlatform, setDefaultPlatform] = useState("allegro")
  const [defaultTone, setDefaultTone] = useState("profesjonalny")
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || "")
    setDefaultPlatform(profile.default_platform || "allegro")
    setDefaultTone(profile.default_tone || "profesjonalny")
  }, [profile])

  async function handleSaveProfile() {
    if (!user) {
      toast.error("Brak sesji")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        default_platform: defaultPlatform,
        default_tone: defaultTone,
      })
      .eq("id", user.id)

    if (error) {
      toast.error("Błąd zapisu")
    } else {
      toast.success("Profil zapisany ✅")
      await refreshProfile()
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Hasła nie są identyczne")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Hasło musi mieć min. 6 znaków")
      return
    }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error("Błąd zmiany hasła: " + error.message)
    } else {
      toast.success("Hasło zmienione ✅")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
    setChangingPassword(false)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "USUŃ") {
      toast.error("Wpisz USUŃ żeby potwierdzić")
      return
    }
    toast.error(
      "Usuwanie konta nie jest jeszcze dostępne. Skontaktuj się z nami."
    )
  }

  const plan = profile?.plan ?? "free"
  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? PLANS.free.credits
  const safeLimit = Math.max(creditsLimit, 1)
  const creditsPct = (creditsUsed / safeLimit) * 100
  const barColor = creditsBarColor(creditsPct)

  const tabClass = (tab: SettingsTab) =>
    `rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
      activeTab === tab
        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
        : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
    }`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚙️ Ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zarządzaj swoim kontem
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={tabClass("profile")}
        >
          Profil
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={tabClass("plan")}
        >
          Plan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={tabClass("security")}
        >
          Bezpieczeństwo
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="space-y-6">
          <div className="space-y-5 rounded-2xl border border-border/50 bg-card/50 p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl font-bold text-emerald-400">
                {getInitials(profile?.full_name)}
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {profile?.full_name || "Użytkownik"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Konto od{" "}
                  {profile?.created_at
                    ? formatDate(profile.created_at)
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="fullName" className="text-foreground">
                Imię i nazwisko
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">
                Email{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (nie można zmienić)
                </span>
              </Label>
              <Input
                id="email"
                value={profile?.email ?? ""}
                disabled
                className="mt-2 h-10 cursor-not-allowed opacity-50"
              />
            </div>

            <div>
              <Label htmlFor="defaultPlatform" className="text-foreground">
                Domyślna platforma
              </Label>
              <select
                id="defaultPlatform"
                value={defaultPlatform}
                onChange={(e) => setDefaultPlatform(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.emoji} {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="defaultTone" className="text-foreground">
                Domyślny ton
              </Label>
              <select
                id="defaultTone"
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.emoji} {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapisuję...
                </>
              ) : (
                "Zapisz zmiany"
              )}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === "plan" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Aktualny plan</p>
                <p
                  className={`mt-1 text-2xl font-bold capitalize ${
                    plan === "free"
                      ? "text-foreground"
                      : plan === "starter"
                        ? "text-emerald-400"
                        : plan === "scale"
                          ? "text-amber-400"
                          : "text-purple-400"
                  }`}
                >
                  {planLabel(plan)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  plan === "free"
                    ? "bg-secondary text-foreground"
                    : plan === "starter"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : plan === "scale"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {plan}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kredyty</span>
                  <span className="text-foreground">
                    {creditsUsed}/{creditsLimit}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{
                      width: `${Math.min(100, creditsPct)}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Reset kredytów:{" "}
                {profile?.credits_reset_at
                  ? formatDate(profile.credits_reset_at)
                  : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div
              className={`rounded-2xl border border-border/50 bg-card/30 p-5 ${
                plan === "free" ? "ring-2 ring-emerald-500" : ""
              }`}
            >
              <p className="font-medium text-foreground">{PLANS.free.name}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {PLANS.free.price} zł
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>✓ {PLANS.free.credits} opisów/mies</li>
                <li>✓ 1 platforma</li>
                <li>✓ Quality Score</li>
              </ul>
              {plan === "free" ? (
                <p className="mt-3 text-xs text-emerald-400">Aktualny plan ✓</p>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 text-xs text-muted-foreground opacity-60"
                >
                  Downgrade
                </button>
              )}
            </div>

            <div
              className={`rounded-2xl border border-border/50 bg-card/30 p-5 ${
                plan === "starter"
                  ? "border-emerald-500/50 ring-2 ring-emerald-500/40"
                  : ""
              }`}
            >
              <p className="font-medium text-foreground">
                {PLANS.starter.name}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {PLANS.starter.price} zł/mies
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>✓ {PLANS.starter.credits} opisów/mies</li>
                <li>✓ Wszystkie platformy</li>
                <li>✓ Brand Voice</li>
              </ul>
              {plan === "starter" ? (
                <p className="mt-3 text-xs text-emerald-400">Aktualny plan ✓</p>
              ) : plan === "free" ? (
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 opacity-80"
                >
                  Upgrade do Starter → (wkrótce)
                </button>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Masz wyższy plan
                </p>
              )}
            </div>

            <div
              className={`rounded-2xl border border-border/50 bg-card/30 p-5 ${
                plan === "pro"
                  ? "border-purple-500/40 ring-2 ring-purple-500/30"
                  : ""
              }`}
            >
              <p className="font-medium text-foreground">{PLANS.pro.name}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {PLANS.pro.price} zł/mies
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>✓ Bez limitu opisów*</li>
                <li>✓ Analiza konkurencji</li>
                <li>✓ Priorytetowe wsparcie</li>
              </ul>
              {plan === "pro" ? (
                <p className="mt-3 text-xs text-purple-400">Aktualny plan ✓</p>
              ) : plan === "scale" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Masz wyższy plan (Scale)
                </p>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 opacity-90"
                >
                  Upgrade do Pro → (wkrótce)
                </button>
              )}
            </div>

            <div
              className={`rounded-2xl border border-border/50 bg-card/30 p-5 ${
                plan === "scale"
                  ? "border-amber-500/40 ring-2 ring-amber-500/30"
                  : ""
              }`}
            >
              <p className="font-medium text-foreground">{PLANS.scale.name}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {PLANS.scale.price} zł/mies
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>✓ Wszystko z Pro</li>
                <li>✓ Photo Studio AI (sceny)</li>
                <li>✓ Priorytet i skala</li>
              </ul>
              {plan === "scale" ? (
                <p className="mt-3 text-xs text-amber-400">Aktualny plan ✓</p>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 opacity-90"
                >
                  Upgrade do Scale → (wkrótce)
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            💳 Płatności będą dostępne wkrótce. Na razie korzystaj z darmowego
            planu.
          </p>
        </div>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Zmień hasło
            </h3>
            <div>
              <Label htmlFor="newPassword" className="text-foreground">
                Nowe hasło
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-2 h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
              />
            </div>
            <div className="mt-3">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Potwierdź hasło
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-2 h-10 border-border/50 bg-secondary/50 focus-visible:border-emerald-500"
              />
            </div>
            {newPassword &&
            confirmPassword &&
            newPassword !== confirmPassword ? (
              <p className="mt-1 text-xs text-red-400">
                Hasła nie są identyczne
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleChangePassword()}
              disabled={changingPassword}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zmieniam...
                </>
              ) : (
                "Zmień hasło"
              )}
            </button>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-card/50 p-6">
            <h3 className="mb-2 text-base font-semibold text-red-400">
              ⚠️ Strefa niebezpieczna
            </h3>
            <p className="text-sm text-muted-foreground">
              Usunięcie konta jest nieodwracalne. Wszystkie Twoje opisy i dane
              zostaną trwale usunięte.
            </p>
            <div className="mt-4">
              <Label htmlFor="deleteConfirm" className="text-sm text-foreground">
                Wpisz USUŃ żeby potwierdzić
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="USUŃ"
                className="mt-1 h-10 border-red-500/20 bg-secondary/50 focus-visible:border-red-500/50"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteConfirm !== "USUŃ"}
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-30"
            >
              Usuń konto na zawsze
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
