import type { ArtifactSet, ArtifactSetDraft, Slug } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class ArtifactSetRepository extends Context.Tag("ArtifactSetRepository")<
  ArtifactSetRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<ArtifactSet>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<ArtifactSet>>
    readonly upsert: (draft: ArtifactSetDraft) => Effect.Effect<ArtifactSet>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
