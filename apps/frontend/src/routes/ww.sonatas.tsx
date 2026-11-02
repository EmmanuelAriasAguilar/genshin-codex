import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { listWwSonatas } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { WW_ELEMENT_COLOR } from "../lib/genshin"
import { EffectText } from "../lib/text"

export const Route = createFileRoute("/ww/sonatas")({ component: WwSonatas })

function WwSonatas() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-sonatas"],
    queryFn: listWwSonatas
  })
  const [q, setQ] = useState("")

  const list = (data ?? [])
    .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">Sonata sets</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-amber-500/50"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          El equivalente a los sets de artefactos: bono de 2 y 5 piezas. Fuente: wuthering.gg.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => (
          <div key={s.slug} className="card p-4">
            <div className="flex items-center gap-2">
              <GameIcon src={s.icon} alt={s.name} size={36} />
              <span
                className="font-medium"
                style={s.element ? { color: WW_ELEMENT_COLOR[s.element] } : undefined}
              >
                {s.name}
              </span>
              {s.element && (
                <span className="chip ml-auto" style={{ color: WW_ELEMENT_COLOR[s.element] }}>
                  {s.element}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-300">
              {s.bonuses.map((b) => (
                <p key={b.pieces}>
                  <span className="text-neutral-500">{b.pieces} pzs:</span>{" "}
                  <EffectText text={b.effect} />
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {data && list.length === 0 && (
        <p className="text-sm text-neutral-500">Sin resultados.</p>
      )}
    </div>
  )
}
