import { Schema } from "effect"

/**
 * Costos de materiales (de genshin-db) para la calculadora de inversión.
 * Personaje: 6 fases de ascensión + 9 subidas de talento (nivel 2→10).
 * Arma: 6 fases de ascensión.
 */
export const Material = Schema.Struct({
  name: Schema.String,
  count: Schema.Number
})
export type Material = typeof Material.Type

export const MaterialSet = Schema.Array(Material)
export type MaterialSet = typeof MaterialSet.Type

export const CharacterInvest = Schema.Struct({
  ascend: Schema.Array(MaterialSet), // fases 1..6
  talent: Schema.Array(MaterialSet) // niveles 2..10 (una sola talent; ×3 en la calc)
})
export type CharacterInvest = typeof CharacterInvest.Type
