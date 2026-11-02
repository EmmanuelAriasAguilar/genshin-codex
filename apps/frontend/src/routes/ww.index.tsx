import type { Resonator } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo } from "react"
import {
  listResonators,
  listWwEchoes,
  listWwSonatas,
  listWwWeapons
} from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { tierClass, WW_ELEMENT_COLOR } from "../lib/genshin"
import { Badge, ElementDot, SectionTitle, StatTile } from "../lib/ui"
import { WwAvatar } from "../lib/ww-ui"

export const Route = createFileRoute("/ww/")({ component: WuWa })

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

const TIER_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }

function WuWa() {
  const resonators = useQuery({ queryKey: ["ww-resonators"], queryFn: listResonators })
  const weapons = useQuery({ queryKey: ["ww-weapons"], queryFn: listWwWeapons })
  const echoes = useQuery({ queryKey: ["ww-echoes"], queryFn: listWwEchoes })
  const sonatas = useQuery({ queryKey: ["ww-sonatas"], queryFn: listWwSonatas })

  const roster = resonators.data ?? []

  const bySlug = useMemo(() => {
    const m = new Map<string, Resonator>()
    for (const r of roster) m.set(r.slug, r)
    return m
  }, [roster])

  const nTeams = useMemo(
    () => roster.reduce((n, r) => n + (r.teams?.length ?? 0), 0),
    [roster]
  )

  // Top tier: resonadores en el mejor tier (por tier list de wuthering.gg).
  const topTier = useMemo(
    () =>
      [...roster]
        .filter((r) => r.tier)
        .sort(
          (a, b) =>
            (TIER_RANK[a.tier ?? "D"] ?? 9) - (TIER_RANK[b.tier ?? "D"] ?? 9) ||
            a.name.localeCompare(b.name)
        )
        .slice(0, 8),
    [roster]
  )

  // Presencia en el meta: nº de comps que incluyen a cada resonador.
  const mostUsed = useMemo(() => {
    const count = new Map<string, number>()
    for (const r of roster)
      for (const t of r.teams ?? [])
        for (const m of t.members) count.set(m.slug, (count.get(m.slug) ?? 0) + 1)
    return roster
      .map((r) => ({ r, n: count.get(r.slug) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
  }, [roster])

  const maxUse = mostUsed[0]?.n ?? 1

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
        <Badge color="#f6c453">Wuthering Waves</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Wuthering Waves</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Resonadores con build (arma + Sonata), team comps, Echoes, Sonata sets y tier list —
          auto-sincronizado. Empieza por{" "}
          <Link to="/ww/resonators" className="text-amber-300 hover:underline">
            Resonadores
          </Link>{" "}
          o mira las{" "}
          <Link to="/ww/teams" className="text-amber-300 hover:underline">
            Team comps
          </Link>
          .
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        <StatLink label="Resonadores" value={roster.length} to="/ww/resonators" accent="#7ad3ff" />
        <StatLink label="Armas" value={weapons.data?.length ?? 0} to="/ww/weapons" accent="#f6c453" />
        <StatLink label="Echoes" value={echoes.data?.length ?? 0} to="/ww/echoes" accent="#ff6b5a" />
        <StatLink label="Sonata sets" value={sonatas.data?.length ?? 0} to="/ww/sonatas" accent="#b98cff" />
        <StatLink label="Team comps" value={nTeams} to="/ww/teams" accent="#4fe0b0" />
      </section>

      {/* Top tier */}
      <section>
        <SectionTitle>Top tier</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {topTier.map((r) => (
            <Link
              key={r.slug}
              to="/ww/resonators/$slug"
              params={{ slug: r.slug }}
              className="card flex items-center gap-2.5 p-3"
            >
              <GameIcon src={r.icon} alt={r.name} size={42} rarity={r.rarity} rounded />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="flex items-center gap-1.5 text-xs">
                  {r.tier && (
                    <span className={`chip px-1.5 py-0 font-bold ${tierClass(r.tier)}`}>
                      {r.tier}
                    </span>
                  )}
                  <ElementDot color={WW_ELEMENT_COLOR[r.element] ?? "#8aa0b4"} size={7} />
                  <span style={{ color: WW_ELEMENT_COLOR[r.element] }}>{r.element}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Presencia en el meta */}
      <section>
        <SectionTitle hint="por nº de team comps (game8) que los incluyen">
          Más presentes en el meta
        </SectionTitle>
        <div className="panel divide-y divide-white/5">
          {mostUsed.map(({ r, n }, i) => (
            <Link
              key={r.slug}
              to="/ww/resonators/$slug"
              params={{ slug: r.slug }}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/5"
            >
              <span className="w-5 text-right text-xs tabular-nums text-neutral-600">
                {i + 1}
              </span>
              <WwAvatar res={bySlug.get(r.slug)} slug={r.slug} size={28} />
              <span
                className="w-32 shrink-0 truncate text-sm"
                style={{ color: WW_ELEMENT_COLOR[r.element] }}
              >
                {r.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-white/5">
                <div
                  className="h-2 rounded bg-amber-500/40"
                  style={{ width: `${(n / maxUse) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                {n} comps
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
