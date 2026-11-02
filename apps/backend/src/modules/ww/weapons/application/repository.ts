import type { Slug, WwWeapon, WwWeaponDraft } from "@genshin-codex/domain"
import { Context, type Effect, type Option } from "effect"

export class WwWeaponRepository extends Context.Tag("WwWeaponRepository")<
  WwWeaponRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<WwWeapon>>
    readonly findBySlug: (slug: Slug) => Effect.Effect<Option.Option<WwWeapon>>
    readonly upsert: (draft: WwWeaponDraft) => Effect.Effect<WwWeapon>
    readonly remove: (slug: Slug) => Effect.Effect<void>
  }
>() {}
