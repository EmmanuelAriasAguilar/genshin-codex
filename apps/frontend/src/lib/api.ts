import type {
  ArtifactSet,
  ArtifactSetDraft,
  BuildVariant,
  Character,
  CharacterDraft,
  InvestmentAnalysis,
  Resonator,
  SelectionResult,
  Team,
  Weapon,
  WeaponDraft,
  WwEcho,
  WwSonata,
  WwWeapon
} from "@genshin-codex/domain"

const isServer = typeof window === "undefined"
const BASE = isServer
  ? ((globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.BACKEND_URL ?? "http://localhost:4901")
  : "/api"

const TOKEN_KEY = "gc_admin_token"

export const getAdminToken = (): string | null =>
  isServer ? null : window.localStorage.getItem(TOKEN_KEY)

export const setAdminToken = (t: string): void => {
  if (!isServer) window.localStorage.setItem(TOKEN_KEY, t)
}

async function req<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body) headers.set("content-type", "application/json")
  const token = getAdminToken()
  if (init?.auth && token) headers.set("authorization", `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`${res.status} ${res.statusText} — ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// --- Lecturas (públicas) ---
export const listCharacters = () => req<Character[]>("/characters")
export const getCharacter = (slug: string) =>
  req<Character>(`/characters/${slug}`)
export const listWeapons = () => req<Weapon[]>("/weapons")
export const listArtifactSets = () => req<ArtifactSet[]>("/artifact-sets")
export const listTeams = () => req<Team[]>("/teams")
export const getTeam = (slug: string) => req<Team>(`/teams/${slug}`)

// --- Wuthering Waves ---
export const listResonators = () => req<Resonator[]>("/ww/resonators")
export const getResonator = (slug: string) =>
  req<Resonator>(`/ww/resonators/${slug}`)
export const listWwWeapons = () => req<WwWeapon[]>("/ww/weapons")
export const getWwWeapon = (slug: string) => req<WwWeapon>(`/ww/weapons/${slug}`)
export const listWwEchoes = () => req<WwEcho[]>("/ww/echoes")
export const getWwEcho = (slug: string) => req<WwEcho>(`/ww/echoes/${slug}`)
export const listWwSonatas = () => req<WwSonata[]>("/ww/sonatas")

export const listInvestments = () => req<InvestmentAnalysis[]>("/investments")
export const getInvestment = (slug: string) =>
  req<InvestmentAnalysis>(`/investments/${slug}`)

export const suggestTeam = (characterSlugs: string[]) =>
  req<SelectionResult>("/teams/suggest", {
    method: "POST",
    body: JSON.stringify({ characterSlugs })
  })

// --- Escrituras (admin) ---
export const saveCharacter = (c: CharacterDraft) =>
  req<Character>("/characters", {
    method: "POST",
    body: JSON.stringify(c),
    auth: true
  })
export const addBuildVariant = (slug: string, v: BuildVariant) =>
  req<Character>(`/characters/${slug}/builds`, {
    method: "POST",
    body: JSON.stringify(v),
    auth: true
  })
export const deleteCharacter = (slug: string) =>
  req<void>(`/characters/${slug}`, { method: "DELETE", auth: true })

export const saveWeapon = (w: WeaponDraft) =>
  req<Weapon>("/weapons", { method: "POST", body: JSON.stringify(w), auth: true })
export const saveArtifactSet = (a: ArtifactSetDraft) =>
  req<ArtifactSet>("/artifact-sets", {
    method: "POST",
    body: JSON.stringify(a),
    auth: true
  })
export const saveTeam = (t: Team) =>
  req<Team>("/teams", { method: "POST", body: JSON.stringify(t), auth: true })
export const deleteTeam = (slug: string) =>
  req<void>(`/teams/${slug}`, { method: "DELETE", auth: true })
