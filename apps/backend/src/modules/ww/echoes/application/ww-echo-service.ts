import type { Slug, WwEchoDraft } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { WwEchoNotFound } from "../domain/errors.js"
import { WwEchoRepository } from "./repository.js"

export class WwEchoService extends Effect.Service<WwEchoService>()(
  "WwEchoService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* WwEchoRepository
      const list = repo.list
      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new WwEchoNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )
      const save = (draft: WwEchoDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)
      return { list, getBySlug, save, remove } as const
    })
  }
) {}
