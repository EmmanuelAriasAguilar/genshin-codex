# ADR 0001 — Estrategia de datos y auto-sync

- **Estado:** Aceptado (v0)
- **Fecha:** 2026-08-16

## Contexto

El pedido incluye "que se actualice cada vez que exista un nuevo personaje / nuevas builds".
Hay que decidir de dónde salen los datos y cómo se mantienen frescos.

Dos naturalezas de datos muy distintas:

1. **Catálogo (objetivo):** personajes, armas, sets de artefactos, stats base, elemento,
   tipo de arma, rareza. Esto es un hecho del juego y existe en APIs públicas
   (genshin-db, ambr.top / gi.yatta.moe, Enka.Network).
2. **Curación (opinado):** roles recomendados, variantes de build, prioridad de stats,
   condiciones de uso, teams. Esto es **conocimiento** (estilo KQM / Genshin.gg).
   **No existe en ninguna API** y cambia con el meta.

## Decisión

**Modelo híbrido:**

- El **catálogo** se auto-sincroniza desde una API pública mediante un job programado
  (worker/cron). En cada corrida hace *upsert por `slug`*: si aparece un personaje nuevo,
  entra automáticamente; si cambia un dato objetivo, se actualiza.
- La **curación** (builds, roles finos, teams) la mantiene Mane vía panel admin (CRUD).
- El upsert de sync **preserva** los campos curados: `syncCatalog` en el `CharacterService`
  solo pisa nombre/elemento/arma/rareza/región/versión y **nunca** toca `builds`.

Un personaje nuevo aparece "a medio curar": con datos objetivos y `builds: []`, listo para
que Mane le agregue variantes. Así "se actualiza solo" sin inventar builds falsas.

## Por qué no las alternativas

- **Todo manual:** cada personaje/arma nuevos serían carga manual repetitiva y propensa a error.
- **Auto todo (scraping de tier-lists):** frágil (se rompe con cada rediseño del sitio),
  legalmente gris y la calidad del dato es peor que la curación propia.

## Consecuencias

- Hace falta un **adapter de fuente de catálogo** (puerto `CatalogSource`) y un **worker** que
  lo dispare (cron diario, o al detectar nuevo patch).
- El `slug` es el **ID de negocio** (derivado del nombre) para que el upsert sea idempotente
  sin depender del ID de la DB.
- El dominio separa `CharacterCatalogData` (lo que trae el sync) de `Character` (agregado completo).

## Fuente de catálogo candidata

- **genshin-db** (npm, offline dataset, multi-idioma) — simple, sin rate limits, ideal para el worker.
- Alternativa/*fallback*: **ambr.top (gi.yatta.moe)** API para datos muy frescos del último patch.
