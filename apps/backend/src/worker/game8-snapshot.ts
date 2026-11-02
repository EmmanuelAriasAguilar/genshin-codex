import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { WwTeam } from "@genshin-codex/domain"
import { parseGame8Ids, parseGame8Teams } from "./game8.js"

/**
 * Genera el snapshot de team comps de game8 → `../data/ww-teams.json`.
 * CORRE EN EL HOST (no en el container): game8/CloudFront solo responde por IPv6 y el
 * container Docker solo tiene egress IPv4. El sync (ww-sync.ts) lee este JSON.
 * Refrescar: `bun run src/worker/game8-snapshot.ts` en el host + redeploy del backend.
 */

const UA = "Mozilla/5.0 (compat; ResonanceCodex)"
const OUT = join(dirname(new URL(import.meta.url).pathname), "../data/ww-teams.json")
const API = process.env.CODEX_API ?? "https://genshin.emmanuelariasa.com/api"

const get = (url: string) =>
  fetch(url, { headers: { "User-Agent": UA } }).then((r) => r.text())

const mapLimit = async <T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) => {
  const out: R[] = []
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  })
  await Promise.all(workers)
  return out
}

const main = async () => {
  const roster = (await fetch(`${API}/ww/resonators`).then((r) => r.json())) as {
    slug: string
    name: string
  }[]
  const byName = new Map<string, string>()
  for (const r of roster) {
    byName.set(r.name.toLowerCase(), r.slug)
    byName.set(r.slug, r.slug)
  }

  const ids = parseGame8Ids(await get("https://game8.co/games/Wuthering-Waves/archives/454729"))
  console.log(`game8-snapshot: ${ids.size} IDs, ${roster.length} resonadores`)

  const targets = roster.filter((r) => ids.has(r.slug))
  const snapshot: Record<string, WwTeam[]> = {}
  await mapLimit(targets, 5, async (r) => {
    const id = ids.get(r.slug)!
    try {
      const teams = parseGame8Teams(
        await get(`https://game8.co/games/Wuthering-Waves/archives/${id}`),
        byName
      )
      if (teams.length) snapshot[r.slug] = teams
    } catch (e) {
      console.log(`  ! ${r.slug}: ${(e as Error).message}`)
    }
  })

  const withTeams = Object.keys(snapshot).length
  const totalTeams = Object.values(snapshot).reduce((n, t) => n + t.length, 0)
  await mkdir(dirname(OUT), { recursive: true })
  await Bun.write(OUT, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(
    `game8-snapshot: ${withTeams} resonadores con teams (${totalTeams} comps) → ${OUT}`
  )
}

main()
