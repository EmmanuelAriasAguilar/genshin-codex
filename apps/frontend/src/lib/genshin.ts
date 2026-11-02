import type { Element, Role, Stat } from "@genshin-codex/domain"

export const STATS: Stat[] = [
  "HP",
  "HP%",
  "ATK",
  "ATK%",
  "DEF",
  "DEF%",
  "ElementalMastery",
  "EnergyRecharge",
  "CritRate",
  "CritDMG",
  "ElementalDMGBonus",
  "PhysicalDMGBonus",
  "HealingBonus"
]

export const ELEMENTS: Element[] = [
  "Pyro",
  "Hydro",
  "Electro",
  "Cryo",
  "Anemo",
  "Geo",
  "Dendro"
]

export const ROLES: Role[] = ["DPS", "Sub-DPS", "Support", "Healer"]

export const elementClass = (el: Element) => `el-${el}`

export const ELEMENT_COLOR: Record<Element, string> = {
  Pyro: "#ff7a5c",
  Hydro: "#4cc5ff",
  Electro: "#c186ff",
  Cryo: "#8fe9ff",
  Anemo: "#5fe0c0",
  Geo: "#f6c453",
  Dendro: "#91d43f"
}

// Tier list (WuWa)
export const TIER_ORDER = ["SS", "S+", "S", "A", "B", "C", "D"]
export const tierClass = (t: string): string => {
  const m: Record<string, string> = {
    SS: "text-rose-300 border-rose-500/40 bg-rose-500/10",
    "S+": "text-amber-300 border-amber-500/40 bg-amber-500/10",
    S: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    A: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    B: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
    C: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    D: "text-neutral-400 border-white/15 bg-white/5"
  }
  return m[t] ?? "text-neutral-300 border-white/15 bg-white/5"
}

// Wuthering Waves (6 elementos)
export const WW_ELEMENT_COLOR: Record<string, string> = {
  Glacio: "#7ad3ff",
  Fusion: "#ff6b5a",
  Electro: "#b98cff",
  Aero: "#4fe0b0",
  Spectro: "#ffe06b",
  Havoc: "#ff6ba6"
}

export const roleColor: Record<Role, string> = {
  DPS: "text-red-300 border-red-500/30 bg-red-500/10",
  "Sub-DPS": "text-orange-300 border-orange-500/30 bg-orange-500/10",
  Support: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  Healer: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
}

export const rarityColor = (r: number) =>
  r === 5 ? "text-amber-300" : r === 4 ? "text-violet-300" : "text-neutral-400"

// Traducción de etiquetas al español (los nombres de elemento son iguales en ES).
const ES_WEAPON: Record<string, string> = {
  Sword: "Espada",
  Claymore: "Mandoble",
  Polearm: "Lanza",
  Catalyst: "Catalizador",
  Bow: "Arco"
}
const ES_ROLE: Record<string, string> = {
  DPS: "DPS",
  "Sub-DPS": "Sub-DPS",
  Support: "Soporte",
  Healer: "Sanador"
}
export const weaponEs = (w: string) => ES_WEAPON[w] ?? w
export const roleEs = (r: string) => ES_ROLE[r] ?? r
