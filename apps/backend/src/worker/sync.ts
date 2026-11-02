import {
  type ArtifactSetCatalogData,
  type CharacterCatalogData,
  type CharacterInvest,
  type CharacterProfile,
  type CombatData,
  type ConstellationInfo,
  type DamageHit,
  type Material,
  type Element,
  type PassiveInfo,
  slugify,
  type Slug,
  type Stat,
  type TalentInfo,
  type WeaponCatalogData,
  type WeaponType
} from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import genshindb from "genshin-db"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"

/**
 * Worker de auto-sync del catálogo (ADR-0001).
 * Fuente: genshin-db (dataset offline, al día con el juego). Hace upsert por slug de datos
 * OBJETIVOS. La curación (builds, roles finos, stats recomendados) se preserva en los servicios.
 *
 * Correr: `bun run sync`. Programar: cron diario (ver README).
 */

const ELEMENTS = new Set<Element>([
  "Pyro",
  "Hydro",
  "Electro",
  "Cryo",
  "Anemo",
  "Geo",
  "Dendro"
])
const WEAPON_TYPES = new Set<WeaponType>([
  "Sword",
  "Claymore",
  "Polearm",
  "Catalyst",
  "Bow"
])

// Los substats de arma que dicen "ATK"/"HP"/"DEF" son porcentuales en el juego.
const STAT_MAP: Record<string, Stat> = {
  "CRIT DMG": "CritDMG",
  "CRIT Rate": "CritRate",
  ATK: "ATK%",
  HP: "HP%",
  DEF: "DEF%",
  "Elemental Mastery": "ElementalMastery",
  "Energy Recharge": "EnergyRecharge",
  "Physical DMG Bonus": "PhysicalDMGBonus",
  "Healing Bonus": "HealingBonus"
}

const asSlug = (name: string) => slugify(name) as Slug
const round = (x: number) => Math.round(x * 100) / 100

// Extrae stats base (nivel 90) + multiplicadores de talento (nivel 9) para la calc de daño.
const TALENT_KEYS = [
  ["combat1", "NA"],
  ["combat2", "Skill"],
  ["combat3", "Burst"]
] as const
const SKIP_LABEL =
  /stamina|cooldown|\bcd\b|duration|interval|absorption|regeneration|healing|shield|drain|per second|hp restored|energy/i

const extractCombat = (name: string): CombatData | undefined => {
  const c = genshindb.characters(name) as any
  if (!c || typeof c.stats !== "function") return undefined
  let s90: any
  try {
    s90 = c.stats(90)
  } catch {
    return undefined
  }
  if (!s90) return undefined

  const t = genshindb.talents(name) as any
  const hits: DamageHit[] = []
  if (t) {
    for (const [ck, talent] of TALENT_KEYS) {
      const block = t[ck]
      const labels: string[] = block?.attributes?.labels ?? []
      const params = block?.attributes?.parameters ?? {}
      for (const label of labels) {
        const m = label.match(/^(.+?)\|\{param(\d+):[^}]+\}(.*)$/)
        if (!m) continue
        const nm = m[1]!.trim()
        const k = m[2]!
        const rest = m[3] ?? ""
        if (!/dmg/i.test(nm) || SKIP_LABEL.test(nm)) continue
        const arr = params["param" + k]
        const mult = Array.isArray(arr) ? arr[8] : undefined
        if (typeof mult !== "number" || mult <= 0 || mult > 100) continue
        const scaling = /max hp|\bhp\b/i.test(rest)
          ? "HP"
          : /\bdef\b/i.test(rest)
            ? "DEF"
            : "ATK"
        hits.push({ key: `${talent}-${k}`, name: nm, talent, mult: round(mult), scaling })
        if (hits.length >= 16) break
      }
    }
  }
  return {
    baseAtk: round(s90.attack),
    baseHp: round(s90.hp),
    baseDef: round(s90.defense),
    ascStat: { stat: c.substatText ?? "", value: round(s90.specialized ?? 0) },
    hits
  }
}

// Costos de materiales: ascensión (personaje) + talentos.
const mats = (arr: any): Material[] =>
  Array.isArray(arr)
    ? arr.map((m: any) => ({ name: String(m.name), count: Number(m.count) }))
    : []

