import { Schema } from "effect"
import { Slug } from "./common.js"

/**
 * Posición en un equipo: qué personaje va y CON QUÉ variante de build en ESTE equipo.
 * (un mismo personaje usa distinta variante según el equipo — por eso la variante vive aquí,
 *  no en el personaje).
 */
export const TeamSlot = Schema.Struct({
  characterSlug: Slug,
  buildVariantSlug: Slug
})
export type TeamSlot = typeof TeamSlot.Type

/**
 * Equipo.
 * - kind "main": el equipo principal de 4.
 * - kind "variant": reemplaza 1-2 personajes del principal. Lista sus 4 miembros resultantes;
 *   si un personaje que se mantiene cambia de variante, simplemente su TeamSlot apunta a otra
 *   buildVariantSlug distinta a la del principal. `basedOn` enlaza al equipo principal.
 */
export const TeamKind = Schema.Literal("main", "variant")
export type TeamKind = typeof TeamKind.Type

export const Team = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  kind: TeamKind,
  description: Schema.optional(Schema.String),
  basedOn: Schema.optional(Slug), // solo variants: slug del equipo principal
  rotation: Schema.optional(Schema.String), // guía de rotación curada
  members: Schema.Array(TeamSlot).pipe(
    Schema.minItems(1),
    Schema.maxItems(4)
  )
})
export type Team = typeof Team.Type

export const TeamDraft = Team
export type TeamDraft = typeof TeamDraft.Type
