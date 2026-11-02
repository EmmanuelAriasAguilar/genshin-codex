import {
  type ResonatorDraft,
  type Slug,
  slugify,
  type WwEchoCost,
  type WwEchoDraft,
  type WwBuild,
  type WwElement,
  type WwSonataDraft,
  type WwTeam,
  type WwWeaponDraft,
  type WwWeaponRarity,
  type WwWeaponType
} from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
// Snapshot de team comps (generado en el host por game8-snapshot.ts).
import ww_teams from "../data/ww-teams.json" with { type: "json" }
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ResonatorService } from "../modules/ww/resonators/application/resonator-service.js"
import { ServicesLive } from "../runtime/live.js"
import { WwWeaponService } from "../modules/ww/weapons/application/ww-weapon-service.js"
import { WwEchoService } from "../modules/ww/echoes/application/ww-echo-service.js"
import { WwSonataService } from "../modules/ww/sonatas/application/ww-sonata-service.js"

/**
 * Sync de Wuthering Waves: scrapea el HTML prerenderizado de wuthering.gg (Vue SSR).
 * Fuente estructurada más limpia no existe públicamente; el HTML es estable y parseable.
 * Correr: `bun run ww-sync`.
 */

// Decodifica entidades HTML comunes en los nombres (&#39; &amp; &quot; …).
const decode = (s: string) =>
  s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

// Sanea slugs de wuthering.gg (a veces traen guiones consecutivos: "a---b").
const cleanSlug = (s: string) => s.replace(/-+/g, "-").replace(/^-+|-+$/g, "")

const ELEMENTS = new Set<WwElement>([
  "Glacio",
  "Fusion",
  "Electro",
  "Aero",
  "Spectro",
  "Havoc"
])
const WEAPONS = new Set<WwWeaponType>([
  "Sword",
  "Rectifier",
  "Gauntlets",
  "Pistols",
  "Broadblade"
])

