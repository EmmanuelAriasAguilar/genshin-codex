import { type Slug, WwSonata, type WwSonataDraft } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../../db/jsonb-store.js"
import { WwSonataRepository } from "../application/repository.js"

export const WwSonataRepositoryPostgres = Layer.effect(
  WwSonataRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("ww_sonatas", WwSonata)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: WwSonataDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (s) => s.createdAt
          })
          const sonata: WwSonata = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, sonata).pipe(Effect.as(sonata))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
