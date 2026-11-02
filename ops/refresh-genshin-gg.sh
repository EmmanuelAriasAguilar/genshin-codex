#!/usr/bin/env bash
# Refresca builds + comps reales desde genshin.gg y re-corre el pipeline de curación.
# MANUAL (no cron): scrapear el bundle es frágil; correr a mano y revisar el resumen.
#
# Hace: extrae genshin.gg -> data/*.json -> copia al contenedor -> pipeline completo:
#   import-gg -> import-helper -> kqm-links -> generate-builds -> enrich-stat-targets
#   -> seed-kqm -> seed-investments   (reconstruye TODA la curación desde el repo).
set -euo pipefail

REPO=/home/bigmama/.openclaw/workspace/genshin-codex
BUN=/home/bigmama/.bun/bin/bun
DOCKER=/usr/bin/docker
BACKEND=genshin-backend
DATA="$REPO/apps/backend/src/scripts/data"
log() { echo "[$(date -u '+%H:%M:%SZ')] $*"; }

cd "$REPO"

log "extrayendo genshin.gg…"
cp "$DATA/genshin-gg.json"       "$DATA/genshin-gg.json.bak"       2>/dev/null || true
cp "$DATA/genshin-gg-teams.json" "$DATA/genshin-gg-teams.json.bak" 2>/dev/null || true
"$BUN" ops/extract-genshin-gg.mjs

# Salvaguarda: no pisar con data vacía/rota.
COUNT="$("$BUN" -e "console.log(require('$DATA/genshin-gg.json').length)")"
if [ "$COUNT" -lt 100 ]; then log "ABORTO: extracción sospechosa ($COUNT personajes)."; exit 1; fi
log "extraídos $COUNT personajes."

log "copiando data al contenedor…"
"$DOCKER" cp "$DATA/genshin-gg.json"       "$BACKEND:/app/apps/backend/src/scripts/data/genshin-gg.json"
"$DOCKER" cp "$DATA/genshin-gg-teams.json" "$BACKEND:/app/apps/backend/src/scripts/data/genshin-gg-teams.json"

run() { log "$1…"; "$DOCKER" exec -w /app/apps/backend "$BACKEND" "$BUN" run "$2" 2>&1 | tail -1; }
run "import-gg"           src/scripts/import-genshingg.ts
run "import-helper"       src/scripts/import-helper.ts
run "kqm-links"           src/scripts/kqm-links.ts
run "generate-builds"     src/scripts/generate-builds.ts
run "enrich-stat-targets" src/worker/enrich-stat-targets.ts
run "seed-kqm"            src/worker/seed-kqm.ts
run "seed-investments"    src/worker/seed-investments.ts
log "listo. Revisa el sitio."