const parseResonators = (html: string): ResonatorDraft[] => {
  const blocks = html.split(`<a href="/characters/`).slice(1)
  const seen = new Map<string, ResonatorDraft>()
  for (const b of blocks) {
    const rawSlug = b.match(/^([a-z0-9-]+)"/)?.[1]
    const slug = rawSlug ? cleanSlug(rawSlug) : undefined
    if (!slug || seen.has(slug)) continue
    const element = b.match(/badge elm[^"]*"\s*title="([^"]+)"/)?.[1] as WwElement | undefined
    const weaponType = b.match(/badge weapon"\s*title="([^"]+)"/)?.[1] as WwWeaponType | undefined
    const name = decode(b.match(/class="name"[^>]*>([^<]+)/)?.[1]?.trim() ?? "")
    if (!element || !weaponType || !name) continue
    if (!ELEMENTS.has(element) || !WEAPONS.has(weaponType)) continue
    const starsBlock = b.match(/class="stars"[\s\S]*?<\/div>/)?.[0] ?? ""
    const stars = (starsBlock.match(/<span/g) ?? []).length
    const rarity = stars === 5 ? 5 : 4
    const iconRel = b.match(/\/images\/iconrolehead[0-9]*\/[A-Za-z0-9_]+\.png/)?.[0]
    const icon = iconRel ? `https://wuthering.gg${iconRel}` : undefined
    seen.set(slug, {
      slug: slug as Slug,
      name,
      element,
      weaponType,
      rarity,
      ...(icon ? { icon } : {})
    })
  }
  return [...seen.values()]
}

// El tipo de arma se codifica en el prefijo del ID del icono (anclado con armas conocidas).
const WEAPON_PREFIX: Record<string, WwWeaponType> = {
  "2101": "Broadblade",
  "2102": "Sword",
  "2103": "Pistols",
  "2104": "Gauntlets",
  "2105": "Rectifier"
}

const parseWeapons = (html: string): WwWeaponDraft[] => {
  const blocks = html.split(`<a href="/weapons/`).slice(1)
  const seen = new Map<string, WwWeaponDraft>()
  for (const b of blocks) {
    const rawSlug = b.match(/^([a-z0-9-]+)"/)?.[1]
    const slug = rawSlug ? cleanSlug(rawSlug) : undefined
    if (!slug || seen.has(slug)) continue
    const rarity = Number(b.match(/class="weapon quality([0-9])"/)?.[1]) as WwWeaponRarity
    const prefix = b.match(/T_IconWeapon([0-9]{4})/)?.[1]
    const name = decode(b.match(/class="name"[^>]*>([^<]+)/)?.[1]?.trim() ?? "")
    const type = prefix ? WEAPON_PREFIX[prefix] : undefined
    if (!name || !type || !(rarity >= 1 && rarity <= 5)) continue
    const iconRel = b.match(/\/images\/items\/T_IconWeapon[0-9]+_UI\.png/)?.[0]
    const icon = iconRel ? `https://wuthering.gg${iconRel}` : undefined
    seen.set(slug, {
      slug: slug as Slug,
      name,
      type,
      rarity,
      ...(icon ? { icon } : {})
    })
  }
  return [...seen.values()]
}

const parseEchoes = (html: string): WwEchoDraft[] => {
  const blocks = html.split(`<a href="/echos/`).slice(1)
  const seen = new Map<string, WwEchoDraft>()
  for (const b of blocks) {
    const rawSlug = b.match(/^([a-z0-9-]+)"/)?.[1]
    const slug = rawSlug ? cleanSlug(rawSlug) : undefined
    if (!slug || seen.has(slug)) continue
    const name = decode(b.match(/class="name"[^>]*>([^<]+)/)?.[1]?.trim() ?? "")
    const costNum = Number(b.match(/class="cost">([0-9])</)?.[1])
    if (!name || ![1, 3, 4].includes(costNum)) continue
    const iconRel = b.match(/\/images\/iconmonstergoods\/[A-Za-z0-9_]+\.png/)?.[0]
    const icon = iconRel ? `https://wuthering.gg${iconRel}` : undefined
    const fetters = b.match(/class="fetters">[\s\S]*?<\/a>/)?.[0] ?? ""
    const sonatas = [
      ...new Set([...fetters.matchAll(/alt="([^"]+)"/g)].map((m) => decode(m[1] ?? "")))
    ].filter(Boolean)
    seen.set(slug, {
      slug: slug as Slug,
      name,
      cost: costNum as WwEchoCost,
      sonatas,
      ...(icon ? { icon } : {})
    })
  }
  return [...seen.values()]
}

// Build de la ficha detalle del resonador: armas recomendadas + Sonata sets.
const parseBuild = (html: string, sonatas: Set<string>): WwBuild | undefined => {
  const wStart = html.indexOf("character-weapon")
  if (wStart < 0) return undefined
  const eStart = html.indexOf("character-echoes")
  const wsec = html.slice(wStart, eStart > wStart ? eStart : wStart + 2500)
  const weapons = [
    ...new Set(
      [
        ...wsec.matchAll(
          /T_IconWeapon[0-9]+_UI\.png[^>]*alt="([^"]+)"|alt="([^"]+)"[^>]*T_IconWeapon/g
        )
      ]
        .map((m) => decode(m[1] ?? m[2] ?? ""))
        .filter((x) => x && x !== "swap Icon")
    )
  ]
  const eIdx = html.indexOf("Best Echo Set")
  const esec = eIdx >= 0 ? html.slice(eIdx, eIdx + 2500) : ""
  const son = [...sonatas].filter((s) => esec.includes(s))
  if (weapons.length === 0 && son.length === 0) return undefined
  return { weapons, sonatas: son }
}

// Tier list: bloques <div class="tier X"> con links a /characters/<slug>.
const parseTierList = (html: string): Map<string, string> => {
  const map = new Map<string, string>()
  const blocks = [
    ...html.matchAll(
      /<div class="tier ([A-Za-z+]+)">([\s\S]*?)(?=<div class="tier [A-Za-z+]+">|<\/main>|$)/g
    )
  ]
  for (const b of blocks) {
    const tier = b[1] ?? ""
    const slugs = [
      ...new Set(
        [...(b[2] ?? "").matchAll(/\/characters\/([a-z0-9-]+)/g)].map((m) =>
          cleanSlug(m[1] ?? "")
        )
      )
    ]
    for (const s of slugs) if (s && !map.has(s)) map.set(s, tier)
  }
  return map
}

// Bonos de Sonata: de la ficha detalle de un echo ("<Name> 2 Set: … 5 Set: …").
const ATTRI: Record<string, WwElement> = {
  Fire: "Fusion",
  Ice: "Glacio",
  Thunder: "Electro",
  Wind: "Aero",
  Light: "Spectro",
  Dark: "Havoc"
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Normaliza apóstrofes curvos → rectos para que los nombres calcen con el texto.
const normApos = (s: string) => s.replace(/[’‘]/g, "'")
// Corta el pie de página de wuthering.gg (no forma parte de ningún bono).
const FOOTER = /Contact us|Privacy Policy|We are not associated/

/**
 * Parsea los bonos de Sonata de la ficha detalle de un echo.
 * Formato: "<Nombre> 2 Set: <e2>. 5 Set: <e5>. <OtroNombre> 2 Set: …"
 * Ojo: solo el PRIMER umbral de cada set trae el nombre; el resto ("5 Set:") va suelto.
 * Por eso ubicamos los "headers" (<nombre conocido> N Set:) y dentro de cada bloque
 * recolectamos todos los umbrales "N Set:".
 */
const parseSonataBonuses = (
  html: string,
  names: string[],
  out: Map<string, WwSonataDraft>
) => {
  let text = normApos(decode(html.replace(/<[^>]+>/g, " "))).replace(/\s+/g, " ")
  const fi = text.search(FOOTER)
  if (fi >= 0) text = text.slice(0, fi)

  // Alternación de nombres conocidos (más largos primero, para no cortar prefijos).
  const alt = [...names]
    .map(normApos)
    .sort((a, b) => b.length - a.length)
    .map(esc)
    .join("|")
  const headers = [...text.matchAll(new RegExp(`(${alt}) ([0-9]) Set:`, "g"))]

  for (let h = 0; h < headers.length; h++) {
    const m = headers[h]!
    const name = m[1]!
    const slug = slugify(name)
    if (out.has(slug)) continue
    const start = (m.index ?? 0) + name.length
    const end = h + 1 < headers.length ? (headers[h + 1]!.index ?? text.length) : text.length
    const block = text.slice(start, end)

    const thresholds = [...block.matchAll(/([0-9]) Set:/g)]
    const bonuses: { pieces: number; effect: string }[] = []
    for (let t = 0; t < thresholds.length; t++) {
      const tm = thresholds[t]!
      const eStart = (tm.index ?? 0) + tm[0].length
      const eEnd = t + 1 < thresholds.length ? (thresholds[t + 1]!.index ?? block.length) : block.length
      const effect = block.slice(eStart, eEnd).trim().replace(/\.$/, "")
      if (effect) bonuses.push({ pieces: Number(tm[1]), effect })
    }
    if (bonuses.length === 0) continue
    // Elemento: del icono de la ficha si está junto al nombre; si no, del propio texto del bono
    // ("<Elemento> DMG + 10%"). Los sets de soporte/ATK/curación no son elementales (queda sin color).
    const em = html.match(new RegExp(`alt="${esc(name)}"[^>]*Attri([A-Za-z]+)`))
    let element: WwElement | undefined = em?.[1] ? ATTRI[em[1]] : undefined
    if (!element) {
      const byText = bonuses
        .map((b) => b.effect.match(/\b(Glacio|Fusion|Electro|Aero|Spectro|Havoc) DMG/)?.[1])
        .find(Boolean)
      if (byText) element = byText as WwElement
    }
    out.set(slug, {
      slug: slug as Slug,
      name,
      bonuses,
      ...(element ? { element } : {})
    })
  }
}

const strip = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()

// Ficha detalle de arma: ATK base + substat (bloque "stats head"), skill (about ability), flavor (about info).
type WwWeaponDetail = {
  atk?: number
  substat?: { name: string; value: string }
  skill?: { name: string; effect: string }
  flavor?: string
}
const parseWeaponDetail = (html: string): WwWeaponDetail => {
  const out: WwWeaponDetail = {}
  const hi = html.indexOf("stats head")
  const head = hi >= 0 ? html.slice(hi, hi + 700) : ""
  const items = [
    ...head.matchAll(/class="text">([^<]*)<\/div>\s*<div class="value">([^<]*)</g)
  ]
  if (items[0]) out.atk = Number(items[0][2])
  if (items[1]) out.substat = { name: (items[1][1] ?? "").trim(), value: (items[1][2] ?? "").trim() }
  const si = html.indexOf("about ability")
  if (si >= 0) {
    const seg = html.slice(si, si + 1800)
    const name = seg.match(/<h3>([^<]*)<\/h3>/)?.[1]
    const after = seg.slice(seg.indexOf("</h3>") + 5)
    const cut = after.search(/<h2|<\/section>/)
    const effect = strip(cut >= 0 ? after.slice(0, cut) : after)
    if (name && effect) out.skill = { name: decode(name.trim()), effect }
  }
  const fi = html.indexOf("about info")
  if (fi >= 0) {
    const seg = html.slice(fi, fi + 2400)
    const cpos = seg.indexOf("container")
    const after = cpos >= 0 ? seg.slice(seg.indexOf(">", cpos) + 1) : seg
    const cut = after.search(/<h2|<\/section>/)
    out.flavor = strip(cut >= 0 ? after.slice(0, cut) : after).slice(0, 500)
  }
  return out
}

// Main stats posibles de un echo (bloque "All Possible Main Stats").
const parseEchoMainStats = (html: string): { name: string; value: string }[] => {
  const i = html.indexOf("All Possible Main Stats")
  if (i < 0) return []
  const after = html.slice(i, i + 3000)
  const e = after.slice(30).search(/<h2/)
  const seg = e >= 0 ? after.slice(0, e + 30) : after
  const out: { name: string; value: string }[] = []
  for (const m of seg.matchAll(
    /<div class="name">([\s\S]*?)<\/div>\s*<div class="val">([^<]*)</g
  )) {
    const name = strip(m[1] ?? "")
      .replace(/\s*Default$/, "")
      .trim()
    const value = (m[2] ?? "").trim()
    if (name) out.push({ name, value })
  }
  return out
}

// Icono de cada Sonata: del <img alt="<sonata>"> en los "fetters" de la lista de echoes.
// wuthering.gg usa un icono propio por set (no solo el del elemento).
const parseSonataIcons = (html: string): Map<string, string> => {
  const map = new Map<string, string>()
  for (const m of html.matchAll(/<img[^>]*alt="([^"]+)"[^>]*>/g)) {
    const tag = m[0]
    const alt = normApos(decode(m[1] ?? ""))
    const rel = tag.match(/\/images\/iconelement\/[A-Za-z0-9_]+\.png/)?.[0]
    if (alt && rel && !map.has(alt)) map.set(alt, `https://wuthering.gg${rel}`)
  }
  return map
}

const fetchText = (url: string) =>
  Effect.tryPromise(() =>
    fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ResonanceCodex sync)" }
    }).then((r) => r.text())
  )

// Team comps de game8: snapshot generado en el host (game8 solo responde por IPv6 y el
// container solo tiene IPv4). Ver game8-snapshot.ts. Ausente/vacío → resonadores sin teams.
const game8Teams = ww_teams as Record<string, WwTeam[]>

const program = Effect.gen(function* () {
  const resSvc = yield* ResonatorService
  const wSvc = yield* WwWeaponService
  const eSvc = yield* WwEchoService
  const sSvc = yield* WwSonataService

  yield* Effect.log("ww-sync: descargando armas…")
  const wHtml = yield* fetchText("https://wuthering.gg/weapons")
  const weapons = parseWeapons(wHtml)
  // Enriquece cada arma con su ficha detalle (ATK base, substat, skill, flavor).
  const weaponsDetailed = yield* Effect.forEach(
    weapons,
    (w) =>
      fetchText(`https://wuthering.gg/weapons/${w.slug}`).pipe(
        Effect.map((h) => ({ ...w, ...parseWeaponDetail(h) })),
        Effect.catchAll(() => Effect.succeed(w))
      ),
    { concurrency: 5 }
  )
  yield* Effect.forEach(weaponsDetailed, (w) => wSvc.save(w), { discard: true })
  const nWSkill = weaponsDetailed.filter((w) => w.skill).length
  yield* Effect.log(`ww-sync: ${weaponsDetailed.length} armas (${nWSkill} con skill)`)

  yield* Effect.log("ww-sync: descargando echoes…")
  const eHtml = yield* fetchText("https://wuthering.gg/echos")
  const echoes = parseEchoes(eHtml)
  const sonataNames = new Set(echoes.flatMap((e) => e.sonatas))
  yield* Effect.log(`ww-sync: ${echoes.length} echoes (${sonataNames.size} sonatas)`)

  // Sonata sets + bonos: el texto del set vive en las fichas detalle de los echoes, pero un
  // echo solo muestra los sets que le tocan — así que barremos TODAS las fichas y acumulamos.
  // (El texto de un set no está en todas sus fichas carrier; barrer todas garantiza cobertura.)
  // De paso sacamos los main stats posibles de cada echo (misma ficha, sin fetch extra).
  const sonataOut = new Map<string, WwSonataDraft>()
  const echoMainStats = new Map<string, { name: string; value: string }[]>()
  yield* Effect.forEach(
    echoes,
    (e) =>
      fetchText(`https://wuthering.gg/echos/${e.slug}`).pipe(
        Effect.map((h) => {
          parseSonataBonuses(h, [...sonataNames], sonataOut)
          const ms = parseEchoMainStats(h)
          if (ms.length) echoMainStats.set(e.slug, ms)
        }),
        Effect.catchAll(() => Effect.void)
      ),
    { concurrency: 5 }
  )
  // Guarda echoes enriquecidos con sus main stats.
  const echoesDetailed = echoes.map((e) => {
    const ms = echoMainStats.get(e.slug)
    return ms ? { ...e, mainStats: ms } : e
  })
  yield* Effect.forEach(echoesDetailed, (e) => eSvc.save(e), { discard: true })
  const nEms = echoesDetailed.filter((e) => e.mainStats).length
  yield* Effect.log(`ww-sync: ${echoesDetailed.length} echoes guardados (${nEms} con main stats)`)
  // Icono por sonata (de los fetters de la lista de echoes).
  const sonataIcons = parseSonataIcons(eHtml)
  const sonatas = [...sonataOut.values()].map((s) => {
    const icon = sonataIcons.get(s.name)
    return icon ? { ...s, icon } : s
  })
  yield* Effect.forEach(sonatas, (s) => sSvc.save(s), { discard: true })
  const nIcon = sonatas.filter((s) => s.icon).length
  yield* Effect.log(`ww-sync: ${sonatas.length} sonata sets con bonos (${nIcon} con icono)`)

  // Tier list.
  const tierHtml = yield* fetchText("https://wuthering.gg/tier-list")
  const tierMap = parseTierList(tierHtml)
  yield* Effect.log(`ww-sync: tier list (${tierMap.size} clasificados)`)

  // Resonadores: catálogo de la lista + build de cada ficha detalle + tier.
  yield* Effect.log("ww-sync: resonadores + builds (fichas detalle)…")
  const resHtml = yield* fetchText("https://wuthering.gg/characters")
  const catalog = parseResonators(resHtml)

  const withBuilds = yield* Effect.forEach(
    catalog,
    (r) =>
      fetchText(`https://wuthering.gg/characters/${r.slug}`).pipe(
        Effect.map((h) => {
          const build = parseBuild(h, sonataNames)
          const tier = tierMap.get(r.slug)
          const teams = game8Teams[r.slug]
          return {
            ...r,
            ...(build ? { build } : {}),
            ...(tier ? { tier } : {}),
            ...(teams?.length ? { teams } : {})
          }
        }),
        Effect.catchAll(() => {
          const tier = tierMap.get(r.slug)
          const teams = game8Teams[r.slug]
          return Effect.succeed({
            ...r,
            ...(tier ? { tier } : {}),
            ...(teams?.length ? { teams } : {})
          })
        })
      ),
    { concurrency: 5 }
  )
  yield* Effect.forEach(withBuilds, (r) => resSvc.save(r), { discard: true })
  const nBuilds = withBuilds.filter((r) => r.build).length
  const nTeams = withBuilds.filter((r) => r.teams?.length).length
  yield* Effect.log(
    `ww-sync: ${withBuilds.length} resonadores (${nBuilds} con build, ${nTeams} con teams)`
  )
}).pipe(Effect.provide(ServicesLive), Effect.provide(PgLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
