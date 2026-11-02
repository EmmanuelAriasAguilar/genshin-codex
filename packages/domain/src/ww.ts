import { Schema } from "effect"
import { Slug, Timestamps } from "./common.js"

/**
 * Dominio de Wuthering Waves (aditivo — no toca el de Genshin).
 * Gear propio: Echoes + Sonata effects (equivalente a los artefactos de GI, distinta lógica).
 */

export const WwElement = Schema.Literal(
  "Glacio",
  "Fusion",
  "Electro",
  "Aero",
  "Spectro",
  "Havoc"
)
export type WwElement = typeof WwElement.Type

export const WwWeaponType = Schema.Literal(
  "Sword",
  "Rectifier",
  "Gauntlets",
  "Pistols",
  "Broadblade"
)
export type WwWeaponType = typeof WwWeaponType.Type

export const WwRarity = Schema.Literal(4, 5)
export type WwRarity = typeof WwRarity.Type

// Build de un resonador (de wuthering.gg): armas y Sonata sets recomendados.
export const WwBuild = Schema.Struct({
  weapons: Schema.Array(Schema.String), // nombres de arma recomendados (prioridad)
  sonatas: Schema.Array(Schema.String) // Sonata sets recomendados
})
export type WwBuild = typeof WwBuild.Type

// Team comp recomendado (de game8): miembros en orden con su rol.
export const WwTeamMember = Schema.Struct({
  slug: Schema.String, // slug del resonador (match con el catálogo; "" si no está)
  name: Schema.String,
  role: Schema.optional(Schema.String) // Main DPS / Sub-DPS / Support…
})
export type WwTeamMember = typeof WwTeamMember.Type

export const WwTeam = Schema.Struct({
  name: Schema.String, // p.ej. "Jinhsi Coordinated Attack Team"
  members: Schema.Array(WwTeamMember),
  // Sustitutos "flex" de la comp (game8): resonadores que pueden entrar como variante.
  alternatives: Schema.optional(Schema.Array(WwTeamMember))
})
export type WwTeam = typeof WwTeam.Type

export const Resonator = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  element: WwElement,
  weaponType: WwWeaponType,
  rarity: WwRarity,
  icon: Schema.optional(Schema.String),
  tier: Schema.optional(Schema.String), // tier list de wuthering.gg (S/A/B/C/D)
  build: Schema.optional(WwBuild),
  teams: Schema.optional(Schema.Array(WwTeam)), // team comps de game8
  ...Timestamps.fields
})
export type Resonator = typeof Resonator.Type

export const ResonatorDraft = Resonator.pipe(Schema.omit("createdAt", "updatedAt"))
export type ResonatorDraft = typeof ResonatorDraft.Type

// --- Armas WuWa ---
export const WwWeaponRarity = Schema.Literal(1, 2, 3, 4, 5)
export type WwWeaponRarity = typeof WwWeaponRarity.Type

// Un stat con nombre y valor ("ATK" / "27.00%").
export const WwStat = Schema.Struct({
  name: Schema.String,
  value: Schema.String
})
export type WwStat = typeof WwStat.Type

export const WwWeapon = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  type: WwWeaponType,
  rarity: WwWeaponRarity,
  icon: Schema.optional(Schema.String),
  atk: Schema.optional(Schema.Number), // ATK base a nivel máx
  substat: Schema.optional(WwStat), // stat secundario (tipo + valor)
  skill: Schema.optional(Schema.Struct({ name: Schema.String, effect: Schema.String })),
  flavor: Schema.optional(Schema.String), // texto de ambientación
  ...Timestamps.fields
})
export type WwWeapon = typeof WwWeapon.Type

export const WwWeaponDraft = WwWeapon.pipe(Schema.omit("createdAt", "updatedAt"))
export type WwWeaponDraft = typeof WwWeaponDraft.Type

// --- Echoes WuWa (el "gear"; pertenecen a Sonata sets) ---
export const WwEchoCost = Schema.Literal(1, 3, 4)
export type WwEchoCost = typeof WwEchoCost.Type

export const WwEcho = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  icon: Schema.optional(Schema.String),
  cost: WwEchoCost,
  // Sonata sets a los que pertenece (equivalente a los sets de artefactos de GI).
  sonatas: Schema.Array(Schema.String),
  // Main stats posibles de este echo (según su cost); para la ficha detalle.
  mainStats: Schema.optional(Schema.Array(WwStat)),
  ...Timestamps.fields
})
export type WwEcho = typeof WwEcho.Type

export const WwEchoDraft = WwEcho.pipe(Schema.omit("createdAt", "updatedAt"))
export type WwEchoDraft = typeof WwEchoDraft.Type

// --- Sonata sets (bonos de conjunto de Echoes; análogo a los sets de artefactos de GI) ---
// Los umbrales de piezas varían: la mayoría son 2/5, pero hay sets nuevos de solo-3 o solo-2.
// Por eso los bonos son una lista {pieces, effect} en vez de campos fijos bonus2/bonus5.
export const WwSonataBonus = Schema.Struct({
  pieces: Schema.Number,
  effect: Schema.String
})
export type WwSonataBonus = typeof WwSonataBonus.Type

export const WwSonata = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  element: Schema.optional(WwElement),
  icon: Schema.optional(Schema.String),
  bonuses: Schema.Array(WwSonataBonus),
  ...Timestamps.fields
})
export type WwSonata = typeof WwSonata.Type

export const WwSonataDraft = WwSonata.pipe(Schema.omit("createdAt", "updatedAt"))
export type WwSonataDraft = typeof WwSonataDraft.Type
