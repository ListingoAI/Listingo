export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-6 px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">⚡</span>
          <h1 className="text-5xl font-bold bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            Listingo
          </h1>
        </div>
        
        {/* Subtitle */}
        <p className="text-xl text-muted-foreground max-w-md">
          Opisy produktów w 30 sekund.
          <br />
          AI pisze. Ty sprzedajesz.
        </p>
        
        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-semibold text-emerald-400">✅ Działa!</p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-sm text-muted-foreground">Next.js</p>
            <p className="text-lg font-semibold text-emerald-400">✅ OK</p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-sm text-muted-foreground">Tailwind</p>
            <p className="text-lg font-semibold text-emerald-400">✅ OK</p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-sm text-muted-foreground">shadcn/ui</p>
            <p className="text-lg font-semibold text-emerald-400">✅ OK</p>
          </div>
        </div>

        {/* Test buttons */}
        <div className="flex gap-4 justify-center mt-6">
          <a 
            href="/register" 
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
          >
            Rejestracja →
          </a>
          <a 
            href="/login" 
            className="px-6 py-3 border border-slate-700 hover:border-emerald-500 text-white font-medium rounded-xl transition-all"
          >
            Logowanie
          </a>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          🛠️ Dzień 1 ukończony — fundament gotowy!
        </p>
      </div>
    </main>
  )
}
