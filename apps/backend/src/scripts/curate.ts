import type {
  BuildVariant,
  Role,
  Slug,
  Stat
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
 * Curación manual de builds meta (varias variantes) para los personajes más jugados.
 * Las armas/sets se declaran por NOMBRE y se resuelven a slug contra el catálogo sincronizado
 * (evita inventar slugs). Reemplaza la build base autogenerada de esos personajes.
 *
 * Correr: `bun run src/scripts/curate.ts`
 */

type VariantSpec = {
  slug: string
  name: string
  condition: string
  appliesWith?: string[]
  weapons: string[] // por nombre
  sets: string[] // por nombre
  stats: Stat[]
  notes?: string
}
type Entry = { slug: string; roles: Role[]; builds: VariantSpec[] }

const DATA: Entry[] = [
  {
    slug: "hu-tao",
    roles: ["DPS"],
    builds: [
      {
        slug: "vaporize",
        name: "Vaporize",
        condition: "Con aplicador de Hydro fuerte (Yelan/Xingqiu/Furina).",
        appliesWith: ["yelan", "xingqiu", "furina"],
        weapons: ["Staff of Homa", "Dragon's Bane"],
        sets: ["Marechaussee Hunter", "Crimson Witch of Flames"],
        stats: ["HP%", "CritRate", "CritDMG", "ElementalMastery"]
      },
      {
        slug: "mono-pyro",
        name: "Mono Pyro / on-field",
        condition: "Equipos Pyro sin trigger de vaporize consistente (Bennett/Xiangling).",
        appliesWith: ["bennett", "xiangling"],
        weapons: ["Staff of Homa"],
        sets: ["Crimson Witch of Flames"],
        stats: ["HP%", "ElementalDMGBonus", "CritDMG", "CritRate"]
      }
    ]
  },
  {
    slug: "neuvillette",
    roles: ["DPS"],
    builds: [
      {
        slug: "on-field",
        name: "On-field DPS",
        condition: "DPS principal de Hydro; ideal con Furina + escudo/heal.",
        appliesWith: ["furina", "kaedehara-kazuha", "zhongli"],
        weapons: ["Tome of the Eternal Flow"],
        sets: ["Marechaussee Hunter"],
        stats: ["HP%", "ElementalDMGBonus", "CritRate", "CritDMG"]
      }
    ]
  },
  {
    slug: "raiden-shogun",
    roles: ["Sub-DPS", "Support"],
    builds: [
      {
        slug: "hypercarry",
        name: "Hypercarry / batería",
        condition: "Sub-DPS de burst + batería de energía.",
        appliesWith: ["kaedehara-kazuha", "bennett"],
        weapons: ["Engulfing Lightning", "The Catch"],
        sets: ["Emblem of Severed Fate"],
        stats: ["EnergyRecharge", "ElementalDMGBonus", "CritRate", "CritDMG"]
      }
    ]
  },
  {
    slug: "nahida",
    roles: ["Sub-DPS", "Support"],
    builds: [
      {
        slug: "quicken",
        name: "Quicken / Hyperbloom",
        condition: "Driver de Dendro para aggravate/hyperbloom.",
        appliesWith: ["raiden-shogun"],
        weapons: ["A Thousand Floating Dreams"],
        sets: ["Deepwood Memories"],
        stats: ["ElementalMastery", "ElementalDMGBonus", "CritRate", "CritDMG"]
      },
      {
        slug: "bloom",
        name: "Bloom (Nilou)",
        condition: "Equipos bloom con Nilou: full EM.",
        appliesWith: ["nilou"],
        weapons: ["A Thousand Floating Dreams"],
        sets: ["Deepwood Memories"],
        stats: ["ElementalMastery", "ElementalMastery", "ElementalMastery"]
      }
    ]
  },
  {
    slug: "kaedehara-kazuha",
    roles: ["Support"],
    builds: [
      {
        slug: "vv",
        name: "VV / EM support",
        condition: "Reduce RES elemental (VV) y buffea con EM. Universal.",
        weapons: ["Freedom-Sworn", "Xiphos' Moonlight", "Favonius Sword"],
        sets: ["Viridescent Venerer"],
        stats: ["ElementalMastery", "ElementalMastery", "ElementalMastery"]
      }
    ]
  },
  {
    slug: "furina",
    roles: ["Support", "Sub-DPS"],
    builds: [
      {
        slug: "buffer",
        name: "Buffer / off-field",
        condition: "Buff por variación de HP; con on-field fuerte + healer.",
        appliesWith: ["neuvillette", "hu-tao"],
        weapons: ["Splendor of Tranquil Waters", "Favonius Sword"],
        sets: ["Golden Troupe"],
        stats: ["HP%", "EnergyRecharge", "CritRate", "CritDMG"]
      }
    ]
  },
  {
    slug: "bennett",
    roles: ["Support", "Healer"],
    builds: [
      {
        slug: "buffer",
        name: "Buffer ATK + heal",
        condition: "Buff de ATK (Noblesse) y cura. En casi cualquier equipo Pyro/vaporize.",
        weapons: ["Favonius Sword", "Mistsplitter Reforged"],
        sets: ["Noblesse Oblige"],
        stats: ["EnergyRecharge", "HP%", "HealingBonus"]
      }
    ]
  },
  {
    slug: "xiangling",
    roles: ["Sub-DPS"],
    builds: [
      {
        slug: "national",
        name: "Off-field Pyro (National)",
        condition: "Pyro off-field; necesita mucha ER (Bennett de batería).",
        appliesWith: ["bennett", "xingqiu", "raiden-shogun"],
        weapons: ["The Catch", "Staff of Homa"],
        sets: ["Emblem of Severed Fate"],
        stats: ["EnergyRecharge", "ElementalDMGBonus", "CritRate", "CritDMG"]
      }
    ]
  }
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

const program = Effect.gen(function* () {
  const charSvc = yield* CharacterService
  const weaponSvc = yield* WeaponService
  const setSvc = yield* ArtifactSetService

  const weapons = yield* weaponSvc.list
  const sets = yield* setSvc.list

  const resolveWeapon = (name: string): Slug | null =>
    weapons.find((w) => norm(w.name) === norm(name))?.slug ??
    weapons.find((w) => norm(w.name).includes(norm(name)))?.slug ??
    null
  const resolveSet = (name: string): Slug | null =>
    sets.find((a) => norm(a.name) === norm(name))?.slug ??
    sets.find((a) => norm(a.name).includes(norm(name)))?.slug ??
    null

  let curated = 0
  const warnings: string[] = []

  for (const entry of DATA) {
    const existing = yield* charSvc.getBySlug(entry.slug as Slug).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
    if (!existing) {
      warnings.push(`personaje no encontrado: ${entry.slug}`)
      continue
    }

    const builds: BuildVariant[] = []
    for (const b of entry.builds) {
      const weaponOptions = b.weapons
        .map(resolveWeapon)
        .filter((x): x is Slug => x !== null)
      const artifactSetOptions = b.sets
        .map(resolveSet)
        .filter((x): x is Slug => x !== null)
      if (weaponOptions.length === 0 || artifactSetOptions.length === 0) {
        warnings.push(
          `${entry.slug}/${b.slug}: sin arma o set resoluble (${b.weapons.join(",")} | ${b.sets.join(",")})`
        )
        continue
      }
      builds.push({
        slug: b.slug as Slug,
        name: b.name,
        condition: b.condition,
        appliesWithCharacters: (b.appliesWith ?? []) as Slug[],
        weaponOptions: weaponOptions as [Slug, ...Slug[]],
        artifactSetOptions: artifactSetOptions as [Slug, ...Slug[]],
        statPriority: b.stats,
        ...(b.notes ? { notes: b.notes } : {})
      })
    }
    if (builds.length === 0) continue

    yield* charSvc.save({
      ...existing,
      roles: entry.roles as [Role, ...Role[]],
      builds
    })
    curated++
  }

  yield* Effect.log(`curate: ${curated}/${DATA.length} personajes curados`)
  for (const w of warnings) yield* Effect.logWarning(w)
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
