import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"

// `bun run migrate` — crea las tablas.
BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive)))
