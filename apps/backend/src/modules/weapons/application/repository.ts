import type { Slug, Weapon, WeaponDraft } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class WeaponRepository extends Context.Tag("WeaponRepository")<
  WeaponRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Weapon>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<Weapon>>
    readonly upsert: (draft: WeaponDraft) => Effect.Effect<Weapon>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
