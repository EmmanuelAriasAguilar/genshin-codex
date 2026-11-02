// Extrae el dataset embebido de genshin.gg (builds + comps) desde su bundle JS.
// genshin.gg es una CRA: la data va como JSON.parse('...') dentro de main.<hash>.chunk.js.
// Descubre el chunk dinámicamente (su hash cambia en cada deploy), parsea los literales
// y escribe genshin-gg.json (personajes) + genshin-gg-teams.json (comps con alternatives).
//
// Uso: bun ops/extract-genshin-gg.mjs   (escribe a apps/backend/src/scripts/data/)
import { writeFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const UA = { headers: { "user-agent": "Mozilla/5.0" } }
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "apps/backend/src/scripts/data")

const html = await (await fetch("https://genshin.gg/characters/", UA)).text()
const chunk = html.match(/\/static\/js\/main\.[a-f0-9]+\.chunk\.js/)?.[0]
if (!chunk) { console.error("no encontré el main chunk en genshin.gg"); process.exit(1) }
const js = await (await fetch("https://genshin.gg" + chunk, UA)).text()

function extractLiterals(src) {
  const out = []; let i = 0; const m = "JSON.parse('"
  while (true) {
    const s = src.indexOf(m, i); if (s === -1) break
    let j = s + m.length, buf = ""
    while (j < src.length) {
      const ch = src[j]
      if (ch === "\\") { buf += src[j] + src[j + 1]; j += 2; continue }
      if (ch === "'") break
      buf += ch; j++
    }
    out.push(buf); i = j + 1
  }
  return out
}
// Decodifica el string-literal JS (maneja \x \u \' \\ …) y lo parsea como JSON.
const parse = (buf) => { try { return JSON.parse(Function("return '" + buf + "'")()) } catch { return null } }

const lits = extractLiterals(js)
let chars = null, teams = null
for (const lit of lits) {
  const v = parse(lit)
  if (!Array.isArray(v) || !v.length || typeof v[0] !== "object") continue
  const k = Object.keys(v[0])
  if (!chars && k.includes("weapon") && (k.includes("build") || k.includes("teams")) && !k.includes("engine") && !k.includes("drive")) chars = v
  if (!teams && k.includes("characters") && k.includes("alternatives") && k.includes("popular")) teams = v
}
if (!chars) { console.error("no encontré el array de personajes"); process.exit(1) }

const slimChars = chars.map((c) => ({
  name: c.name, role: c.role ?? "", rarity: String(c.rarity ?? ""),
  element: c.element ?? "", weapon: c.weapon ?? "",
  teams: Array.isArray(c.teams) ? c.teams.map((t) => ({ name: t.name, characters: t.characters })) : [],
  build: c.build ? {
    name: c.build.name ?? "Main", stats: c.build.stats ?? [], substats: c.build.substats ?? [],
    weapons: c.build.weapons ?? [], artifacts: c.build.artifacts ?? []
  } : null
}))
writeFileSync(join(outDir, "genshin-gg.json"), JSON.stringify(slimChars))
if (teams) writeFileSync(join(outDir, "genshin-gg-teams.json"), JSON.stringify(teams))

const withBuild = slimChars.filter((s) => s.build).length
console.log(`chunk=${chunk}`)
console.log(`personajes=${slimChars.length} (con build=${withBuild}) · comps-alt=${teams ? teams.length : 0}`)
