import type { Slug, WwEcho, WwEchoDraft } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class WwEchoRepository extends Context.Tag("WwEchoRepository")<
  WwEchoRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<WwEcho>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<WwEcho>>
    readonly upsert: (draft: WwEchoDraft) => Effect.Effect<WwEcho>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