const extractInvest = (name: string): CharacterInvest | undefined => {
  const c = genshindb.characters(name) as any
  const t = genshindb.talents(name) as any
  const ac = c?.costs
  const tc = t?.costs
  if (!ac && !tc) return undefined
  const ascend = ["ascend1", "ascend2", "ascend3", "ascend4", "ascend5", "ascend6"].map(
    (k) => mats(ac?.[k])
  )
  const talent = [
    "lvl2", "lvl3", "lvl4", "lvl5", "lvl6", "lvl7", "lvl8", "lvl9", "lvl10"
  ].map((k) => mats(tc?.[k]))
  return { ascend, talent }
}

// Iconos de talento/constelación en Enka (mismo CDN que icon/art del personaje).
const enka = (f?: string) => (f ? `https://enka.network/ui/${f}.png` : undefined)
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "")

// "Temas" de la ficha (talentos, pasivas, constelaciones, perfil) desde genshin-db.
const extractCodex = (
  name: string
): {
  talents?: TalentInfo[]
  passives?: PassiveInfo[]
  constellations?: ConstellationInfo[]
  profile?: CharacterProfile
} => {
  // Data de "temas" (talentos/constelaciones/perfil) EN ESPAÑOL (genshin-db multi-idioma).
  const ES = { resultLanguage: genshindb.Language.Spanish }
  const c = genshindb.characters(name, ES) as any
  const t = genshindb.talents(name, ES) as any
  const con = genshindb.constellations(name, ES) as any

  const talents: TalentInfo[] = []
  if (t) {
    const TAL = [
      ["combat1", "NA", "filename_combat1"],
      ["combat2", "Skill", "filename_combat2"],
      ["combat3", "Burst", "filename_combat3"]
    ] as const
    for (const [ck, kind, img] of TAL) {
      const b = t[ck]
      if (!b?.name) continue
      talents.push({
        kind,
        name: clean(b.name),
        description: clean(b.description),
        ...(t.images?.[img] ? { icon: enka(t.images[img]) } : {})
      })
    }
  }

  const passives: PassiveInfo[] = []
  if (t) {
    for (const [pk, img] of [
      ["passive1", "filename_passive1"],
      ["passive2", "filename_passive2"],
      ["passive3", "filename_passive3"]
    ] as const) {
      const b = t[pk]
      if (!b?.name) continue
      passives.push({
        name: clean(b.name),
        description: clean(b.description),
        ...(t.images?.[img] ? { icon: enka(t.images[img]) } : {})
      })
    }
  }

  const constellations: ConstellationInfo[] = []
  if (con) {
    for (let i = 1; i <= 6; i++) {
      const b = con[`c${i}`]
      if (!b?.name) continue
      constellations.push({
        level: i,
        name: clean(b.name),
        description: clean(b.description),
        ...(con.images?.[`filename_c${i}`] ? { icon: enka(con.images[`filename_c${i}`]) } : {})
      })
    }
  }

  const profile: CharacterProfile = {
    ...(c?.title ? { title: clean(c.title) } : {}),
    ...(c?.description ? { description: clean(c.description) } : {}),
    ...(c?.affiliation ? { affiliation: clean(c.affiliation) } : {}),
    ...(c?.birthday ? { birthday: clean(c.birthday) } : {}),
    ...(c?.constellation ? { constellationName: clean(c.constellation) } : {}),
    ...(c?.cv
      ? {
          cv: {
            ...(c.cv.english ? { english: clean(c.cv.english) } : {}),
            ...(c.cv.japanese ? { japanese: clean(c.cv.japanese) } : {}),
            ...(c.cv.chinese ? { chinese: clean(c.cv.chinese) } : {}),
            ...(c.cv.korean ? { korean: clean(c.cv.korean) } : {})
          }
        }
      : {})
  }

  return {
    ...(talents.length ? { talents } : {}),
    ...(passives.length ? { passives } : {}),
    ...(constellations.length ? { constellations } : {}),
    ...(Object.keys(profile).length ? { profile } : {})
  }
}

