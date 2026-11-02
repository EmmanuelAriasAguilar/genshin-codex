import { type Slug, Team, type TeamDraft } from "@genshin-codex/domain"
import { Effect, Layer } from "effect"
import { makeJsonbStore } from "../../../db/jsonb-store.js"
import { TeamRepository } from "../application/repository.js"

export const TeamRepositoryPostgres = Layer.effect(
  TeamRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("teams", Team)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: TeamDraft) =>
      store.put(draft.slug, draft).pipe(Effect.as(draft), Effect.orDie)
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
