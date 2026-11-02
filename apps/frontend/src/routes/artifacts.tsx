import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { listArtifactSets } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { EffectText } from "../lib/text"

export const Route = createFileRoute("/artifacts")({ component: Artifacts })

function Artifacts() {
  const { data, isLoading } = useQuery({
    queryKey: ["artifact-sets"],
    queryFn: listArtifactSets
  })
  const [q, setQ] = useState("")

  const list = (data ?? [])
    .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Sets de artefactos</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-cyan-500/50"
        />
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => (
          <div key={a.slug} className="card p-4">
            <div className="flex items-center gap-3">
              <GameIcon src={a.icon} alt={a.name} size={40} />
              <h3 className="font-medium">{a.name}</h3>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">2 pzs:</span>{" "}
                <EffectText text={a.bonus2} />
              </p>
              {a.bonus4 && (
                <p>
                  <span className="text-neutral-500">4 pzs:</span>{" "}
                  <EffectText text={a.bonus4} clamp={3} />
                </p>
              )}
            </div>
            {a.recommendedMainStats.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Main stats sugeridos
                </div>
                {a.recommendedMainStats.map((r) => (
                  <div key={r.slot} className="text-sm">
                    <span className="text-neutral-500">{r.slot}:</span>{" "}
                    {r.stats.join(" / ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
