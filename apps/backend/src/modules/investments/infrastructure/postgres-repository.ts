import {
  InvestmentAnalysis,
  type InvestmentAnalysisDraft,
  type Slug
} from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../db/jsonb-store.js"
import { InvestmentRepository } from "../application/repository.js"

export const InvestmentRepositoryPostgres = Layer.effect(
  InvestmentRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("investments", InvestmentAnalysis)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: InvestmentAnalysisDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (s) => s.createdAt
          })
          const analysis: InvestmentAnalysis = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, analysis).pipe(Effect.as(analysis))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
