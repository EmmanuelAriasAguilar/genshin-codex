import type { ResonatorDraft, Slug } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { ResonatorNotFound } from "../domain/errors.js"
import { ResonatorRepository } from "./repository.js"

export class ResonatorService extends Effect.Service<ResonatorService>()(
  "ResonatorService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* ResonatorRepository

      const list = repo.list

      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new ResonatorNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )

      const save = (draft: ResonatorDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)

      return { list, getBySlug, save, remove } as const
    })
  }
) {}
