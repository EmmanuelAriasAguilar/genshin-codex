import { Slug, WwWeapon, WwWeaponDraft } from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { WwWeaponNotFound } from "../domain/errors.js"
import { WwWeaponService } from "../application/ww-weapon-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const wwWeaponsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/ww/weapons",
    Effect.gen(function* () {
      const svc = yield* WwWeaponService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(WwWeapon))(all)
    })
  ),
  HttpRouter.get(
    "/ww/weapons/:slug",
    Effect.gen(function* () {
      const svc = yield* WwWeaponService
      const { slug } = yield* HttpRouter.params
      const w = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(WwWeapon)(w)
    }).pipe(
      Effect.catchTag("WwWeaponNotFound", (e: WwWeaponNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/ww/weapons",
    Effect.gen(function* () {
      const svc = yield* WwWeaponService
      const draft = yield* HttpServerRequest.schemaBodyJson(WwWeaponDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(WwWeapon)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  )
)
