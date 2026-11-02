# Genshin Codex

Página de builds/teams de Genshin Impact. Catálogo que se **auto-actualiza** con cada
personaje/arma nuevo + **builds y teams curados** a mano.

- **Front:** TanStack Start (React 19) + Tailwind v4 + react-query. SSR + proxy `/api`.
- **Back:** **Effect** (`@effect/platform` + `@effect/platform-bun` + `@effect/sql-pg`),
  Clean Architecture por módulos.
- **DB:** Postgres (doc-store JSONB por slug).
- **Runtime/PM:** Bun (workspaces).

## Estructura

```
packages/domain        # modelo de dominio en Effect Schema (fuente de verdad back+front)
apps/backend           # API Effect
  src/db/              # PgClient, migración, jsonb-store genérico
  src/modules/<ctx>/   # characters | weapons | artifacts | teams
    domain/            # entidades, errores, reglas
    application/       # puertos (repos) + servicios (casos de uso) + selector
    infrastructure/    # adapters Postgres (in-memory para tests)
    presentation/      # rutas HTTP
  src/worker/sync.ts   # auto-sync del catálogo desde genshin-db
  src/scripts/         # migrate.ts, seed.ts
apps/frontend          # TanStack Start (rutas, selector, admin)
docs/adr               # decisiones de arquitectura
```

**Regla de dependencias:** `presentation → application → domain`. La `infrastructure`
implementa los puertos de `application`. Se cambia in-memory ↔ Postgres proveyendo otro `Layer`.

## Puertos

Elegidos para **no chocar con dev-platform** (que usa 3001/48xx):

- Backend: **4901**
- Frontend dev/prod: **4900** (proxea `/api` → 4901)
- Postgres (docker): **5433**

## Arrancar (dev)

```bash
bun install
docker compose up -d            # Postgres en :5433
bun run migrate                 # crea tablas
bun run seed                    # datos curados (equipo Hu Tao Vaporize + variante)
bun run sync                    # auto-sync catálogo desde genshin-db (~116 pers, 203 armas, 54 sets)

# en dos terminales:
bun run backend                 # API en :4901
bun run web                     # front en :4900  ->  http://localhost:4900
```

## Producción

```bash
bun run build                   # build del frontend (SSR + cliente)
PORT=4901 ADMIN_TOKEN=xxx bun run --filter '@genshin-codex/backend' start
PORT=4900 BACKEND_URL=http://localhost:4901 bun run --filter '@genshin-codex/frontend' start
```

Variables: ver `.env.example` (`DATABASE_URL`, `PORT`, `ADMIN_TOKEN`, `BACKEND_URL`).
Con `ADMIN_TOKEN` seteado, las **escrituras** exigen `Authorization: Bearer <token>`
(las lecturas siempre públicas). El panel `/admin` guarda el token en el navegador.

## Auto-sync programado (cron)

El worker es idempotente y preserva la curación (ADR-0001). Ejemplo de cron diario:

```cron
0 6 * * *  cd /ruta/genshin-codex && bun run sync >> /var/log/genshin-sync.log 2>&1
```

## Endpoints (backend)

| Método | Ruta                          | Auth | Qué hace                              |
|--------|-------------------------------|------|---------------------------------------|
| GET    | `/health`                     | —    | ping                                  |
| GET    | `/characters` `/characters/:slug` | — | catálogo de personajes             |
| POST   | `/characters`                 | ✔    | upsert personaje                      |
| POST   | `/characters/:slug/builds`    | ✔    | agrega variante de build (409 si dup) |
| DELETE | `/characters/:slug`           | ✔    | borra                                 |
| GET    | `/weapons` `/weapons/:slug`   | —    | catálogo de armas                     |
| POST/DELETE | `/weapons[/:slug]`       | ✔    | curación de armas                     |
| GET    | `/artifact-sets[/:slug]`      | —    | catálogo de sets                      |
| POST/DELETE | `/artifact-sets[/:slug]` | ✔    | curación de sets                      |
| GET    | `/teams` `/teams/:slug`       | —    | equipos                               |
| POST/DELETE | `/teams[/:slug]`         | ✔    | curación de equipos                   |
| POST   | `/teams/suggest`              | —    | **selector**: sugiere variante por personaje |

## Modelo de dominio (resumen)

- **Character** = aggregate root; posee sus `builds` (varias variantes, no una fija).
- **BuildVariant** = { nombre, condición, `appliesWithCharacters`, armas/sets en prioridad, statPriority }.
  `appliesWithCharacters` alimenta las reglas del selector.
- **Weapon** / **ArtifactSet** = catálogo con etiquetas de rol / stats recomendados por slot.
- **Team** = 4 slots `(personaje, variante-en-este-equipo)`; `kind: main | variant` con `basedOn`.

**Selector:** para cada personaje elegido, puntúa sus variantes por cuántos de los otros elegidos
aparecen en `appliesWithCharacters`; gana la de mayor score (empate → primera; sin match → default).

Ver `docs/adr/0001-estrategia-de-datos-y-sync.md` para el porqué del híbrido.

## Estado

- [x] Dominio completo (Effect Schema) compartido back+front.
- [x] Backend Effect + Postgres: characters, weapons, artifact-sets, teams (CRUD + selector).
- [x] Auth admin (bearer) en escrituras + CORS + manejo de errores 400/404/409.
- [x] Worker de auto-sync (genshin-db) con upsert que preserva curación.
- [x] Seed con equipo meta real.
- [x] Frontend TanStack Start: inicio, personajes (+detalle/builds), armas, artefactos,
      equipos (+detalle), selector interactivo, panel admin de curación.

### Pendientes / mejoras futuras

- Imágenes/íconos de personajes y armas (genshin-db expone URLs; hoy no se muestran).
- Prefetch SSR de los listados (hoy react-query carga en cliente; hay un parpadeo inicial).
- Editar/borrar builds existentes desde el admin (hoy: agregar build y crear/editar teams).
- Tests automatizados del selector y de los repos.
- Deploy en el VPS (Traefik + subdominio, estilo forgejo/calibre).
```
# genshin-codex
# genshin-codex
