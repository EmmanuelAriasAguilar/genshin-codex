import { Slug, WwSonata, WwSonataDraft } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { WwSonataNotFound } from "../domain/errors.js"
import { WwSonataService } from "../application/ww-sonata-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const wwSonatasRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/ww/sonatas",
    Effect.gen(function* () {
      const svc = yield* WwSonataService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(WwSonata))(all)
    })
  ),
  HttpRouter.get(
    "/ww/sonatas/:slug",
    Effect.gen(function* () {
      const svc = yield* WwSonataService
      const { slug } = yield* HttpRouter.params
      const s = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(WwSonata)(s)
    }).pipe(
      Effect.catchTag("WwSonataNotFound", (e: WwSonataNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/ww/sonatas",
    Effect.gen(function* () {
      const svc = yield* WwSonataService
      const draft = yield* HttpServerRequest.schemaBodyJson(WwSonataDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(WwSonata)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  )
)
