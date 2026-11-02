import {
  BuildVariant,
  Character,
  CharacterDraft,
  Slug
} from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import { CharacterNotFound, DuplicateBuildVariant } from "../domain/errors.js"
import { CharacterService } from "../application/character-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

/** Rutas HTTP del módulo de personajes. Traduce dominio <-> HTTP y nada más. */
export const charactersRouter = HttpRouter.empty.pipe(
  // GET /characters
  HttpRouter.get(
    "/characters",
    Effect.gen(function* () {
      const svc = yield* CharacterService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(Character))(all)
    })
  ),

  // GET /characters/:slug
  HttpRouter.get(
    "/characters/:slug",
    Effect.gen(function* () {
      const svc = yield* CharacterService
      const { slug } = yield* HttpRouter.params
      const parsed = yield* decodeSlug(slug)
      const character = yield* svc.getBySlug(parsed)
      return yield* HttpServerResponse.schemaJson(Character)(character)
    }).pipe(
      Effect.catchTag("CharacterNotFound", (e: CharacterNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),

  // POST /characters  (upsert completo)
  HttpRouter.post(
    "/characters",
    Effect.gen(function* () {
      const svc = yield* CharacterService
      const draft = yield* HttpServerRequest.schemaBodyJson(CharacterDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(Character)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  ),

  // DELETE /characters/:slug
  HttpRouter.del(
    "/characters/:slug",
    Effect.gen(function* () {
      const svc = yield* CharacterService
      const { slug } = yield* HttpRouter.params
      const parsed = yield* decodeSlug(slug)
      yield* svc.remove(parsed)
      return HttpServerResponse.empty({ status: 204 })
    })
  ),

  // POST /characters/:slug/builds  (agregar variante de build)
  HttpRouter.post(
    "/characters/:slug/builds",
    Effect.gen(function* () {
      const svc = yield* CharacterService
      const { slug } = yield* HttpRouter.params
      const parsed = yield* decodeSlug(slug)
      const variant = yield* HttpServerRequest.schemaBodyJson(BuildVariant)
      const updated = yield* svc.addBuildVariant(parsed, variant)
      return yield* HttpServerResponse.schemaJson(Character)(updated).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    }).pipe(
      Effect.catchTags({
        CharacterNotFound: (e: CharacterNotFound) =>
          HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 }),
        DuplicateBuildVariant: (e: DuplicateBuildVariant) =>
          HttpServerResponse.json(
            { error: "duplicate_variant", variant: e.variantSlug },
            { status: 409 }
          )
      })
    )
  )
)
