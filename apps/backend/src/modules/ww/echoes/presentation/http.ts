import { Slug, WwEcho, WwEchoDraft } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { WwEchoNotFound } from "../domain/errors.js"
import { WwEchoService } from "../application/ww-echo-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const wwEchoesRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/ww/echoes",
    Effect.gen(function* () {
      const svc = yield* WwEchoService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(WwEcho))(all)
    })
  ),
  HttpRouter.get(
    "/ww/echoes/:slug",
    Effect.gen(function* () {
      const svc = yield* WwEchoService
      const { slug } = yield* HttpRouter.params
      const e = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(WwEcho)(e)
    }).pipe(
      Effect.catchTag("WwEchoNotFound", (err: WwEchoNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: err.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/ww/echoes",
    Effect.gen(function* () {
      const svc = yield* WwEchoService
      const draft = yield* HttpServerRequest.schemaBodyJson(WwEchoDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(WwEcho)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  )
)
