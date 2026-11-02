import type { InvestmentAnalysisDraft, Slug } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { InvestmentNotFound } from "../domain/errors.js"
import { InvestmentRepository } from "./repository.js"

export class InvestmentService extends Effect.Service<InvestmentService>()(
  "InvestmentService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* InvestmentRepository
      const list = repo.list
      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new InvestmentNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )
      const save = (draft: InvestmentAnalysisDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)
      return { list, getBySlug, save, remove } as const
    })
  }
) {}
