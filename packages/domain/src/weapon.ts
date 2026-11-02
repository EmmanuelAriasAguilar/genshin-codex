import { Schema } from "effect"
import { WeaponSubStat } from "./combat.js"
import { Role, Slug, Stat, Timestamps, WeaponRarity, WeaponType } from "./common.js"
import { MaterialSet } from "./invest.js"

/**
 * Arma del catálogo.
 * - mainStat: substat principal del arma (ej: CritDMG)
 * - passive: efecto pasivo en texto libre (los efectos son muy variados para modelarlos todos)
 * - suitedRoles: etiquetas de a qué rol(es) le conviene (lo que pidió Mane)
 */
export const Weapon = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  type: WeaponType,
  rarity: WeaponRarity,
  mainStat: Stat,
  baseAtk: Schema.optional(Schema.Number),
  passiveName: Schema.optional(Schema.String),
  passiveEffect: Schema.String,
  icon: Schema.optional(Schema.String),
  atk90: Schema.optional(Schema.Number), // ATK base a nivel 90 (para la calc)
  subStat: Schema.optional(WeaponSubStat),
  ascendCosts: Schema.optional(Schema.Array(MaterialSet)), // 6 fases de ascensión
  suitedRoles: Schema.Array(Role),
  ...Timestamps.fields
})
export type Weapon = typeof Weapon.Type

// Payload de creación/actualización (sin timestamps, los pone la infra)
export const WeaponDraft = Weapon.pipe(
  Schema.omit("createdAt", "updatedAt")
)
export type WeaponDraft = typeof WeaponDraft.Type

/** Datos objetivos que trae el auto-sync. `suitedRoles` (curado) NO se pisa. */
export const WeaponCatalogData = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  type: WeaponType,
  rarity: WeaponRarity,
  mainStat: Stat,
  baseAtk: Schema.optional(Schema.Number),
  passiveName: Schema.optional(Schema.String),
  passiveEffect: Schema.String,
  icon: Schema.optional(Schema.String),
  atk90: Schema.optional(Schema.Number),
  subStat: Schema.optional(WeaponSubStat),
  ascendCosts: Schema.optional(Schema.Array(MaterialSet))
})
export type WeaponCatalogData = typeof WeaponCatalogData.Type
