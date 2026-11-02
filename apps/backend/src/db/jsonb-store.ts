import { SqlClient } from "@effect/sql"
import { Effect, Option, Schema } from "effect"

/**
 * Store genérico "documento JSONB por slug".
 * Cada entidad se guarda como un doc JSONB validado por su Schema de dominio.
 * Decisión (ver ADR-0001): el dataset es chico y se consulta por slug / lista completa,
 * así que un doc store simple > tablas relacionales con joins. Se puede migrar después.
 */
export const makeJsonbStore = <A, I>(
  table: string,
  schema: Schema.Schema<A, I>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const decode = Schema.decodeUnknown(schema)
    const encode = Schema.encode(schema)

    const all = sql<{ doc: unknown }>`
      select doc from ${sql(table)} order by doc->>'name'
    `.pipe(Effect.flatMap(Effect.forEach((r) => decode(r.doc))))

    const get = (slug: string) =>
      sql<{ doc: unknown }>`
        select doc from ${sql(table)} where slug = ${slug} limit 1
      `.pipe(
        Effect.flatMap((rows) =>
          rows.length > 0
            ? decode(rows[0]!.doc).pipe(Effect.map(Option.some))
            : Effect.succeedNone
        )
      )

    const put = (slug: string, entity: A) =>
      encode(entity).pipe(
        Effect.flatMap((enc) =>
          sql`
            insert into ${sql(table)} (slug, doc)
            values (${slug}, ${JSON.stringify(enc)}::jsonb)
            on conflict (slug) do update set doc = excluded.doc
          `
        ),
        Effect.asVoid
      )

    const del = (slug: string) =>
      sql`delete from ${sql(table)} where slug = ${slug}`.pipe(Effect.asVoid)

    return { all, get, put, del } as const
  })

export type JsonbStore<A> = {
  readonly all: Effect.Effect<ReadonlyArray<A>, unknown, never>
  readonly get: (slug: string) => Effect.Effect<Option.Option<A>, unknown, never>
  readonly put: (slug: string, entity: A) => Effect.Effect<void, unknown, never>
  readonly del: (slug: string) => Effect.Effect<void, unknown, never>
}
