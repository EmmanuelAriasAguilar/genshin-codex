import { Schema } from "effect"
import { Slug, Stat, Timestamps } from "./common.js"

/**
 * Set de artefactos / reliquias.
 * - bonus2 / bonus4: texto del bono de 2 y 4 piezas (bonus4 opcional: hay sets solo de 2pc)
 * - recommendedMainStats: qué stats principales conviene priorizar en sands/goblet/circlet.
 *   Se modela por slot porque en Genshin la decisión es por pieza.
 */
export const ArtifactSlot = Schema.Literal(
  "Sands",
  "Goblet",
  "Circlet"
)
export type ArtifactSlot = typeof ArtifactSlot.Type

export const RecommendedMainStat = Schema.Struct({
  slot: ArtifactSlot,
  stats: Schema.NonEmptyArray(Stat) // opciones válidas para ese slot, en orden de prioridad
})
export type RecommendedMainStat = typeof RecommendedMainStat.Type

export const ArtifactSet = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  bonus2: Schema.String,
  bonus4: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  recommendedMainStats: Schema.Array(RecommendedMainStat),
  ...Timestamps.fields
})
export type ArtifactSet = typeof ArtifactSet.Type

export const ArtifactSetDraft = ArtifactSet.pipe(
  Schema.omit("createdAt", "updatedAt")
)
export type ArtifactSetDraft = typeof ArtifactSetDraft.Type

/** Datos objetivos del auto-sync. `recommendedMainStats` (curado) NO se pisa. */
export const ArtifactSetCatalogData = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  bonus2: Schema.String,
  bonus4: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String)
})
export type ArtifactSetCatalogData = typeof ArtifactSetCatalogData.Type
