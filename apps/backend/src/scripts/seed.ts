import type {
  ArtifactSetDraft,
  CharacterDraft,
  Slug,
  TeamDraft,
  WeaponDraft
} from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"
import { TeamService } from "../modules/teams/application/team-service.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"

const s = (x: string) => x as Slug

// --- Personajes con builds curadas (equipo Hu Tao Vaporize) ---
const characters: CharacterDraft[] = [
  {
    slug: s("hu-tao"),
    name: "Hu Tao",
    element: "Pyro",
    weaponType: "Polearm",
    rarity: 5,
    roles: ["DPS"],
    region: "Liyue",
    builds: [
      {
        slug: s("vaporize"),
        name: "Vaporize (on-field)",
        condition: "Con un aplicador de Hydro fuerte (Yelan/Xingqiu/Furina).",
        appliesWithCharacters: [s("yelan"), s("xingqiu"), s("furina")],
        weaponOptions: [s("staff-of-homa"), s("deathmatch")],
        artifactSetOptions: [s("marechaussee-hunter"), s("crimson-witch-of-flames")],
        statPriority: ["HP%", "CritRate", "CritDMG", "ElementalMastery"],
        notes: "CRIT ~60/160 baseline. EM en sands si el equipo no da suficiente daño de vape."
      }
    ]
  },
  {
    slug: s("yelan"),
    name: "Yelan",
    element: "Hydro",
    weaponType: "Bow",
    rarity: 5,
    roles: ["Sub-DPS"],
    region: "Liyue",
    builds: [
      {
        slug: s("off-field"),
        name: "Off-field DPS",
        condition: "Aplicadora de Hydro off-field para vaporize/international.",
        appliesWithCharacters: [s("hu-tao")],
        weaponOptions: [s("aqua-simulacra"), s("fav-warbow")],
        artifactSetOptions: [s("emblem-of-severed-fate")],
        statPriority: ["HP%", "CritRate", "CritDMG", "EnergyRecharge"]
      }
    ]
  },
  {
    slug: s("furina"),
    name: "Furina",
    element: "Hydro",
    weaponType: "Sword",
    rarity: 5,
    roles: ["Support", "Sub-DPS"],
    region: "Fontaine",
    builds: [
      {
        slug: s("con-hu-tao"),
        name: "Buffer / off-field",
        condition: "Buff de daño por variación de HP; ideal con Hu Tao + healer.",
        appliesWithCharacters: [s("hu-tao"), s("zhongli")],
        weaponOptions: [s("splendor-of-tranquil-waters"), s("fav-sword")],
        artifactSetOptions: [s("golden-troupe")],
        statPriority: ["HP%", "EnergyRecharge", "CritRate", "CritDMG"],
        notes: "~140-160% ER si es la única batería. Prioriza HP para maximizar el buff."
      }
    ]
  },
  {
    slug: s("zhongli"),
    name: "Zhongli",
    element: "Geo",
    weaponType: "Polearm",
    rarity: 5,
    roles: ["Support"],
    region: "Liyue",
    builds: [
      {
        slug: s("shield"),
        name: "Escudo / resistance shred",
        condition: "Escudo universal; baja RES de pilar. Encaja en casi cualquier equipo.",
        appliesWithCharacters: [],
        weaponOptions: [s("black-tassel"), s("fav-lance")],
        artifactSetOptions: [s("tenacity-of-the-millelith")],
        statPriority: ["HP%", "HP%", "HP%"]
      }
    ]
  },
  {
    slug: s("xingqiu"),
    name: "Xingqiu",
    element: "Hydro",
    weaponType: "Sword",
    rarity: 4,
    roles: ["Sub-DPS"],
    region: "Liyue",
    builds: [
      {
        slug: s("off-field"),
        name: "Off-field Hydro",
        condition: "Alternativa a Yelan como aplicador de Hydro para vaporize.",
        appliesWithCharacters: [s("hu-tao")],
        weaponOptions: [s("sacrificial-sword"), s("fav-sword")],
        artifactSetOptions: [s("emblem-of-severed-fate")],
        statPriority: ["ATK%", "CritRate", "CritDMG", "EnergyRecharge"]
      }
    ]
  }
]

// --- Armas (con etiqueta de rol) ---
const weapons: WeaponDraft[] = [
  { slug: s("staff-of-homa"), name: "Staff of Homa", type: "Polearm", rarity: 5, mainStat: "CritDMG", passiveEffect: "HP máx +20% y ATK basado en HP.", suitedRoles: ["DPS"] },
  { slug: s("aqua-simulacra"), name: "Aqua Simulacra", type: "Bow", rarity: 5, mainStat: "CritDMG", passiveEffect: "HP +16%; +20% DMG cerca de enemigos.", suitedRoles: ["Sub-DPS", "DPS"] },
  { slug: s("splendor-of-tranquil-waters"), name: "Splendor of Tranquil Waters", type: "Sword", rarity: 5, mainStat: "CritRate", passiveEffect: "Buffs de HP y ATK por cambios de HP.", suitedRoles: ["Support", "Sub-DPS"] },
  { slug: s("sacrificial-sword"), name: "Sacrificial Sword", type: "Sword", rarity: 4, mainStat: "EnergyRecharge", passiveEffect: "Reinicia el CD de la habilidad elemental.", suitedRoles: ["Sub-DPS", "Support"] },
  { slug: s("black-tassel"), name: "Black Tassel", type: "Polearm", rarity: 3, mainStat: "HP%", passiveEffect: "HP alto para escudos de Zhongli.", suitedRoles: ["Support"] },
  { slug: s("emblem-warbow-placeholder"), name: "Favonius Warbow", type: "Bow", rarity: 4, mainStat: "EnergyRecharge", passiveEffect: "Genera partículas de energía en CRIT.", suitedRoles: ["Support", "Sub-DPS"] }
]

