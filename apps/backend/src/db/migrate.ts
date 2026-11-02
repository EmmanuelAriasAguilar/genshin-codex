import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

const TABLES = [
  "characters",
  "weapons",
  "artifact_sets",
  "teams",
  "ww_resonators",
  "ww_weapons",
  "ww_echoes",
  "ww_sonatas",
  "investments"
] as const

/**
 * Migración idempotente: crea las tablas doc-store si no existen.
 * Se ejecuta al arrancar el server y desde `bun run migrate`.
 */
export const migrate = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`drop table if exists probe`
  for (const table of TABLES) {
    yield* sql`
      create table if not exists ${sql(table)} (
        slug text primary key,
        doc jsonb not null,
        updated_at timestamptz not null default now()
      )
    `
  }
  yield* Effect.log(`migrate: ${TABLES.length} tablas listas`)
})
