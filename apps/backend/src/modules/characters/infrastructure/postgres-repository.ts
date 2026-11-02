import { Character, type CharacterDraft, type Slug } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../db/jsonb-store.js"
import { CharacterRepository } from "../application/repository.js"

/**
 * Adapter Postgres del CharacterRepository (doc-store JSONB).
 * Los fallos de infra (SqlError/ParseError) se tratan como defects (orDie): no son errores
 * de dominio, así que el puerto queda igual que el in-memory y la app no se entera de SQL.
 */
export const CharacterRepositoryPostgres = Layer.effect(
  CharacterRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("characters", Character)

    const list = store.all.pipe(Effect.orDie)

    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)

    const upsert = (draft: CharacterDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (c) => c.createdAt
          })
          const character: Character = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, character).pipe(Effect.as(character))
        }),
        Effect.orDie
      )

    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