// --- Sets de artefactos (con prioridad de main stats) ---
const artifactSets: ArtifactSetDraft[] = [
  {
    slug: s("marechaussee-hunter"),
    name: "Marechaussee Hunter",
    bonus2: "DMG de Ataque Normal/Cargado +15%.",
    bonus4: "CRIT Rate +12% por stack (hasta 3) al cambiar HP.",
    recommendedMainStats: [
      { slot: "Sands", stats: ["HP%"] },
      { slot: "Goblet", stats: ["ElementalDMGBonus"] },
      { slot: "Circlet", stats: ["CritRate", "CritDMG"] }
    ]
  },
  {
    slug: s("crimson-witch-of-flames"),
    name: "Crimson Witch of Flames",
    bonus2: "Pyro DMG Bonus +15%.",
    bonus4: "Aumenta daño de reacciones Pyro; buff al usar habilidad.",
    recommendedMainStats: [
      { slot: "Sands", stats: ["HP%", "ElementalMastery"] },
      { slot: "Goblet", stats: ["ElementalDMGBonus"] },
      { slot: "Circlet", stats: ["CritRate", "CritDMG"] }
    ]
  },
  {
    slug: s("emblem-of-severed-fate"),
    name: "Emblem of Severed Fate",
    bonus2: "Energy Recharge +20%.",
    bonus4: "Daño de la ráfaga +25% de la Recarga de Energía.",
    recommendedMainStats: [
      { slot: "Sands", stats: ["HP%", "EnergyRecharge"] },
      { slot: "Goblet", stats: ["ElementalDMGBonus"] },
      { slot: "Circlet", stats: ["CritRate", "CritDMG"] }
    ]
  },
  {
    slug: s("golden-troupe"),
    name: "Golden Troupe",
    bonus2: "DMG de habilidad elemental +20%.",
    bonus4: "+25% (y +25% extra off-field) DMG de habilidad elemental.",
    recommendedMainStats: [
      { slot: "Sands", stats: ["HP%"] },
      { slot: "Goblet", stats: ["ElementalDMGBonus"] },
      { slot: "Circlet", stats: ["CritRate", "CritDMG"] }
    ]
  },
  {
    slug: s("tenacity-of-the-millelith"),
    name: "Tenacity of the Millelith",
    bonus2: "HP +20%.",
    bonus4: "Al golpear con habilidad: ATK de equipo +20% y escudo +30%.",
    recommendedMainStats: [
      { slot: "Sands", stats: ["HP%"] },
      { slot: "Goblet", stats: ["HP%"] },
      { slot: "Circlet", stats: ["HP%"] }
    ]
  }
]

// --- Teams ---
const teams: TeamDraft[] = [
  {
    slug: s("hu-tao-vaporize"),
    name: "Hu Tao Vaporize",
    kind: "main",
    description: "Doble Hydro para vaporize consistente, escudo y buff de Furina.",
    members: [
      { characterSlug: s("hu-tao"), buildVariantSlug: s("vaporize") },
      { characterSlug: s("yelan"), buildVariantSlug: s("off-field") },
      { characterSlug: s("furina"), buildVariantSlug: s("con-hu-tao") },
      { characterSlug: s("zhongli"), buildVariantSlug: s("shield") }
    ]
  },
  {
    slug: s("hu-tao-vaporize-xingqiu"),
    name: "Hu Tao Vaporize (variante Xingqiu)",
    kind: "variant",
    basedOn: s("hu-tao-vaporize"),
    description: "Reemplaza a Yelan por Xingqiu (más aplicación de Hydro, menos daño off-field).",
    members: [
      { characterSlug: s("hu-tao"), buildVariantSlug: s("vaporize") },
      { characterSlug: s("xingqiu"), buildVariantSlug: s("off-field") },
      { characterSlug: s("furina"), buildVariantSlug: s("con-hu-tao") },
      { characterSlug: s("zhongli"), buildVariantSlug: s("shield") }
    ]
  }
]

const program = Effect.gen(function* () {
  const chars = yield* CharacterService
  const weaponSvc = yield* WeaponService
  const artSvc = yield* ArtifactSetService
  const teamSvc = yield* TeamService

  yield* Effect.forEach(characters, (c) => chars.save(c))
  yield* Effect.forEach(weapons, (w) => weaponSvc.save(w))
  yield* Effect.forEach(artifactSets, (a) => artSvc.save(a))
  yield* Effect.forEach(teams, (t) => teamSvc.save(t))

  yield* Effect.log(
    `seed: ${characters.length} personajes, ${weapons.length} armas, ${artifactSets.length} sets, ${teams.length} teams`
  )
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
