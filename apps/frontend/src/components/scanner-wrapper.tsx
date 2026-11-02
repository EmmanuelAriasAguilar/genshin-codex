import type { ReactNode } from "react"

interface Props {
  isLoading: boolean
  isError: boolean
  error?: unknown
  children: ReactNode
}

/** Estados de TanStack Query como telemetría: loading = escáner láser
 *  holográfico; error = falla crítica de sistema. */
export function ScannerWrapper({ isLoading, isError, error, children }: Props) {
  if (isLoading) {
    return (
      <div className="relative grid min-h-[40vh] place-items-center overflow-hidden border border-border/60 bg-card/20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-[rgb(var(--accent-neon)/0.18)] to-transparent" />
        <div className="pointer-events-none absolute inset-0 tactical-grid opacity-60" />
        <div className="relative flex flex-col items-center gap-3 font-mono">
          <div className="flex items-center gap-2 text-neon tech-glow-text">
            <span className="inline-block h-2 w-2 animate-flicker rounded-full bg-[rgb(var(--accent-neon))]" />
            <span className="text-sm tracking-[0.25em]">[ FETCHING_TELEMETRY... ]</span>
          </div>
          <div className="h-1 w-56 overflow-hidden border border-border/60">
            <div className="h-full w-1/3 animate-scanline bg-[rgb(var(--accent-neon))]" />
          </div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Sincronizando con el Códex Astral
          </p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="relative grid min-h-[40vh] place-items-center border border-destructive/50 bg-destructive/5">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgb(255_0_0/0.04)_10px,rgb(255_0_0/0.04)_20px)]" />
        <div className="relative flex flex-col items-center gap-2 text-center font-mono">
          <span className="text-3xl text-destructive">⚠</span>
          <span className="animate-flicker text-sm font-bold uppercase tracking-[0.2em] text-destructive">
            [ SYSTEM_FAILURE ]
          </span>
          <p className="max-w-sm text-xs text-destructive/80">
            No se pudo establecer enlace con el núcleo de datos.
            {error instanceof Error ? ` // ${error.message}` : ""}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
