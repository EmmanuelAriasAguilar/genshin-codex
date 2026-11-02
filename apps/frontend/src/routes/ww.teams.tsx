import type { Resonator } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listResonators } from "../lib/api"
import { WwTeamRoster } from "../lib/ww-ui"

export const Route = createFileRoute("/ww/teams")({ component: WwTeams })

function WwTeams() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-resonators"],
    queryFn: listResonators
  })
  const [q, setQ] = useState("")

  const roster = data ?? []
  const bySlug = useMemo(() => {
    const m = new Map<string, Resonator>()
    for (const r of roster) m.set(r.slug, r)
    return m
  }, [roster])

  // Cada resonador aporta sus comps; el "dueño" es el resonador cuya ficha las lista.
  const all = useMemo(
    () =>
      roster.flatMap((r) =>
        (r.teams ?? []).map((team) => ({ owner: r, team }))
      ),
    [roster]
  )

  const list = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return all
    return all.filter(
      ({ owner, team }) =>
        owner.name.toLowerCase().includes(s) ||
        team.name.toLowerCase().includes(s) ||
        team.members.some((m) => m.name.toLowerCase().includes(s))
    )
  }, [all, q])

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">Team comps</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar resonador o miembro…"
            className="w-64 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-amber-500/50"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {all.length} comps de {roster.filter((r) => r.teams?.length).length} resonadores.
          Fuente: game8.co.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        {list.map(({ owner, team }) => (
          <div key={`${owner.slug}-${team.name}`} className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Link
                to="/ww/resonators/$slug"
                params={{ slug: owner.slug }}
                className="text-sm font-medium hover:text-amber-200"
              >
                {team.name}
              </Link>
            </div>
            <WwTeamRoster team={team} bySlug={bySlug} />
          </div>
        ))}
      </div>
      {data && list.length === 0 && (
        <p className="text-sm text-neutral-500">Sin resultados.</p>
      )}
    </div>
  )
}
