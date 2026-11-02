import type {
  InvestmentAnalysis,
  InvestmentAnalysisDraft,
  Slug
} from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class InvestmentRepository extends Context.Tag("InvestmentRepository")<
  InvestmentRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<InvestmentAnalysis>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<InvestmentAnalysis>>
    readonly upsert: (draft: InvestmentAnalysisDraft) => Effect.Effect<InvestmentAnalysis>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
