import type { Resonator, ResonatorDraft, Slug } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class ResonatorRepository extends Context.Tag("ResonatorRepository")<
  ResonatorRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Resonator>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<Resonator>>
    readonly upsert: (draft: ResonatorDraft) => Effect.Effect<Resonator>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
