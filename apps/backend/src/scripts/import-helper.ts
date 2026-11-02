import type { BuildVariant, Slug, Stat } from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"

/**
 * Enriquece las builds con el "Genshin Impact Helper Team's Character Builds" sheet:
 * - añade prioridad de talentos + tips a la build principal (genshin.gg no los trae)
 * - agrega variantes por ROLE (varias por personaje)
 * La hoja está discontinuada (v5.x); se usa como capa de enriquecimiento, no reemplaza el
 * catálogo actual. Nombres arma/set se resuelven contra nuestro catálogo (ruido se descarta).
 *
 * Correr: `bun run src/scripts/import-helper.ts` (después de import-gg).
 */

type SheetVariant = {
  role: string
  weapons: string[]
  artifacts: string[]
  mainStats: { sands?: string; goblet?: string; circlet?: string }
  substats: string[]
  talentPriority: string
  tips: string
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
const ALIAS: Record<string, string> = {
  ayaka: "kamisatoayaka", ayato: "kamisatoayato", childe: "tartaglia",
  itto: "aratakiitto", kazuha: "kaedeharakazuha", kokomi: "sangonomiyakokomi",
  raiden: "raidenshogun", heizou: "shikanoinheizou", sara: "kujousara",
  yae: "yaemiko", "hutao": "hutao"
}

const STAT_MAP: Record<string, Stat> = {
  critrate: "CritRate", critdmg: "CritDMG", critratedmg: "CritRate",
  elementalmastery: "ElementalMastery", energyrecharge: "EnergyRecharge",
  atk: "ATK", def: "DEF", hp: "HP", healingbonus: "HealingBonus"
}
const parseStat = (raw: string): Stat[] => {
  const out: Stat[] = []
  for (const part of raw.split("/")) {
    const t = part.trim()
    if (/hp%/i.test(t)) out.push("HP%")
    else if (/atk%/i.test(t)) out.push("ATK%")
    else if (/def%/i.test(t)) out.push("DEF%")
    else {
      const s = STAT_MAP[norm(t)]
      if (s) out.push(s)
      if (norm(t) === "critratedmg") out.push("CritDMG")
    }
  }
  return out
}
const parseSubstats = (arr: string[]): Stat[] => {
  const out: Stat[] = []
  for (const s of arr) for (const st of parseStat(s)) if (!out.includes(st)) out.push(st)
  return out
}
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

const program = Effect.gen(function* () {
  const charSvc = yield* CharacterService
  const weaponSvc = yield* WeaponService
  const setSvc = yield* ArtifactSetService

  const dataUrl = new URL("./data/helper-team-builds.json", import.meta.url)
  const sheet = (yield* Effect.promise(() => Bun.file(dataUrl).json())) as Record<
    string,
    SheetVariant[]
  >

  const chars = yield* charSvc.list
  const weapons = yield* weaponSvc.list
  const sets = yield* setSvc.list
  const byName = new Map(chars.map((c) => [norm(c.name), c]))
  const resolveChar = (n: string) =>
    byName.get(norm(n)) ?? (ALIAS[norm(n)] ? byName.get(ALIAS[norm(n)]!) : undefined)
  const resolveWeapon = (name: string): Slug | null => {
    const n = norm(name)
    if (!n) return null
    return (
      weapons.find((w) => norm(w.name) === n)?.slug ??
      weapons.find((w) => norm(w.name).includes(n) || n.includes(norm(w.name)))?.slug ??
      null
    )
  }
  const resolveSet = (name: string): Slug | null => {
    const n = norm(name)
    if (!n || n.length < 4) return null
    return (
      sets.find((a) => norm(a.name) === n)?.slug ??
      sets.find((a) => norm(a.name).includes(n) || n.includes(norm(a.name)))?.slug ??
      null
    )
  }

  const toVariant = (sv: SheetVariant, slug: string): BuildVariant | null => {
    const weaponOptions = [...new Set(sv.weapons.map(resolveWeapon).filter((x): x is Slug => !!x))]
    const artifactSetOptions = [...new Set(sv.artifacts.map(resolveSet).filter((x): x is Slug => !!x))]
    if (weaponOptions.length === 0 || artifactSetOptions.length === 0) return null
    return {
      slug: slug as Slug,
      name: sv.role || "Build",
      condition: "Rol/variante según Genshin Helper Team.",
      appliesWithCharacters: [],
      weaponOptions: weaponOptions as [Slug, ...Slug[]],
      artifactSetOptions: artifactSetOptions as [Slug, ...Slug[]],
      statPriority: parseSubstats(sv.substats),
      ...(sv.mainStats.sands && sv.mainStats.goblet && sv.mainStats.circlet
        ? { mainStats: { sands: sv.mainStats.sands, goblet: sv.mainStats.goblet, circlet: sv.mainStats.circlet } }
        : {}),
      ...(sv.talentPriority ? { talentPriority: sv.talentPriority } : {}),
      ...(sv.tips ? { tips: sv.tips } : {}),
      notes: "Fuente: Genshin Helper Team"
    }
  }

  let enriched = 0
  let addedVariants = 0
  for (const [name, svs] of Object.entries(sheet)) {
    const c = resolveChar(name)
    if (!c || c.builds.length === 0) continue

    // variantes válidas de la hoja (dedup por rol)
    const seen = new Set<string>()
    const sheetVariants: BuildVariant[] = []
    for (const sv of svs) {
      const roleSlug = slugify(sv.role) || `v${sheetVariants.length + 1}`
      if (seen.has(roleSlug)) continue
      const v = toVariant(sv, roleSlug)
      if (v) { seen.add(roleSlug); sheetVariants.push(v) }
    }
    if (sheetVariants.length === 0) continue

    // enriquece la build "main" (genshin.gg) con talent priority + tips del primer rol
    const primary = sheetVariants[0]!
    const builds = c.builds.map((b) =>
      b.slug === "main"
        ? {
            ...b,
            ...(primary.talentPriority ? { talentPriority: primary.talentPriority } : {}),
            ...(primary.tips ? { tips: primary.tips } : {})
          }
        : b
    )
    // agrega roles extra como variantes (evita duplicar "main")
    const existingSlugs = new Set(builds.map((b) => b.slug))
    for (const v of sheetVariants) {
      if (v.slug === "main" || existingSlugs.has(v.slug)) continue
      builds.push(v)
      existingSlugs.add(v.slug)
      addedVariants++
    }

    yield* charSvc.save({ ...c, builds })
    enriched++
  }

  yield* Effect.log(
    `import-helper: ${enriched} personajes enriquecidos (talent priority/tips) + ${addedVariants} variantes extra`
  )
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
