import { Schema } from "effect"

/**
 * "Temas" de la ficha de un personaje (estilo mobalytics/wiki), tomados de genshin-db
 * (fuente canónica, siempre al día): talentos de combate, talentos pasivos, constelaciones
 * y perfil/lore. Son datos OBJETIVOS del juego → los puebla el auto-sync, no la curación.
 */

/** Talento de combate: Ataque Normal (NA), Habilidad Elemental (Skill) o Ráfaga (Burst). */
export const TalentInfo = Schema.Struct({
  kind: Schema.Literal("NA", "Skill", "Burst"),
  name: Schema.String,
  description: Schema.String,
  icon: Schema.optional(Schema.String)
})
export type TalentInfo = typeof TalentInfo.Type

/** Talento pasivo (ascensión / utilidad). */
export const PassiveInfo = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  icon: Schema.optional(Schema.String)
})
export type PassiveInfo = typeof PassiveInfo.Type

/** Constelación C1–C6. */
export const ConstellationInfo = Schema.Struct({
  level: Schema.Number, // 1..6
  name: Schema.String,
  description: Schema.String,
  icon: Schema.optional(Schema.String)
})
export type ConstellationInfo = typeof ConstellationInfo.Type

/** Actores de voz por idioma. */
export const VoiceActors = Schema.Struct({
  english: Schema.optional(Schema.String),
  japanese: Schema.optional(Schema.String),
  chinese: Schema.optional(Schema.String),
  korean: Schema.optional(Schema.String)
})
export type VoiceActors = typeof VoiceActors.Type

/** Perfil / lore del personaje (no gameplay). */
export const CharacterProfile = Schema.Struct({
  title: Schema.optional(Schema.String), // "Fragrance in Thaw"
  description: Schema.optional(Schema.String),
  affiliation: Schema.optional(Schema.String), // "Wangsheng Funeral Parlor"
  birthday: Schema.optional(Schema.String), // "July 15"
  constellationName: Schema.optional(Schema.String), // "Papilio Charontis"
  cv: Schema.optional(VoiceActors)
})
export type CharacterProfile = typeof CharacterProfile.Type
