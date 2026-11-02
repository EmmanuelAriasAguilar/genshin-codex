import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/lib/theme"
import "../styles.css"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Resonance Codex" }
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
      }
    ]
  }),
  component: RootComponent
})

const NAV_GI = [
  { to: "/characters", label: "Personajes", icon: "users" },
  { to: "/weapons", label: "Armas", icon: "sword" },
  { to: "/artifacts", label: "Artefactos", icon: "gem" },
  { to: "/teams", label: "Equipos", icon: "team" },
  { to: "/builder", label: "Armador", icon: "wand" },
  { to: "/investments", label: "Inversión", icon: "chart" },
  { to: "/admin", label: "Admin", icon: "cog" }
]
// WuWa: rutas aún placeholder (todas a /ww). Se activarán al cargar su data.
const NAV_WW = [
  { to: "/ww/resonators", label: "Resonadores", icon: "users" },
  { to: "/ww/weapons", label: "Armas", icon: "sword" },
  { to: "/ww/echoes", label: "Echoes", icon: "gem" },
  { to: "/ww/sonatas", label: "Sonatas", icon: "wand" },
  { to: "/ww/teams", label: "Teams", icon: "team" },
  { to: "/ww/builder", label: "Armador", icon: "layers" },
  { to: "/ww/tier", label: "Tier list", icon: "chart" }
]

