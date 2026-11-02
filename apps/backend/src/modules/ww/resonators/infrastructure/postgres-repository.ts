import { Resonator, type ResonatorDraft, type Slug } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../../db/jsonb-store.js"
import { ResonatorRepository } from "../application/repository.js"

export const ResonatorRepositoryPostgres = Layer.effect(
  ResonatorRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("ww_resonators", Resonator)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: ResonatorDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (r) => r.createdAt
          })
          const resonator: Resonator = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, resonator).pipe(Effect.as(resonator))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
