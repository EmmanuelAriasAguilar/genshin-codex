import { Resonator, ResonatorDraft, Slug } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { ResonatorNotFound } from "../domain/errors.js"
import { ResonatorService } from "../application/resonator-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const resonatorsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/ww/resonators",
    Effect.gen(function* () {
      const svc = yield* ResonatorService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(Resonator))(all)
    })
  ),
  HttpRouter.get(
    "/ww/resonators/:slug",
    Effect.gen(function* () {
      const svc = yield* ResonatorService
      const { slug } = yield* HttpRouter.params
      const r = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(Resonator)(r)
    }).pipe(
      Effect.catchTag("ResonatorNotFound", (e: ResonatorNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/ww/resonators",
    Effect.gen(function* () {
      const svc = yield* ResonatorService
      const draft = yield* HttpServerRequest.schemaBodyJson(ResonatorDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(Resonator)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  )
)