const GAMES = [
  { id: "gi", label: "Genshin", to: "/" },
  { id: "ww", label: "Wuthering Waves", to: "/ww" }
] as const

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  }
  const paths: Record<string, ReactNode> = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
    sword: (
      <>
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
        <path d="m13 19 6-6" />
        <path d="m16 16 4 4" />
        <path d="m19 21 2-2" />
      </>
    ),
    gem: (
      <>
        <path d="M6 3h12l4 6-10 13L2 9Z" />
        <path d="M11 3 8 9l4 13 4-13-3-6" />
        <path d="M2 9h20" />
      </>
    ),
    team: (
      <>
        <circle cx="7" cy="8" r="3" />
        <circle cx="17" cy="8" r="3" />
        <path d="M2 20a5 5 0 0 1 10 0M12 20a5 5 0 0 1 10 0" />
      </>
    ),
    wand: (
      <>
        <path d="m3 21 15-15 1.5 1.5L4.5 22.5Z" />
        <path d="M15 4h.01M18 7h.01M20 12h.01M12 2h.01" />
      </>
    ),
    cog: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 3 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
    menu: (
      <>
        <path d="M3 6h18M3 12h18M3 18h18" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="7" />
        <rect x="13" y="6" width="3" height="11" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    chevron: <path d="m15 18-6-6 6-6" />,
    x: (
      <>
        <path d="M18 6 6 18M6 6l12 12" />
      </>
    )
  }
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorativo
  return <svg {...common}>{paths[name]}</svg>
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient())
  const [open, setOpen] = useState(false) // drawer móvil
  const [railOpen, setRailOpen] = useState(true) // riel desktop visible
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const game = pathname.startsWith("/ww") ? "ww" : "gi"
  const NAV = game === "ww" ? NAV_WW : NAV_GI

  // Cierra el drawer al navegar (móvil).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <html lang="es" className="dark" data-game={game}>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <div className="relative min-h-screen">
            {/* Fondo táctico global */}
            <div className="pointer-events-none fixed inset-0 -z-10 tactical-grid" />
            <div
              className="pointer-events-none fixed inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(60rem 40rem at 12% -10%, rgb(var(--accent-neon)/0.06), transparent 60%)"
              }}
            />

            {/* Backdrop móvil */}
            {open && (
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              />
            )}

            {/* Riel táctico flotante */}
            <aside
              className={`fixed z-40 flex flex-col border border-border/70 bg-card/40 backdrop-blur-xl transition-transform duration-300 ease-out
                inset-y-0 left-0 w-64 gap-3 p-3
                ${open ? "translate-x-0" : "-translate-x-full"}
                lg:left-3 lg:top-3 lg:bottom-3 lg:inset-y-auto lg:w-[68px] lg:gap-2 lg:rounded-[3px] lg:p-2
                ${railOpen ? "lg:translate-x-0" : "lg:-translate-x-[140%]"}`}
            >
              {/* Marca */}
              <div className="flex items-center gap-2.5 lg:justify-center">
                <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
                  <span className="brand-mark h-10 w-10 shrink-0 text-base">
                    {game === "ww" ? "W" : "R"}
                  </span>
                  <span className="wordmark whitespace-nowrap text-[15px] lg:hidden">
                    Resonance<span className="text-brand"> Codex</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto rounded-[2px] p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
                  aria-label="Cerrar"
                >
                  <Icon name="x" />
                </button>
              </div>

              {/* Game switcher (vertical en el riel) */}
              <div className="game-switch lg:flex-col lg:gap-1 lg:bg-transparent lg:border-0 lg:p-0">
                {GAMES.map((g) => {
                  const on = game === g.id
                  return (
                    <Link
                      key={g.id}
                      to={g.to}
                      title={g.label}
                      className={`game-seg ${on ? "game-seg-on" : ""} lg:py-1.5`}
                    >
                      <span className="lg:hidden">{g.label}</span>
                      <span className="hidden lg:inline">{g.id.toUpperCase()}</span>
                    </Link>
                  )
                })}
              </div>

              <div className="hidden h-px bg-border/60 lg:block" />

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav-link group lg:h-11 lg:justify-center lg:px-0"
                    activeProps={{ className: "nav-link nav-link-active group lg:h-11 lg:justify-center lg:px-0" }}
                    title={item.label}
                  >
                    <span className="shrink-0">
                      <Icon name={item.icon} />
                    </span>
                    <span className="whitespace-nowrap lg:hidden">{item.label}</span>
                    {/* tooltip desktop */}
                    <span className="pointer-events-none absolute left-[54px] z-50 hidden whitespace-nowrap rounded-[2px] border border-border bg-popover px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-foreground shadow-lg lg:group-hover:block">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>

              <div className="hidden h-px bg-border/60 lg:block" />
              <div className="mt-auto flex items-center justify-center gap-1 lg:mt-0 lg:flex-col">
                <ThemeToggle />
                {/* Ocultar riel (solo desktop) */}
                <button
                  type="button"
                  onClick={() => setRailOpen(false)}
                  className="hidden h-9 w-9 place-items-center rounded-[2px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:grid"
                  aria-label="Ocultar menú"
                  title="Ocultar menú"
                >
                  <Icon name="chevron" />
                </button>
              </div>
            </aside>

            {/* Botón flotante para reabrir el riel (desktop, cuando está oculto) */}
            {!railOpen && (
              <button
                type="button"
                onClick={() => setRailOpen(true)}
                className="brand-mark tech-glow fixed left-3 top-3 z-40 hidden h-10 w-10 text-base lg:grid"
                aria-label="Mostrar menú"
                title="Mostrar menú"
              >
                {game === "ww" ? "W" : "R"}
              </button>
            )}

            {/* Contenido */}
            <div
              className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-300 ${
                railOpen ? "lg:pl-24" : "lg:pl-6"
              }`}
            >
              {/* Top bar móvil */}
              <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-[2px] p-1.5 text-foreground/80 hover:bg-white/5"
                  aria-label="Abrir menú"
                >
                  <Icon name="menu" size={22} />
                </button>
                <Link to={game === "ww" ? "/ww" : "/"} className="flex items-center gap-2.5">
                  <span className="brand-mark h-8 w-8 text-sm">{game === "ww" ? "W" : "R"}</span>
                  <span className="wordmark text-[14px]">
                    Resonance<span className="text-brand"> Codex</span>
                  </span>
                </Link>
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </header>

              <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <Outlet />
              </main>
            </div>
          </div>
          <Toaster />
        </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
