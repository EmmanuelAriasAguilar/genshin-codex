import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listWwEchoes } from "../lib/api"
import { GameIcon } from "../lib/game-icon"

export const Route = createFileRoute("/ww/echoes/")({ component: WwEchoes })

function WwEchoes() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-echoes"],
    queryFn: listWwEchoes
  })
  const [q, setQ] = useState("")
  const [cost, setCost] = useState<number | "all">("all")
  const [sonata, setSonata] = useState<string | "all">("all")

  const sonatas = useMemo(
    () => [...new Set((data ?? []).flatMap((e) => e.sonatas))].sort(),
    [data]
  )

  const list = (data ?? [])
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
    .filter((e) => cost === "all" || e.cost === cost)
    .filter((e) => sonata === "all" || e.sonatas.includes(sonata))
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">Echoes</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-amber-500/50"
          />
          <select
            value={cost}
            onChange={(e) => setCost(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          >
            <option value="all">Coste</option>
            <option value={4}>4 coste</option>
            <option value={3}>3 coste</option>
            <option value={1}>1 coste</option>
          </select>
          <select
            value={sonata}
            onChange={(e) => setSonata(e.target.value)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          >
            <option value="all">Sonata</option>
            {sonatas.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Los <b>Sonata sets</b> son el equivalente a los sets de artefactos. Toca un echo para ver
          su coste, sets y main stats posibles.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {list.map((e) => (
          <Link
            key={e.slug}
            to="/ww/echoes/$slug"
            params={{ slug: e.slug }}
            className="card p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <GameIcon src={e.icon} alt={e.name} size={44} />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-500/90 text-[10px] font-bold text-black">
                  {e.cost}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.name}</div>
                <div className="truncate text-xs text-neutral-500">
                  {e.sonatas.join(" · ") || "—"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {data && list.length === 0 && (
        <p className="text-sm text-neutral-500">Sin resultados.</p>
      )}
    </div>
  )
}
