import type {
  ArtifactSetCatalogData,
  ArtifactSetDraft,
  Slug
} from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { ArtifactSetNotFound } from "../domain/errors.js"
import { ArtifactSetRepository } from "./repository.js"

export class ArtifactSetService extends Effect.Service<ArtifactSetService>()(
  "ArtifactSetService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* ArtifactSetRepository

      const list = repo.list

      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new ArtifactSetNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )

      const save = (draft: ArtifactSetDraft) => repo.upsert(draft)
      const remove = (slug: Slug) => repo.remove(slug)

      /** Sync: pisa bonos objetivos, preserva `recommendedMainStats` (curado). */
      const syncCatalog = (data: ArtifactSetCatalogData) =>
        repo.findBySlug(data.slug).pipe(
          Effect.flatMap((existing) =>
            repo.upsert({
              ...data,
              recommendedMainStats: Option.match(existing, {
                onNone: () => [],
                onSome: (a) => a.recommendedMainStats
              })
            })
          )
        )

      return { list, getBySlug, save, remove, syncCatalog } as const
    })
  }
) {}
