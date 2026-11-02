import type { BuildVariant, Role, Slug, Stat, Team } from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"
import { TeamService } from "../modules/teams/application/team-service.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"

/**
 * Importa builds + teams reales desde el dataset de genshin.gg (data/genshin-gg.json).
 * Fuente autoritativa y estructurada. Resuelve nombres de arma/set/personaje contra nuestro
 * catálogo (evita slugs inventados) y SOBREESCRIBE las builds heurísticas por las reales.
 *
 * Correr: `bun run src/scripts/import-genshingg.ts`
 */

type GG = {
  name: string
  role: string
  rarity: string
  element: string
  weapon: string
  teams: { name: string; characters: string[] }[]
  build: {
    name: string
    stats: string[] // [sands, goblet, circlet]
    substats: string[]
    weapons: string[]
    artifacts: string[]
  } | null
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

// genshin.gg usa nombres cortos; nuestro catálogo (genshin-db) usa el nombre completo.
const ALIAS: Record<string, string> = {
  ayaka: "kamisatoayaka",
  ayato: "kamisatoayato",
  childe: "tartaglia",
  itto: "aratakiitto",
  kazuha: "kaedeharakazuha",
  kokomi: "sangonomiyakokomi",
  raiden: "raidenshogun",
  heizou: "shikanoinheizou",
  sara: "kujousara",
  yae: "yaemiko"
}
const stripRefine = (w: string) => w.replace(/\s+R\d+$/i, "").trim()

const STAT_MAP: Record<string, Stat> = {
  "critrate": "CritRate",
  "critdmg": "CritDMG",
  "elementalmastery": "ElementalMastery",
  "energyrecharge": "EnergyRecharge",
  "atk": "ATK",
  "def": "DEF",
  "hp": "HP",
  "healingbonus": "HealingBonus"
}
const parseStat = (raw: string): Stat | null => {
  const t = raw.trim()
  if (t.endsWith("%")) {
    const base = norm(t)
    if (base === "atk") return "ATK%"
    if (base === "hp") return "HP%"
    if (base === "def") return "DEF%"
  }
  return STAT_MAP[norm(t)] ?? null
}
const parseSubstats = (substats: string[]): Stat[] => {
  const out: Stat[] = []
  for (const s of substats) {
    for (const part of s.split("/")) {
      const st = parseStat(part)
      if (st && !out.includes(st)) out.push(st)
    }
  }
  return out
}
const mapRole = (r: string): Role => {
  const x = r.toLowerCase()
  if (x.includes("sub")) return "Sub-DPS"
  if (x.includes("dps")) return "DPS"
  if (x.includes("heal")) return "Healer"
  return "Support"
}

const program = Effect.gen(function* () {
  const charSvc = yield* CharacterService
  const weaponSvc = yield* WeaponService
  const setSvc = yield* ArtifactSetService
  const teamSvc = yield* TeamService

  const dataUrl = new URL("./data/genshin-gg.json", import.meta.url)
  const gg = (yield* Effect.promise(() =>
    Bun.file(dataUrl).json()
  )) as GG[]

  const teamsUrl = new URL("./data/genshin-gg-teams.json", import.meta.url)
  const teamsAlt = (yield* Effect.promise(() =>
    Bun.file(teamsUrl).json()
  )) as {
    name: string
    characters: string[]
    popular?: boolean
    alternatives?: Record<string, string[]>
  }[]

  const chars = yield* charSvc.list
  const weapons = yield* weaponSvc.list
  const sets = yield* setSvc.list

  const charByName = new Map(chars.map((c) => [norm(c.name), c]))
  const resolveChar = (name: string) => {
    const n = norm(name)
    return charByName.get(n) ?? (ALIAS[n] ? charByName.get(ALIAS[n]!) : undefined)
  }
  const resolveWeapon = (name: string): Slug | null => {
    const n = norm(stripRefine(name))
    return (
      weapons.find((w) => norm(w.name) === n)?.slug ??
      weapons.find((w) => norm(w.name).includes(n) || n.includes(norm(w.name)))
        ?.slug ??
      null
    )
  }
  const resolveSet = (name: string): Slug | null => {
    const n = norm(name)
    return (
      sets.find((a) => norm(a.name) === n)?.slug ??
      sets.find((a) => norm(a.name).includes(n) || n.includes(norm(a.name)))?.slug ??
      null
    )
  }

  // --- Builds ---
  const importedSlugs = new Set<string>()
  let builtCount = 0
  for (const g of gg) {
    if (!g.build) continue
    const existing = resolveChar(g.name)
    if (!existing) continue

    const weaponOptions = [
      ...new Set(g.build.weapons.map(resolveWeapon).filter((x): x is Slug => !!x))
    ]
    const artifactSetOptions = [
      ...new Set(
        g.build.artifacts
          .flatMap((a) => a.split("+"))
          .map(resolveSet)
          .filter((x): x is Slug => !!x)
      )
    ]
    if (weaponOptions.length === 0 || artifactSetOptions.length === 0) continue

    const variant: BuildVariant = {
      slug: "main" as Slug,
      name: g.build.name || "Build",
      condition: `Build recomendada (${g.role}).`,
      appliesWithCharacters: [],
      weaponOptions: weaponOptions as [Slug, ...Slug[]],
      artifactSetOptions: artifactSetOptions as [Slug, ...Slug[]],
      statPriority: parseSubstats(g.build.substats),
      ...(g.build.stats.length === 3
        ? {
            mainStats: {
              sands: g.build.stats[0]!,
              goblet: g.build.stats[1]!,
              circlet: g.build.stats[2]!
            }
          }
        : {}),
      notes: "Fuente: genshin.gg"
    }

    yield* charSvc.save({
      ...existing,
      roles: [mapRole(g.role)] as [Role, ...Role[]],
      builds: [variant]
    })
    importedSlugs.add(existing.slug)
    builtCount++
  }

  // --- Teams (dedup por conjunto de miembros) ---
  const oldTeams = yield* teamSvc.list
  yield* Effect.forEach(oldTeams, (t) => teamSvc.remove(t.slug), {
    discard: true
  })

  const usedSlugs = new Set<string>()
  const seenMembers = new Set<string>()
  let teamCount = 0
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

  for (const g of gg) {
    for (const t of g.teams) {
      const members = t.characters
        .map(resolveChar)
        .filter((c): c is NonNullable<typeof c> => !!c && importedSlugs.has(c.slug))
      if (members.length < 3) continue
      const key = [...members.map((m) => m.slug)].sort().join("|")
      if (seenMembers.has(key)) continue
      seenMembers.add(key)

      let slug = slugify(t.name)
      let i = 2
      while (usedSlugs.has(slug)) slug = `${slugify(t.name)}-${i++}`
      usedSlugs.add(slug)

      const team: Team = {
        slug: slug as Slug,
        name: t.name,
        kind: "main",
        members: members.map((m) => ({
          characterSlug: m.slug,
          buildVariantSlug: "main" as Slug
        }))
      }
      yield* teamSvc.save(team)
      teamCount++
    }
  }

  // --- Teams "principal + variantes" (blob#2 con alternatives por slot) ---
  let variantCount = 0
  for (const t of teamsAlt) {
    const core = t.characters.map(resolveChar)
    if (core.some((c) => !c) || core.length < 4) continue
    const coreMembers = core.map((c) => ({
      characterSlug: c!.slug,
      buildVariantSlug: "main" as Slug
    }))
    const carry = core[0]!.name
    let mainSlug = slugify(`${t.name}-comp`)
    let i2 = 2
    while (usedSlugs.has(mainSlug)) mainSlug = `${slugify(t.name)}-comp-${i2++}`
    usedSlugs.add(mainSlug)

    yield* teamSvc.save({
      slug: mainSlug as Slug,
      name: `${carry} — equipo principal`,
      kind: "main",
      ...(t.popular ? { description: "Comp recomendada (genshin.gg)." } : {}),
      members: coreMembers
    })
    teamCount++

    // variantes: alternatives[k] reemplaza al miembro en el índice k (slots flex 1-3)
    for (const [k, alts] of Object.entries(t.alternatives ?? {})) {
      const idx = Number(k)
      if (!Number.isInteger(idx) || idx < 1 || idx >= coreMembers.length) continue
      for (const altName of alts) {
        const alt = resolveChar(altName)
        if (!alt || !importedSlugs.has(alt.slug)) continue
        let vslug = slugify(`${t.name}-${altName}`)
        let i3 = 2
        while (usedSlugs.has(vslug)) vslug = `${slugify(`${t.name}-${altName}`)}-${i3++}`
        usedSlugs.add(vslug)
        const members = coreMembers.map((m, mi) =>
          mi === idx ? { characterSlug: alt.slug, buildVariantSlug: "main" as Slug } : m
        )
        yield* teamSvc.save({
          slug: vslug as Slug,
          name: `${carry} — variante: ${alt.name}`,
          kind: "variant",
          basedOn: mainSlug as Slug,
          members
        })
        variantCount++
      }
    }
  }

  yield* Effect.log(
    `import genshin.gg: ${builtCount} builds, ${teamCount} teams + ${variantCount} variantes`
  )
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
