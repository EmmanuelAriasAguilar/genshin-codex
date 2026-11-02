import type { ReactNode } from "react"

/**
 * Resalta valores numéricos (porcentajes, stacks, segundos) en un texto de efecto,
 * y permite truncar. Jerarquía tipográfica: el efecto en gris, los números en cian.
 */
export function EffectText({
  text,
  clamp,
  className
}: {
  text: string
  clamp?: number
  className?: string
}) {
  const parts = text.split(/(\+?\d[\d.,]*\s?%?s?)/g)
  const nodes: ReactNode[] = parts.map((p, i) =>
    /^\+?\d/.test(p) ? (
      <span key={i} className="font-semibold text-cyan-300">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  )
  const clampCls =
    clamp === 2 ? "line-clamp-2" : clamp === 3 ? "line-clamp-3" : clamp ? "line-clamp-4" : ""
  return (
    <span className={`${clampCls} ${className ?? ""}`} title={text}>
      {nodes}
    </span>
  )
}
