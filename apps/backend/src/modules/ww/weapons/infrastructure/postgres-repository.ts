import { type Slug, WwWeapon, type WwWeaponDraft } from "@genshin-codex/domain"
import { Effect, Layer, Option } from "effect"
import { makeJsonbStore } from "../../../../db/jsonb-store.js"
import { WwWeaponRepository } from "../application/repository.js"

export const WwWeaponRepositoryPostgres = Layer.effect(
  WwWeaponRepository,
  Effect.gen(function* () {
    const store = yield* makeJsonbStore("ww_weapons", WwWeapon)

    const list = store.all.pipe(Effect.orDie)
    const findBySlug = (slug: Slug) => store.get(slug).pipe(Effect.orDie)
    const upsert = (draft: WwWeaponDraft) =>
      store.get(draft.slug).pipe(
        Effect.flatMap((existing) => {
          const now = new Date()
          const createdAt = Option.match(existing, {
            onNone: () => now,
            onSome: (w) => w.createdAt
          })
          const weapon: WwWeapon = { ...draft, createdAt, updatedAt: now }
          return store.put(draft.slug, weapon).pipe(Effect.as(weapon))
        }),
        Effect.orDie
      )
    const remove = (slug: Slug) => store.del(slug).pipe(Effect.orDie)

    return { list, findBySlug, upsert, remove } as const
  })
)
