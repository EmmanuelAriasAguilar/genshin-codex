import { Schema } from "effect"

/**
 * Vocabulario compartido del dominio de Genshin.
 * Todo se modela con Schema para tener validación en runtime + tipos en compile-time
 * (una sola fuente de verdad para backend y frontend).
 */

// --- Elementos (Visión) ---
export const Element = Schema.Literal(
  "Pyro",
  "Hydro",
  "Electro",
  "Cryo",
  "Anemo",
  "Geo",
  "Dendro"
)
export type Element = typeof Element.Type

// --- Rol en el equipo (lo que pidió Mane: DPS/sub-DPS/soporte/healer) ---
export const Role = Schema.Literal("DPS", "Sub-DPS", "Support", "Healer")
export type Role = typeof Role.Type

// --- Rareza ---
// Personajes: solo 4★/5★. Armas: pueden ser 1★–5★ (ej. Black Tassel 3★).
export const Rarity = Schema.Literal(4, 5)
export type Rarity = typeof Rarity.Type

export const WeaponRarity = Schema.Literal(1, 2, 3, 4, 5)
export type WeaponRarity = typeof WeaponRarity.Type

// --- Tipo de arma ---
export const WeaponType = Schema.Literal(
  "Sword",
  "Claymore",
  "Polearm",
  "Catalyst",
  "Bow"
)
export type WeaponType = typeof WeaponType.Type

// --- Stats (para stat principal de armas y prioridad de builds) ---
export const Stat = Schema.Literal(
  "HP",
  "HP%",
  "ATK",
  "ATK%",
  "DEF",
  "DEF%",
  "ElementalMastery",
  "EnergyRecharge",
  "CritRate",
  "CritDMG",
  "ElementalDMGBonus",
  "PhysicalDMGBonus",
  "HealingBonus"
)
export type Stat = typeof Stat.Type

/**
 * Slug: identificador estable derivado del nombre (ej: "hu-tao").
 * Lo usamos como ID de negocio para que el auto-sync pueda hacer upsert
 * sin depender de un UUID generado por la DB.
 */
export const Slug = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  Schema.brand("Slug")
)
export type Slug = typeof Slug.Type

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

// Marca de tiempo ISO para auditoría / detección de cambios en el sync
export const Timestamps = Schema.Struct({
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString
})
