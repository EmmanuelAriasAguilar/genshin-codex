import type { Character, CharacterDraft, Slug } from "@genshin-codex/domain"
import { Effect, Layer, Option, Ref } from "effect"
import { CharacterRepository } from "../application/repository.js"

/**
 * Adapter in-memory del CharacterRepository.
 * Cero infraestructura: sirve para arrancar y para tests. Se reemplaza por el adapter
 * de Postgres proveyendo otro Layer sin tocar aplicación ni presentación.
 */
export const CharacterRepositoryInMemory = Layer.effect(
  CharacterRepository,
  Effect.gen(function* () {
    const store = yield* Ref.make(new Map<string, Character>())

    const list = Ref.get(store).pipe(
      Effect.map((m) => Array.from(m.values()))
    )

    const findBySlug = (slug: Slug) =>
      Ref.get(store).pipe(Effect.map((m) => Option.fromNullable(m.get(slug))))

    const upsert = (draft: CharacterDraft) =>
      Ref.modify(store, (m) => {
        const prev = m.get(draft.slug)
        const now = new Date()
        const character: Character = {
          ...draft,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now
        }
        const next = new Map(m)
        next.set(draft.slug, character)
        return [character, next]
      })

    const remove = (slug: Slug) =>
      Ref.update(store, (m) => {
        const next = new Map(m)
        next.delete(slug)
        return next
      })

    return { list, findBySlug, upsert, remove } as const
  })
)
