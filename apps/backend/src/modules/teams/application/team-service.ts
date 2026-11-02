import type { Slug, TeamDraft } from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { TeamNotFound } from "../domain/errors.js"
import { TeamRepository } from "./repository.js"

export class TeamService extends Effect.Service<TeamService>()("TeamService", {
  effect: Effect.gen(function* () {
    const repo = yield* TeamRepository

    const list = repo.list

    const getBySlug = (slug: Slug) =>
      repo.findBySlug(slug).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new TeamNotFound({ slug })),
            onSome: Effect.succeed
          })
        )
      )

    const save = (draft: TeamDraft) => repo.upsert(draft)
    const remove = (slug: Slug) => repo.remove(slug)

    return { list, getBySlug, save, remove } as const
  })
}) {}
