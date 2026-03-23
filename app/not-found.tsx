export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(217.2 32.6% 17.5% / 0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-md text-center">
        {/* 404 big number */}
        <h1 className="gradient-text-animated select-none text-[120px] leading-none font-bold md:text-[180px]">
          404
        </h1>

        {/* Message */}
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Ups! Nie znaleziono strony
        </h2>
        <p className="mt-3 text-muted-foreground">
          Ta strona nie istnieje lub została przeniesiona. Może chciałeś
          wygenerować opis produktu?
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/"
            className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:bg-emerald-600"
          >
            ← Strona główna
          </a>
          <a
            href="/dashboard/generate"
            className="rounded-xl border border-border/50 px-6 py-3 font-medium text-foreground transition-all hover:border-emerald-500/30"
          >
            ✨ Generuj opis
          </a>
        </div>

        {/* Fun fact */}
        <p className="mt-12 text-xs italic text-muted-foreground">
          Fun fact: W czasie gdy szukałeś tej strony, Listingo mógł
          wygenerować 3 opisy produktów. ⚡
        </p>
      </div>
    </div>
  )
}