const syncCharacters = Effect.gen(function* () {
  const svc = yield* CharacterService
  const names = genshindb.characters("names", {
    matchCategories: true
  }) as unknown as string[]
  let ok = 0
  for (const name of names) {
    const c = genshindb.characters(name) as any
    if (!c || !ELEMENTS.has(c.elementText) || !WEAPON_TYPES.has(c.weaponText)) {
      continue
    }
    const data: CharacterCatalogData = {
      slug: asSlug(c.name),
      name: c.name,
      element: c.elementText,
      weaponType: c.weaponText,
      rarity: c.rarity === 4 ? 4 : 5,
      ...(c.region ? { region: c.region } : {}),
      ...(c.version ? { version: c.version } : {}),
      ...(c.images?.filename_icon
        ? { icon: `https://enka.network/ui/${c.images.filename_icon}.png` }
        : {}),
      ...(c.images?.filename_gachaSplash
        ? { art: `https://enka.network/ui/${c.images.filename_gachaSplash}.png` }
        : {}),
      ...((): { combat?: CombatData } => {
        const combat = extractCombat(c.name)
        return combat ? { combat } : {}
      })(),
      ...((): { invest?: CharacterInvest } => {
        const invest = extractInvest(c.name)
        return invest ? { invest } : {}
      })(),
      ...extractCodex(c.name)
    }
    yield* svc.syncCatalog(data)
    ok++
  }
  yield* Effect.log(`characters: ${ok} sincronizados`)
})

const syncWeapons = Effect.gen(function* () {
  const svc = yield* WeaponService
  const names = genshindb.weapons("names", {
    matchCategories: true
  }) as unknown as string[]
  let ok = 0
  for (const name of names) {
    const w = genshindb.weapons(name) as any
    if (!w || (w.rarity !== 4 && w.rarity !== 5)) continue
    if (!WEAPON_TYPES.has(w.weaponText)) continue
    const mainStat = STAT_MAP[w.mainStatText]
    if (!mainStat) continue
    const data: WeaponCatalogData = {
      slug: asSlug(w.name),
      name: w.name,
      type: w.weaponText,
      rarity: w.rarity,
      mainStat,
      ...(typeof w.baseAtkValue === "number" ? { baseAtk: w.baseAtkValue } : {}),
      ...(w.effectName ? { passiveName: w.effectName } : {}),
      passiveEffect: w.r1?.description ?? "",
      ...(w.images?.filename_icon
        ? { icon: `https://enka.network/ui/${w.images.filename_icon}.png` }
        : {}),
      ...((): { atk90?: number; subStat?: { stat: string; value: number } } => {
        if (typeof w.stats !== "function") return {}
        try {
          const s = w.stats(90)
          const out: { atk90?: number; subStat?: { stat: string; value: number } } = {
            atk90: round(s.attack)
          }
          if (w.mainStatText && s.specialized > 0) {
            out.subStat = { stat: w.mainStatText, value: round(s.specialized) }
          }
          return out
        } catch {
          return {}
        }
      })(),
      ...((): { ascendCosts?: Material[][] } => {
        const cc = w.costs
        if (!cc) return {}
        const ascendCosts = [
          "ascend1", "ascend2", "ascend3", "ascend4", "ascend5", "ascend6"
        ].map((k) => mats(cc[k]))
        return { ascendCosts }
      })()
    }
    yield* svc.syncCatalog(data)
    ok++
  }
  yield* Effect.log(`weapons: ${ok} sincronizados`)
})

const syncArtifacts = Effect.gen(function* () {
  const svc = yield* ArtifactSetService
  const names = genshindb.artifacts("names", {
    matchCategories: true
  }) as unknown as string[]
  let ok = 0
  for (const name of names) {
    const a = genshindb.artifacts(name) as any
    if (!a || !a.effect2Pc) continue
    const maxRarity = Array.isArray(a.rarityList) ? Math.max(...a.rarityList) : 5
    if (maxRarity < 4) continue
    const data: ArtifactSetCatalogData = {
      slug: asSlug(a.name),
      name: a.name,
      bonus2: a.effect2Pc,
      ...(a.effect4Pc ? { bonus4: a.effect4Pc } : {}),
      ...(a.images?.filename_flower
        ? { icon: `https://enka.network/ui/${a.images.filename_flower}.png` }
        : {})
    }
    yield* svc.syncCatalog(data)
    ok++
  }
  yield* Effect.log(`artifact sets: ${ok} sincronizados`)
})

const program = Effect.gen(function* () {
  yield* Effect.log("auto-sync: empezando…")
  yield* syncCharacters
  yield* syncWeapons
  yield* syncArtifacts
  yield* Effect.log("auto-sync: listo")
}).pipe(Effect.provide(ServicesLive), Effect.provide(PgLive))

BunRuntime.runMain(
  migrate.pipe(Effect.provide(PgLive), Effect.andThen(program))
)
