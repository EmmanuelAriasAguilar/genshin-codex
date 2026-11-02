import type { ReactNode } from "react"

/** Estrellas de rareza (★). 5★ dorado, 4★ morado, 3★ azul. */
export function Stars({ rarity }: { rarity: number }) {
  const tint = rarity === 4 ? "stars-4" : rarity <= 3 ? "text-sky-300" : ""
  return (
    <span className={`stars ${tint}`} aria-label={`${rarity} estrellas`}>
      {"★".repeat(Math.max(1, Math.min(5, rarity)))}
    </span>
  )
}

/** Punto de color de un elemento (Genshin o WuWa). */
export function ElementDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 8px ${color}88`
      }}
    />
  )
}

/** Encabezado de página: título grande + slot de acciones/filtros a la derecha. */
export function PageHeader({
  title,
  subtitle,
  right
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="mr-auto">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

/** Título de sección con barra de acento. */
export function SectionTitle({
  children,
  hint,
  right
}: {
  children: ReactNode
  hint?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="section-title">{children}</h2>
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

/** Badge simple reutilizable. */
export function Badge({
  children,
  accent,
  color,
  className
}: {
  children: ReactNode
  accent?: boolean
  color?: string
  className?: string
}) {
  return (
    <span
      className={`badge ${accent ? "badge-accent" : ""} ${className ?? ""}`}
      style={
        color
          ? { color, borderColor: `${color}55`, background: `${color}18` }
          : undefined
      }
    >
      {children}
    </span>
  )
}

/** Tile de estadística para dashboards. `accent` tiñe el glow (color CSS). */
export function StatTile({
  label,
  value,
  accent
}: {
  label: ReactNode
  value: ReactNode
  accent?: string | undefined
}) {
  return (
    <div
      className="stat-tile p-4 sm:p-5"
      style={accent ? ({ ["--el" as string]: hexToRgb(accent) }) : undefined}
    >
      <div className="stat-value text-2xl tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-neutral-400 sm:text-sm">{label}</div>
    </div>
  )
}

/** Convierte "#rrggbb" a "r g b" para usar en rgb(var(--el) / a). */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}
