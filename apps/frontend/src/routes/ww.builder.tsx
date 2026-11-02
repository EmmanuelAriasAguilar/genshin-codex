import type { Resonator, WwTeam } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listResonators } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { WW_ELEMENT_COLOR } from "../lib/genshin"
import { WwTeamRoster } from "../lib/ww-ui"

export const Route = createFileRoute("/ww/builder")({ component: WwBuilder })

function WwBuilder() {
  const { data } = useQuery({ queryKey: ["ww-resonators"], queryFn: listResonators })
  const [selected, setSelected] = useState<string[]>([])
  const [q, setQ] = useState("")

  const roster = data ?? []
  const bySlug = useMemo(() => {
    const m = new Map<string, Resonator>()
    for (const r of roster) m.set(r.slug, r)
    return m
  }, [roster])

  const toggle = (slug: string) =>
    setSelected((cur) =>
      cur.includes(slug)
        ? cur.filter((s) => s !== slug)
        : cur.length >= 3
          ? cur
          : [...cur, slug]
    )

  // Comps (de game8) que contienen TODOS los resonadores seleccionados.
  const matches = useMemo(() => {
    if (selected.length === 0) return []
    const sel = new Set(selected)
    const out: { owner: Resonator; team: WwTeam }[] = []
    for (const r of roster)
      for (const team of r.teams ?? [])
        if ([...sel].every((s) => team.members.some((m) => m.slug === s)))
          out.push({ owner: r, team })
    return out.slice(0, 12)
  }, [selected, roster])

  const filtered = roster
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Armador de equipos</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Elige hasta 3 resonadores y te muestro las team comps (de game8) que los incluyen.
        </p>
      </div>

      {/* Seleccionados */}
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((s) => {
          const r = bySlug.get(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 py-1 pl-1 pr-3 text-sm"
              title="Quitar"
            >
              <GameIcon src={r?.icon} alt={r?.name ?? s} size={24} rounded />
              <span style={r ? { color: WW_ELEMENT_COLOR[r.element] } : undefined}>
                {r?.name ?? s}
              </span>
              <span className="text-neutral-500">×</span>
            </button>
          )
        })}
        {selected.length === 0 && (
          <span className="text-sm text-neutral-500">Nadie seleccionado aún.</span>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Comps encontradas */}
      {selected.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            Comps que los incluyen{" "}
            <span className="text-sm font-normal text-neutral-500">({matches.length})</span>
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Ninguna comp curada incluye a todos los seleccionados juntos.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {matches.map(({ owner, team }) => (
                <div key={`${owner.slug}-${team.name}`} className="card p-4">
                  <Link
                    to="/ww/resonators/$slug"
                    params={{ slug: owner.slug }}
                    className="mb-3 block text-sm font-medium hover:text-amber-200"
                  >
                    {team.name}
                  </Link>
                  <WwTeamRoster team={team} bySlug={bySlug} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Picker */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="mr-auto text-lg font-medium">Resonadores</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 xl:grid-cols-6">
          {filtered.map((r) => {
            const on = selected.includes(r.slug)
            const disabled = !on && selected.length >= 3
            return (
              <button
                key={r.slug}
                type="button"
                onClick={() => toggle(r.slug)}
                disabled={disabled}
                className={`card flex flex-col items-center gap-1 p-2 text-center transition-colors ${
                  on
                    ? "border-amber-500/60 bg-amber-500/10"
                    : disabled
                      ? "opacity-40"
                      : "hover:bg-white/5"
                }`}
              >
                <GameIcon src={r.icon} alt={r.name} size={44} rounded />
                <span className="w-full truncate text-xs">{r.name}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
