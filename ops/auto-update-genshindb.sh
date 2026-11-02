#!/usr/bin/env bash
# Auto-updater del catálogo: detecta una versión nueva de `genshin-db` en npm,
# la instala, reconstruye la imagen del backend y re-corre el pipeline de datos.
#
# POR QUÉ EXISTE: el Dockerfile usa `bun install --frozen-lockfile`, así que el
# cron de sync diario NUNCA ve personajes/armas/sets nuevos hasta que se bumpea
# el paquete Y se reconstruye la imagen. Este script automatiza justo eso.
#
# Corre semanal por cron (ver ops/README o crontab). Idempotente: si no hay
# versión nueva, sale sin tocar nada. Pensado para PATH mínimo de cron.
set -euo pipefail

REPO=/home/bigmama/.openclaw/workspace/genshin-codex
BUN=/home/bigmama/.bun/bin/bun
NPM=/usr/bin/npm
DOCKER=/usr/bin/docker
COMPOSE_FILE="$REPO/docker-compose.prod.yml"
BACKEND=genshin-backend
LOCKFILE=/tmp/genshin-db-autoupdate.lock

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

# Evita corridas concurrentes (p.ej. si una tarda por el rebuild).
exec 9>"$LOCKFILE"
if ! flock -n 9; then log "otra corrida en curso; salgo."; exit 0; fi

cd "$REPO"

LATEST="$("$NPM" view genshin-db version 2>/dev/null || true)"
CURRENT="$(grep -oE 'genshin-db@[0-9.]+' bun.lock | head -1 | cut -d@ -f2 || true)"

if [ -z "$LATEST" ]; then log "no pude consultar npm (genshin-db); salgo sin cambios."; exit 0; fi
log "genshin-db actual=$CURRENT · última=$LATEST"

if [ "$LATEST" = "$CURRENT" ]; then
  log "ya en la última versión; nada que hacer."
  exit 0
fi

log "versión nueva detectada ($CURRENT -> $LATEST). Actualizando…"

# 1) Bump del manifiesto + refresco del lock.
sed -i -E 's/("genshin-db": ")\^?[0-9.]+(")/\1^'"$LATEST"'\2/' apps/backend/package.json
"$BUN" install >/dev/null 2>&1
NEWLOCK="$(grep -oE 'genshin-db@[0-9.]+' bun.lock | head -1 | cut -d@ -f2 || true)"
if [ "$NEWLOCK" != "$LATEST" ]; then
  log "ERROR: bun.lock quedó en $NEWLOCK, esperaba $LATEST. Aborto."; exit 1
fi

# 2) Reconstruye + relanza el backend con la nueva versión horneada.
"$DOCKER" compose -f "$COMPOSE_FILE" up -d --build "$BACKEND" >/dev/null 2>&1
# Espera a que el contenedor vuelva a responder.
for i in $(seq 1 30); do
  if "$DOCKER" exec "$BACKEND" true 2>/dev/null; then break; fi
  sleep 2
done

# 3) Pipeline de datos (mínimo para que aparezcan los nuevos con build base):
#    sync (catálogo) -> generate-builds (rellena los sin build) ->
#    enrich-stat-targets (deriva targets) -> seed-kqm (restaura targets reales).
run() { "$DOCKER" exec -w /app/apps/backend "$BACKEND" "$BUN" run "$1" 2>&1 | tail -2; }
log "sync…";               run src/worker/sync.ts
log "generate-builds…";    run src/scripts/generate-builds.ts
log "enrich-stat-targets…";run src/worker/enrich-stat-targets.ts
log "seed-kqm…";           run src/worker/seed-kqm.ts

log "listo: genshin-db $LATEST desplegado. NOTA: las builds/comps reales de los"
log "personajes nuevos requieren refrescar genshin.gg aparte (ops/refresh-genshin-gg.sh)."
