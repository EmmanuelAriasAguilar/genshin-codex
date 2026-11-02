import { Schema } from "effect"
import { Slug, Stat } from "./common.js"

/**
 * Variante de build de un personaje.
 * Un personaje puede tener VARIAS (no una fija) — este es el núcleo del pedido.
 *
 * - condition: cuándo usarla, en texto ("con Furina", "rol on-field", "double hydro"...)
 * - appliesWithCharacters: slugs de personajes con los que aplica esta variante.
 *   Es lo que le da "reglas" al selector de equipos (punto 4/5): al elegir 4 personajes,
 *   se puede sugerir la variante cuya intersección de compañeros haga match.
 * - weaponOptions / artifactSetOptions: opciones ordenadas por prioridad (no una sola fija).
 * - statPriority: prioridad de substats recomendada, en orden.
 */
/**
 * Objetivo de stat aproximado (guía general por arquetipo de build, no cifra oficial por personaje).
 * En Genshin los "stats mínimos" son en su mayoría dependientes del arquetipo y del equipo (sobre todo ER).
 */
export const StatTarget = Schema.Struct({
  stat: Schema.String, // "Crit Rate / Crit DMG", "Maestría Elemental", "Recarga de Energía"…
  target: Schema.String // "~70% / ~140%+ (ratio 1:2)"
})
export type StatTarget = typeof StatTarget.Type

export const BuildVariant = Schema.Struct({
  slug: Slug, // único dentro del personaje (ej: "generica", "con-furina")
  name: Schema.NonEmptyString, // "Genérica", "Con soporte X", "Rol on-field"
  condition: Schema.String,
  appliesWithCharacters: Schema.Array(Slug),
  weaponOptions: Schema.NonEmptyArray(Slug), // slugs de armas, en prioridad
  artifactSetOptions: Schema.NonEmptyArray(Slug), // slugs de sets, en prioridad
  statPriority: Schema.Array(Stat), // prioridad de substats
  // Objetivos de stats aprox. (derivados del arquetipo de la build). Guía general.
  statTargets: Schema.optional(Schema.Array(StatTarget)),
  // Main stats recomendados por slot (texto tal cual la fuente: "HP% / Elemental Mastery").
  mainStats: Schema.optional(
    Schema.Struct({
      sands: Schema.String,
      goblet: Schema.String,
      circlet: Schema.String
    })
  ),
  talentPriority: Schema.optional(Schema.String), // "Normal Attack > Skill > Burst"
  tips: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String)
})
export type BuildVariant = typeof BuildVariant.Type
