import { Schema } from "effect"

/**
 * Datos de combate objetivos (de genshin-db) para la calculadora de daño.
 * Todo a personaje nivel 90 / talentos nivel 9. La stat de escalado de cada hit viene
 * del propio juego (ATK por defecto; HP/DEF para escaladores como Hu Tao/Noelle).
 */
export const ScalingStat = Schema.Literal("ATK", "HP", "DEF")
export type ScalingStat = typeof ScalingStat.Type

export const Talent = Schema.Literal("NA", "Skill", "Burst")
export type Talent = typeof Talent.Type

export const DamageHit = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  talent: Talent,
  mult: Schema.Number, // multiplicador a talento 9 (ej. 2.2866 = 228.66%)
  scaling: ScalingStat
})
export type DamageHit = typeof DamageHit.Type

export const CombatData = Schema.Struct({
  baseAtk: Schema.Number, // nivel 90 (base personaje, sin arma)
  baseHp: Schema.Number,
  baseDef: Schema.Number,
  ascStat: Schema.Struct({ stat: Schema.String, value: Schema.Number }), // stat de ascensión
  hits: Schema.Array(DamageHit)
})
export type CombatData = typeof CombatData.Type

/** Stat secundaria de un arma (a nivel 90), para autollenar la calc. */
export const WeaponSubStat = Schema.Struct({
  stat: Schema.String,
  value: Schema.Number
})
export type WeaponSubStat = typeof WeaponSubStat.Type
