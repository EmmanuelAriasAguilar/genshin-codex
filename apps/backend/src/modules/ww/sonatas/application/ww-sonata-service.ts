import type { Slug, WwSonataDraft } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { WwSonataNotFound } from "../domain/errors.js"
import { WwSonataRepository } from "./repository.js"

export class WwSonataService extends Effect.Service<WwSonataService>()(
  "WwSonataService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* WwSonataRepository
      const list = repo.list
      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new WwSonataNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )
      const save = (draft: WwSonataDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)
      return { list, getBySlug, save, remove } as const
    })
  }
) {}
