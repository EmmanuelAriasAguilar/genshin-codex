import type {
  Slug,
  WeaponCatalogData,
  WeaponDraft
} from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { WeaponNotFound } from "../domain/errors.js"
import { WeaponRepository } from "./repository.js"

export class WeaponService extends Effect.Service<WeaponService>()(
  "WeaponService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* WeaponRepository

      const list = repo.list

      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new WeaponNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )

      const save = (draft: WeaponDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)

      /** Sync de catálogo: pisa datos objetivos, preserva `suitedRoles` (curado). */
      const syncCatalog = (data: WeaponCatalogData) =>
        repo.findBySlug(data.slug).pipe(
          Effect.flatMap((existing) =>
            repo.upsert({
              ...data,
              suitedRoles: Option.match(existing, {
                onNone: () => [],
                onSome: (w) => w.suitedRoles
              })
            })
          )
        )

      return { list, getBySlug, save, remove, syncCatalog } as const
    })
  }
) {}
