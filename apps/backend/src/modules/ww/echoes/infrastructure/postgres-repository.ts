import { type Slug, WwEcho, type WwEchoDraft } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../../db/jsonb-store.js"
import { WwEchoRepository } from "../application/repository.js"

export const WwEchoRepositoryPostgres = Layer.effect(
  WwEchoRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("ww_echoes", WwEcho)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: WwEchoDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (e) => e.createdAt
          })
          const echo: WwEcho = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, echo).pipe(Effect.as(echo))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
