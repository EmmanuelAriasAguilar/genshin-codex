import { ArtifactSet, type ArtifactSetDraft, type Slug } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../db/jsonb-store.js"
import { ArtifactSetRepository } from "../application/repository.js"

export const ArtifactSetRepositoryPostgres = Layer.effect(
  ArtifactSetRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("artifact_sets", ArtifactSet)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: ArtifactSetDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (a) => a.createdAt
          })
          const set: ArtifactSet = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, set).pipe(Effect.as(set))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
