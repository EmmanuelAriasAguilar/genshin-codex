import { SelectionRequest, Slug, Team } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { TeamNotFound } from "../domain/errors.js"
import { TeamService } from "../application/team-service.js"
import { TeamSelector } from "../application/team-selector.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const teamsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/teams",
    Effect.gen(function* () {
      const svc = yield* TeamService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(Team))(all)
    })
  ),
  // POST /teams/suggest  -> selector interactivo
  HttpRouter.post(
    "/teams/suggest",
    Effect.gen(function* () {
      const selector = yield* TeamSelector
      const req = yield* HttpServerRequest.schemaBodyJson(SelectionRequest)
      const result = yield* selector.suggest(req)
      return yield* HttpServerResponse.json(result)
    })
  ),
  HttpRouter.get(
    "/teams/:slug",
    Effect.gen(function* () {
      const svc = yield* TeamService
      const { slug } = yield* HttpRouter.params
      const team = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(Team)(team)
    }).pipe(
      Effect.catchTag("TeamNotFound", (e: TeamNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/teams",
    Effect.gen(function* () {
      const svc = yield* TeamService
      const draft = yield* HttpServerRequest.schemaBodyJson(Team)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(Team)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  ),
  HttpRouter.del(
    "/teams/:slug",
    Effect.gen(function* () {
      const svc = yield* TeamService
      const { slug } = yield* HttpRouter.params
      yield* svc.remove(yield* decodeSlug(slug))
      return HttpServerResponse.empty({ status: 204 })
    })
  )
)
