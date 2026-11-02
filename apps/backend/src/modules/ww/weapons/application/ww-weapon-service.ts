import type { Slug, WwWeaponDraft } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { WwWeaponNotFound } from "../domain/errors.js"
import { WwWeaponRepository } from "./repository.js"

export class WwWeaponService extends Effect.Service<WwWeaponService>()(
  "WwWeaponService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* WwWeaponRepository
      const list = repo.list
      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new WwWeaponNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )
      const save = (draft: WwWeaponDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)
      return { list, getBySlug, save, remove } as const
    })
  }
) {}
