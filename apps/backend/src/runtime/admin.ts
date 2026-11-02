import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"

const ADMIN_TOKEN = process.env.ADMIN_TOKEN

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

// El selector no muta datos aunque sea POST: se deja público.
const PUBLIC_POST = new Set(["/teams/suggest"])

/**
 * Guarda de escritura: cualquier método mutante exige `Authorization: Bearer <ADMIN_TOKEN>`.
 * Lecturas (GET) quedan públicas para que los amigos consulten sin login.
 * Si `ADMIN_TOKEN` no está seteado (dev), no bloquea nada.
 */
export const adminGuard = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const needsAuth =
      ADMIN_TOKEN !== undefined &&
      MUTATING.has(req.method) &&
      !PUBLIC_POST.has(new URL(req.url, "http://x").pathname)

    if (!needsAuth) return yield* app

    const header = req.headers["authorization"] ?? ""
    if (header === `Bearer ${ADMIN_TOKEN}`) return yield* app

    return yield* HttpServerResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    )
  })
)
