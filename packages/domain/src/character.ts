import { Schema } from "effect"
import { BuildVariant } from "./build.js"
import { CharacterProfile, ConstellationInfo, PassiveInfo, TalentInfo } from "./codex.js"
import { CombatData } from "./combat.js"
import { Element, Rarity, Role, Slug, Timestamps, WeaponType } from "./common.js"
import { CharacterInvest } from "./invest.js"

/**
 * Personaje = aggregate root. "Posee" sus variantes de build (composición DDD):
 * las builds no tienen vida fuera del personaje, así que viven dentro del agregado.
 *
 * - roles: array porque muchos personajes flexean rol según el equipo (ej: DPS y Sub-DPS).
 * - builds: múltiples variantes (lo pedido: "no una sola build fija").
 * - version: patch de Genshin en que salió (útil para el sync incremental).
 */
export const Character = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  element: Element,
  weaponType: WeaponType,
  rarity: Rarity,
  roles: Schema.NonEmptyArray(Role),
  region: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  art: Schema.optional(Schema.String), // arte splash (gacha) para la ficha
  kqmUrl: Schema.optional(Schema.String), // link a la guía completa de KeqingMains
  combat: Schema.optional(CombatData), // stats base + multiplicadores (calc de daño)
  invest: Schema.optional(CharacterInvest), // costos de ascensión + talentos
  talents: Schema.optional(Schema.Array(TalentInfo)), // NA / Skill / Burst (de genshin-db)
  passives: Schema.optional(Schema.Array(PassiveInfo)), // talentos pasivos
  constellations: Schema.optional(Schema.Array(ConstellationInfo)), // C1–C6
  profile: Schema.optional(CharacterProfile), // lore / perfil
  builds: Schema.Array(BuildVariant),
  ...Timestamps.fields
})
export type Character = typeof Character.Type

// Draft para crear/actualizar: sin timestamps.
export const CharacterDraft = Character.pipe(
  Schema.omit("createdAt", "updatedAt")
)
export type CharacterDraft = typeof CharacterDraft.Type

/**
 * Payload que envía el auto-sync del catálogo (solo datos objetivos de la API pública).
 * NO incluye builds/roles curados: esos los conserva el upsert para no pisar tu curación.
 */
export const CharacterCatalogData = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  element: Element,
  weaponType: WeaponType,
  rarity: Rarity,
  region: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  art: Schema.optional(Schema.String),
  combat: Schema.optional(CombatData),
  invest: Schema.optional(CharacterInvest),
  talents: Schema.optional(Schema.Array(TalentInfo)),
  passives: Schema.optional(Schema.Array(PassiveInfo)),
  constellations: Schema.optional(Schema.Array(ConstellationInfo)),
  profile: Schema.optional(CharacterProfile)
})
export type CharacterCatalogData = typeof CharacterCatalogData.Type
