import { Data } from "effect"

/** Errores de dominio tipados (Effect los propaga en el canal de error, no como excepciones). */
export class CharacterNotFound extends Data.TaggedError("CharacterNotFound")<{
  readonly slug: string
}> {}

export class DuplicateBuildVariant extends Data.TaggedError("DuplicateBuildVariant")<{
  readonly characterSlug: string
  readonly variantSlug: string
}> {}
