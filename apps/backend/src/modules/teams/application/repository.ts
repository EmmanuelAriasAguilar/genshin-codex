import type { Slug, Team, TeamDraft } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class TeamRepository extends Context.Tag("TeamRepository")<
  TeamRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Team>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<Team>>
    readonly upsert: (draft: TeamDraft) => Effect.Effect<Team>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
