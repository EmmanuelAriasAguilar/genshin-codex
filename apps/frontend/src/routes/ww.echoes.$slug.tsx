import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { getWwEcho, listWwSonatas } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { WW_ELEMENT_COLOR } from "../lib/genshin"
import { EffectText } from "../lib/text"

export const Route = createFileRoute("/ww/echoes/$slug")({
  component: EchoDetail
})

function EchoDetail() {
  const { slug } = Route.useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ww-echo", slug],
    queryFn: () => getWwEcho(slug)
  })
  const sonatas = useQuery({ queryKey: ["ww-sonatas"], queryFn: listWwSonatas })

  if (isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (isError || !data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el echo.</p>
        <Link to="/ww/echoes" className="text-sm text-amber-300 hover:underline">
          ← Echoes
        </Link>
      </div>
    )

  const e = data
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link to="/ww/echoes" className="text-sm text-amber-300 hover:underline">
          ← Echoes
        </Link>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <GameIcon src={e.icon} alt={e.name} size={72} />
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-amber-500/90 text-xs font-bold text-black">
                {e.cost}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{e.name}</h1>
              <div className="mt-1 text-sm text-neutral-400">Coste {e.cost}</div>
            </div>
          </div>
        </div>
      </div>

      {e.sonatas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Sonata sets</h2>
          {e.sonatas.map((name) => {
            const s = sonatas.data?.find((x) => x.name === name)
            return (
              <div key={name} className="card p-4">
                <div className="flex items-center gap-2">
                  <GameIcon src={s?.icon} alt={name} size={28} />
                  <Link
                    to="/ww/sonatas"
                    className="font-medium hover:text-amber-200"
                    style={s?.element ? { color: WW_ELEMENT_COLOR[s.element] } : undefined}
                  >
                    {name}
                  </Link>
                </div>
                {s && s.bonuses.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-xs text-neutral-400">
                    {s.bonuses.map((b) => (
                      <p key={b.pieces}>
                        <span className="text-neutral-500">{b.pieces} pzs:</span>{" "}
                        <EffectText text={b.effect} />
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {e.mainStats && e.mainStats.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-medium">Main stats posibles</h2>
          <div className="card divide-y divide-white/5">
            {e.mainStats.map((s) => (
              <div key={s.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-neutral-300">{s.name}</span>
                <span className="tabular-nums text-neutral-400">{s.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-neutral-600">Fuente: wuthering.gg.</p>
    </div>
  )
}
