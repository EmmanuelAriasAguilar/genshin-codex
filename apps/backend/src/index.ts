import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { migrate } from "./db/migrate.js"
import { PgLive } from "./db/sql.js"
import { adminGuard } from "./runtime/admin.js"
import { ServicesLive } from "./runtime/live.js"
import { charactersRouter } from "./modules/characters/presentation/http.js"
import { weaponsRouter } from "./modules/weapons/presentation/http.js"
import { artifactsRouter } from "./modules/artifacts/presentation/http.js"
import { teamsRouter } from "./modules/teams/presentation/http.js"
import { resonatorsRouter } from "./modules/ww/resonators/presentation/http.js"
import { wwWeaponsRouter } from "./modules/ww/weapons/presentation/http.js"
import { wwEchoesRouter } from "./modules/ww/echoes/presentation/http.js"
import { wwSonatasRouter } from "./modules/ww/sonatas/presentation/http.js"
import { investmentsRouter } from "./modules/investments/presentation/http.js"

const PORT = Number(process.env.PORT ?? 4901)

// --- Router raíz: health + módulos ---
const appRouter = HttpRouter.concatAll(
  HttpRouter.empty.pipe(
    HttpRouter.get("/health", HttpServerResponse.json({ status: "ok" }))
  ),
  charactersRouter,
  weaponsRouter,
  artifactsRouter,
  teamsRouter,
  resonatorsRouter,
  wwWeaponsRouter,
  wwEchoesRouter,
  wwSonatasRouter,
  investmentsRouter
)

// --- App: router + manejo de errores de parseo + auth + CORS ---
const app = appRouter.pipe(
  Effect.catchTags({
    ParseError: (e) =>
      HttpServerResponse.json(
        { error: "bad_request", detail: e.message },
        { status: 400 }
      ),
    RequestError: () =>
      HttpServerResponse.json({ error: "bad_request" }, { status: 400 })
  }),
  adminGuard,
  HttpMiddleware.cors({
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
)

const HttpLive = app.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress
)

// Migración al arranque (corre durante el build del layer, antes de aceptar requests).
const MigrateLive = Layer.effectDiscard(migrate).pipe(Layer.provide(PgLive))

const MainLive = Layer.mergeAll(HttpLive, MigrateLive).pipe(
  Layer.provide(ServicesLive),
  Layer.provide(BunHttpServer.layer({ port: PORT }))
)

BunRuntime.runMain(Layer.launch(MainLive))
