import { PgClient } from "@effect/sql-pg"
import { Redacted } from "effect"

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://codex:codex@localhost:5433/genshin_codex"

/** Layer del cliente Postgres. Un solo lugar donde vive la conexión. */
export const PgLive = PgClient.layer({ url: Redacted.make(DATABASE_URL) })
