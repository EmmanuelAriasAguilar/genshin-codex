import type { Character, Team } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo } from "react"
import {
  listArtifactSets,
  listCharacters,
  listTeams,
  listWeapons
} from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { elementClass } from "../lib/genshin"
import { CharAvatar, TeamRoster } from "../lib/team-ui"
import { Badge, SectionTitle, StatTile } from "../lib/ui"

export const Route = createFileRoute("/")({ component: Home })

const verNum = (v?: string) => (v ? Number.parseFloat(v) : 0)

function StatLink({
  label,
  value,
  to,
  accent
}: {
  label: string
  value: number
  to: string
  accent?: string | undefined
}) {
  return (
    <Link to={to} className="block">
      <StatTile label={label} value={value} accent={accent} />
    </Link>
  )
}

function Home() {
  const chars = useQuery({ queryKey: ["characters"], queryFn: listCharacters })
  const weapons = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const sets = useQuery({ queryKey: ["artifact-sets"], queryFn: listArtifactSets })
  const teams = useQuery({ queryKey: ["teams"], queryFn: listTeams })

  const charList = chars.data ?? []
  const teamList = teams.data ?? []

  const latestVersion = useMemo(
    () => charList.reduce((mx, c) => Math.max(mx, verNum(c.version)), 0),
    [charList]
  )

  // Recién llegados: por versión de release desc.
  const newest = useMemo(
    () =>
      [...charList]
        .filter((c) => c.version)
        .sort((a, b) => verNum(b.version) - verNum(a.version) || a.name.localeCompare(b.name))
        .slice(0, 8),
    [charList]
  )

  // Presencia en el meta: nº de comps que incluyen a cada personaje (ranking honesto por uso).
  const mostUsed = useMemo(() => {
    const count = new Map<string, number>()
    for (const t of teamList)
      for (const m of t.members)
        count.set(m.characterSlug, (count.get(m.characterSlug) ?? 0) + 1)
    return charList
      .map((c) => ({ c, n: count.get(c.slug) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
  }, [charList, teamList])

  const maxUse = mostUsed[0]?.n ?? 1

  // Comps destacadas: los "-comp" curados (top DPS con variantes).
  const charBySlug = useMemo(() => {
    const m = new Map<string, Character>()
    for (const c of charList) m.set(c.slug, c)
    return m
  }, [charList])

  const featured = useMemo(
    () => teamList.filter((t) => t.kind === "main" && t.slug.endsWith("-comp")).slice(0, 6),
    [teamList]
  )

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Resonance Codex</h1>
          {latestVersion > 0 && (
            <Badge accent>Genshin · patch {latestVersion}</Badge>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Builds, armas, artefactos y equipos curados — auto-actualizado con cada personaje nuevo.
          Arma comps en el{" "}
          <Link to="/builder" className="text-cyan-300 hover:underline">
            Armador
          </Link>{" "}
          y revisa la ficha de cada personaje con su build, variantes e inversión.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatLink label="Personajes" value={charList.length} to="/characters" accent="#4cc5ff" />
        <StatLink label="Armas" value={weapons.data?.length ?? 0} to="/weapons" accent="#f6c453" />
        <StatLink label="Sets de artefactos" value={sets.data?.length ?? 0} to="/artifacts" accent="#c186ff" />
        <StatLink label="Equipos" value={teamList.length} to="/teams" accent="#5fe0c0" />
      </section>

      {/* Recién llegados */}
      <section>
        <SectionTitle>Recién llegados</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {newest.map((c) => (
            <Link
              key={c.slug}
              to="/characters/$slug"
              params={{ slug: c.slug }}
              className="card relative overflow-hidden p-3"
            >
              {c.art && (
                <img
                  src={c.art}
                  alt=""
                  loading="lazy"
                  className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-cover object-top opacity-30"
                  style={{
                    maskImage: "linear-gradient(to left, black, transparent)",
                    WebkitMaskImage: "linear-gradient(to left, black, transparent)"
                  }}
                />
              )}
              <div className="relative flex items-center gap-2.5">
                <GameIcon src={c.icon} alt={c.name} size={42} rarity={c.rarity} rounded />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className={`text-xs ${elementClass(c.element)}`}>
                    {c.element} · v{c.version}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Presencia en el meta */}
      <section>
        <SectionTitle hint="por nº de comps que los incluyen (no es un tier oficial)">
          Más presentes en el meta
        </SectionTitle>
        <div className="panel divide-y divide-white/5">
          {mostUsed.map(({ c, n }, i) => (
            <Link
              key={c.slug}
              to="/characters/$slug"
              params={{ slug: c.slug }}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/5"
            >
              <span className="w-5 text-right text-xs tabular-nums text-neutral-600">
                {i + 1}
              </span>
              <CharAvatar char={c} slug={c.slug} size={28} />
              <span className={`w-32 shrink-0 truncate text-sm ${elementClass(c.element)}`}>
                {c.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-white/5">
                <div
                  className="h-2 rounded bg-cyan-500/40"
                  style={{ width: `${(n / maxUse) * 100}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                {n} comps
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Comps destacadas */}
      <section>
        <SectionTitle>Comps destacadas</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {featured.map((t: Team) => (
            <Link
              key={t.slug}
              to="/teams/$slug"
              params={{ slug: t.slug }}
              className="card p-4"
            >
              <div className="mb-2 text-sm font-medium">{t.name}</div>
              <TeamRoster members={t.members} chars={charBySlug} />
            </Link>
          ))}
          {featured.length === 0 && (
            <p className="text-sm text-neutral-500">Aún no hay comps destacadas.</p>
          )}
        </div>
      </section>
    </div>
  )
}
