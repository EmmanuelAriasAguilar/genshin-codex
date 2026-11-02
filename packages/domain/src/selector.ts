import { Schema } from "effect"
import { Slug } from "./common.js"

/**
 * Contrato del selector interactivo de teams (punto 4/5 del pedido).
 * Al elegir hasta 4 personajes, para cada uno se sugiere la variante de build cuya
 * `appliesWithCharacters` mejor encaja con los compañeros elegidos.
 */
export const SelectionRequest = Schema.Struct({
  characterSlugs: Schema.Array(Slug).pipe(Schema.minItems(1), Schema.maxItems(4))
})
export type SelectionRequest = typeof SelectionRequest.Type

export const SelectionSuggestion = Schema.Struct({
  characterSlug: Slug,
  suggestedVariant: Schema.NullOr(Slug), // null si el personaje no tiene builds
  variantName: Schema.NullOr(Schema.String),
  score: Schema.Number, // # de compañeros que matchean la condición de la variante
  reason: Schema.String
})
export type SelectionSuggestion = typeof SelectionSuggestion.Type

export const SelectionResult = Schema.Struct({
  input: Schema.Array(Slug),
  suggestions: Schema.Array(SelectionSuggestion)
})
export type SelectionResult = typeof SelectionResult.Type
