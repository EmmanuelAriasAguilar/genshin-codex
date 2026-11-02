import { ArtifactSet, ArtifactSetDraft, Slug } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { ArtifactSetNotFound } from "../domain/errors.js"
import { ArtifactSetService } from "../application/artifact-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const artifactsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/artifact-sets",
    Effect.gen(function* () {
      const svc = yield* ArtifactSetService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(ArtifactSet))(all)
    })
  ),
  HttpRouter.get(
    "/artifact-sets/:slug",
    Effect.gen(function* () {
      const svc = yield* ArtifactSetService
      const { slug } = yield* HttpRouter.params
      const set = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(ArtifactSet)(set)
    }).pipe(
      Effect.catchTag("ArtifactSetNotFound", (e: ArtifactSetNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/artifact-sets",
    Effect.gen(function* () {
      const svc = yield* ArtifactSetService
      const draft = yield* HttpServerRequest.schemaBodyJson(ArtifactSetDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(ArtifactSet)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  ),
  HttpRouter.del(
    "/artifact-sets/:slug",
    Effect.gen(function* () {
      const svc = yield* ArtifactSetService
      const { slug } = yield* HttpRouter.params
      yield* svc.remove(yield* decodeSlug(slug))
      return HttpServerResponse.empty({ status: 204 })
    })
  )
)
