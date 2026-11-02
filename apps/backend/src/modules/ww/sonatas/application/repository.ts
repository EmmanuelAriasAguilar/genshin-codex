import type { Slug, WwSonata, WwSonataDraft } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class WwSonataRepository extends Context.Tag("WwSonataRepository")<
  WwSonataRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<WwSonata>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<WwSonata>>
    readonly upsert: (draft: WwSonataDraft) => Effect.Effect<WwSonata>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
