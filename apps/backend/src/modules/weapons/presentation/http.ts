import { Slug, Weapon, WeaponDraft } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { WeaponNotFound } from "../domain/errors.js"
import { WeaponService } from "../application/weapon-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const weaponsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/weapons",
    Effect.gen(function* () {
      const svc = yield* WeaponService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(Weapon))(all)
    })
  ),
  HttpRouter.get(
    "/weapons/:slug",
    Effect.gen(function* () {
      const svc = yield* WeaponService
      const { slug } = yield* HttpRouter.params
      const weapon = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(Weapon)(weapon)
    }).pipe(
      Effect.catchTag("WeaponNotFound", (e: WeaponNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/weapons",
    Effect.gen(function* () {
      const svc = yield* WeaponService
      const draft = yield* HttpServerRequest.schemaBodyJson(WeaponDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(Weapon)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  ),
  HttpRouter.del(
    "/weapons/:slug",
    Effect.gen(function* () {
      const svc = yield* WeaponService
      const { slug } = yield* HttpRouter.params
      yield* svc.remove(yield* decodeSlug(slug))
      return HttpServerResponse.empty({ status: 204 })
    })
  )
)
