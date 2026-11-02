import type { Character, CharacterDraft, Slug } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

/**
 * Puerto (interface) del repositorio de personajes.
 * La aplicación depende de ESTO, no de Postgres ni de un Map. Cambiar de in-memory a
 * Postgres = proveer otro Layer que implemente esta Tag. Eso es ports & adapters.
 */
export class CharacterRepository extends Context.Tag("CharacterRepository")<
  CharacterRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Character>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<Character>>
    readonly upsert: (draft: CharacterDraft) => Effect.Effect<Character>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
