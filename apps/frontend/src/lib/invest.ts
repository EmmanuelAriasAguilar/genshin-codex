import type { CharacterInvest, Material, MaterialSet, Weapon } from "@genshin-codex/domain"

// Nivel de personaje/arma → nº de ascensiones hechas (caps 20/40/50/60/70/80).
const CAPS = [20, 40, 50, 60, 70, 80]
export const ascensionsDone = (level: number): number => {
  let n = 0
  for (const c of CAPS) if (level > c) n++
  return n
}

/** Fases de ascensión (índices 0..5) necesarias para ir de current a target. */
export const ascendPhasesNeeded = (current: number, target: number): number[] => {
  const from = ascensionsDone(current)
  const to = ascensionsDone(target)
  const out: number[] = []
  for (let i = from; i < to; i++) out.push(i)
  return out
}

/** Índices en el array talent[] (0=lvl2 … 8=lvl10) para subir de current a target. */
export const talentStepsNeeded = (current: number, target: number): number[] => {
  const out: number[] = []
  for (let lvl = current + 1; lvl <= target; lvl++) {
    const idx = lvl - 2
    if (idx >= 0 && idx <= 8) out.push(idx)
  }
  return out
}

/** Suma materiales por nombre. Mora primero, resto por count desc. */
export const aggregate = (sets: MaterialSet[]): Material[] => {
  const map = new Map<string, number>()
  for (const s of sets) for (const m of s) map.set(m.name, (map.get(m.name) ?? 0) + m.count)
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (a.name === "Mora") return -1
      if (b.name === "Mora") return 1
      return b.count - a.count
    })
}

export type CharPlan = {
  ascend: number[] // fases usadas
  talentSteps: number[]
  materials: Material[]
}

export const computeCharacter = (
  invest: CharacterInvest,
  curLvl: number,
  tgtLvl: number,
  curTalent: number,
  tgtTalent: number
): CharPlan => {
  const phases = ascendPhasesNeeded(curLvl, tgtLvl)
  const steps = talentStepsNeeded(curTalent, tgtTalent)
  const sets: MaterialSet[] = []
  for (const p of phases) if (invest.ascend[p]) sets.push(invest.ascend[p]!)
  // 3 talentos con el mismo objetivo
  for (let i = 0; i < 3; i++)
    for (const s of steps) if (invest.talent[s]) sets.push(invest.talent[s]!)
  return { ascend: phases, talentSteps: steps, materials: aggregate(sets) }
}

export const computeWeapon = (weapon: Weapon, curLvl: number, tgtLvl: number): Material[] => {
  const phases = ascendPhasesNeeded(curLvl, tgtLvl)
  const sets: MaterialSet[] = []
  const costs = weapon.ascendCosts ?? []
  for (const p of phases) if (costs[p]) sets.push(costs[p]!)
  return aggregate(sets)
}

export type TalentTarget = { cur: number; tgt: number }

/** Calc completa con 3 talentos individuales (NA/Skill/Burst), cada uno con su rango. */
export const computeCharacterFull = (
  invest: CharacterInvest,
  cLvl: number,
  tLvl: number,
  talents: TalentTarget[]
): Material[] => {
  const sets: MaterialSet[] = []
  for (const p of ascendPhasesNeeded(cLvl, tLvl)) if (invest.ascend[p]) sets.push(invest.ascend[p]!)
  for (const t of talents)
    for (const s of talentStepsNeeded(t.cur, t.tgt)) if (invest.talent[s]) sets.push(invest.talent[s]!)
  return aggregate(sets)
}

export const LEVEL_OPTIONS = [1, 20, 40, 50, 60, 70, 80, 90]
export const TALENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const TALENT_LABELS = ["Ataque normal", "Habilidad", "Ráfaga"]
