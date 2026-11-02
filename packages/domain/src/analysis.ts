import { Schema } from "effect"
import { Slug, Timestamps } from "./common.js"

/**
 * Análisis de inversión (orden de jale/pull priority) de un personaje.
 * Precedente para futuros análisis: qué conviene jalar y en qué orden (constelaciones, arma
 * sig., constelaciones de teammates) con el aumento aproximado de daño. Curado desde fuentes
 * (ej. sheets de jamie/kb9v), NO calculado por nosotros.
 */

// Un ítem del orden: qué jalar + su impacto aproximado.
export const InvestmentItem = Schema.Struct({
  rank: Schema.optional(Schema.String), // "1", "2", "opcional"…
  what: Schema.String, // "Nefer C1", "Reliquary of Truth"
  teamDmg: Schema.optional(Schema.String), // aumento de daño de equipo, p.ej. "+18.5%"
  charDmg: Schema.optional(Schema.String), // aumento de daño del personaje
  notes: Schema.optional(Schema.String)
})
export type InvestmentItem = typeof InvestmentItem.Type

// Un escenario (rama): distintos órdenes según cuánto vas a invertir / qué ya tienes.
export const InvestmentScenario = Schema.Struct({
  title: Schema.String, // "Si solo alcanzas un 5★ garantizado"
  items: Schema.Array(InvestmentItem)
})
export type InvestmentScenario = typeof InvestmentScenario.Type

// Comparación directa entre dos inversiones ("Nefer C2 vs Lauma C2 (con Columbina)": "+1.2%").
export const InvestmentComparison = Schema.Struct({
  label: Schema.String,
  value: Schema.String,
  notes: Schema.optional(Schema.String)
})
export type InvestmentComparison = typeof InvestmentComparison.Type

// Tabla cruda del análisis (se preserva tal cual: reparto de daño por miembro, totales, etc.).
export const InvestmentTable = Schema.Struct({
  title: Schema.String,
  columns: Schema.Array(Schema.String),
  rows: Schema.Array(Schema.Array(Schema.String)),
  note: Schema.optional(Schema.String)
})
export type InvestmentTable = typeof InvestmentTable.Type

// Reparto de daño del equipo (para graficar como barras): partes que suman ~100%.
export const InvestmentBreakdown = Schema.Struct({
  title: Schema.String,
  parts: Schema.Array(
    Schema.Struct({ label: Schema.String, share: Schema.Number }) // share en % (0..100)
  )
})
export type InvestmentBreakdown = typeof InvestmentBreakdown.Type

export const InvestmentAnalysis = Schema.Struct({
  slug: Slug,
  character: Schema.NonEmptyString, // nombre visible, "Nefer"
  characterSlug: Schema.optional(Schema.String), // liga al catálogo si existe
  element: Schema.optional(Schema.String),
  source: Schema.Struct({
    author: Schema.String,
    url: Schema.optional(Schema.String)
  }),
  summary: Schema.optional(Schema.String),
  scenarios: Schema.Array(InvestmentScenario),
  optional: Schema.optional(Schema.Array(InvestmentItem)),
  comparisons: Schema.optional(Schema.Array(InvestmentComparison)),
  tables: Schema.optional(Schema.Array(InvestmentTable)),
  breakdowns: Schema.optional(Schema.Array(InvestmentBreakdown)),
  notes: Schema.optional(Schema.Array(Schema.String)),
  ...Timestamps.fields
})
export type InvestmentAnalysis = typeof InvestmentAnalysis.Type

export const InvestmentAnalysisDraft = InvestmentAnalysis.pipe(
  Schema.omit("createdAt", "updatedAt")
)
export type InvestmentAnalysisDraft = typeof InvestmentAnalysisDraft.Type
