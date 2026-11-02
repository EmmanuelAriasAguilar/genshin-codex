import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo } from "react"
import { listResonators } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { TIER_ORDER, tierClass, WW_ELEMENT_COLOR } from "../lib/genshin"

export const Route = createFileRoute("/ww/tier")({ component: WwTier })

function WwTier() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-resonators"],
    queryFn: listResonators
  })

  const byTier = useMemo(() => {
    const m = new Map<string, typeof data>()
    for (const r of data ?? []) {
      if (!r.tier) continue
      if (!m.has(r.tier)) m.set(r.tier, [])
      m.get(r.tier)!.push(r)
    }
    const order = [...m.keys()].sort(
      (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)
    )
    return order.map((t) => ({
      tier: t,
      list: (m.get(t) ?? []).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
    }))
  }, [data])

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Tier list</h1>
        <p className="mt-1 text-xs text-neutral-500">Fuente: wuthering.gg.</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="space-y-2">
        {byTier.map(({ tier, list }) => (
          <div key={tier} className="card flex gap-3 p-3">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border text-lg font-bold ${tierClass(tier)}`}
            >
              {tier}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((r) => (
                <Link
                  key={r.slug}
                  to="/ww/resonators/$slug"
                  params={{ slug: r.slug }}
                  className="block rounded-full transition-transform hover:scale-110"
                  title={r.name}
                  style={{ boxShadow: `0 0 0 2px ${WW_ELEMENT_COLOR[r.element] ?? "#555"}` }}
                >
                  <GameIcon src={r.icon} alt={r.name} size={44} rounded />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
