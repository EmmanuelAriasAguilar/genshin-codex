import type {
  BuildVariant,
  Element,
  Slug,
  Stat,
  WeaponType
} from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"

/**
 * Genera una build BASE ("Genérica") para cada personaje que aún no tenga builds curadas.
 * Heurística (arma por tipo + set por elemento + stats genéricos) para que TODO personaje
 * tenga datos de arranque. NO pisa builds ya curadas por Mane. Refinar desde /admin.
 *
 * Correr: `bun run src/scripts/generate-builds.ts`
 */

// Palabra clave del set "de firma" por elemento (se matchea contra los sets ya sincronizados).
const SET_KEYWORD: Record<Element, string> = {
  Pyro: "crimson witch",
  Hydro: "heart of depth",
  Electro: "thundering fury",
  Cryo: "blizzard strayer",
  Anemo: "viridescent venerer",
  Geo: "archaic petra",
  Dendro: "deepwood memories"
}

const DEFAULT_STATS: Stat[] = ["ATK%", "CritRate", "CritDMG", "ElementalDMGBonus"]

const program = Effect.gen(function* () {
  const charSvc = yield* CharacterService
  const weaponSvc = yield* WeaponService
  const setSvc = yield* ArtifactSetService

  const characters = yield* charSvc.list
  const weapons = yield* weaponSvc.list
  const sets = yield* setSvc.list

  // Mejores armas 5★ por tipo (por ATK base desc), con fallback a 4★.
  const bestWeapons = (type: WeaponType): Slug[] => {
    const ofType = weapons
      .filter((w) => w.type === type)
      .sort((a, b) => (b.baseAtk ?? 0) - (a.baseAtk ?? 0))
    const fives = ofType.filter((w) => w.rarity === 5).slice(0, 3)
    const pick = fives.length > 0 ? fives : ofType.slice(0, 2)
    return pick.map((w) => w.slug)
  }

  const setForElement = (el: Element): Slug[] => {
    const kw = SET_KEYWORD[el]
    const match = sets.find((s) => s.name.toLowerCase().includes(kw))
    const fallback =
      sets.find((s) => s.name.toLowerCase().includes("gladiator")) ??
      sets.find((s) => s.name.toLowerCase().includes("emblem")) ??
      sets[0]
    const chosen = [match?.slug, fallback?.slug].filter(
      (x): x is Slug => Boolean(x)
    )
    // dedup preservando orden
    return [...new Set(chosen)]
  }

  let created = 0
  for (const c of characters) {
    if (c.builds.length > 0) continue // no pisar curación

    const weaponOptions = bestWeapons(c.weaponType)
    const artifactSetOptions = setForElement(c.element)
    if (weaponOptions.length === 0 || artifactSetOptions.length === 0) continue

    const variant: BuildVariant = {
      slug: "generica" as Slug,
      name: "Genérica (base)",
      condition: "Build base autogenerada — ajústala según tu equipo.",
      appliesWithCharacters: [],
      weaponOptions: weaponOptions as [Slug, ...Slug[]],
      artifactSetOptions: artifactSetOptions as [Slug, ...Slug[]],
      statPriority: DEFAULT_STATS,
      notes: "Autogenerada por heurística (arma por tipo + set por elemento). Refinar en /admin."
    }

    yield* charSvc.save({ ...c, builds: [variant] })
    created++
  }

  yield* Effect.log(`generate-builds: ${created} personajes recibieron build base`)
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
