import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { getWwWeapon } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { rarityColor } from "../lib/genshin"
import { EffectText } from "../lib/text"

export const Route = createFileRoute("/ww/weapons/$slug")({
  component: WeaponDetail
})

function WeaponDetail() {
  const { slug } = Route.useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ww-weapon", slug],
    queryFn: () => getWwWeapon(slug)
  })

  if (isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (isError || !data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el arma.</p>
        <Link to="/ww/weapons" className="text-sm text-amber-300 hover:underline">
          ← Armas
        </Link>
      </div>
    )

  const w = data
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link to="/ww/weapons" className="text-sm text-amber-300 hover:underline">
          ← Armas
        </Link>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <div className="flex items-center gap-4">
            <GameIcon src={w.icon} alt={w.name} size={72} />
            <div>
              <h1 className="text-2xl font-semibold">{w.name}</h1>
              <div className="mt-1 flex flex-wrap gap-1 text-sm">
                <span className={`chip font-semibold ${rarityColor(w.rarity)}`}>
                  {w.rarity}★
                </span>
                <span className="chip">{w.type}</span>
              </div>
            </div>
          </div>

          {(w.atk != null || w.substat) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {w.atk != null && (
                <div className="card px-3 py-2">
                  <div className="text-xs text-neutral-500">ATK base</div>
                  <div className="text-lg font-semibold tabular-nums">{w.atk}</div>
                </div>
              )}
              {w.substat && (
                <div className="card px-3 py-2">
                  <div className="text-xs text-neutral-500">{w.substat.name}</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {w.substat.value}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {w.skill && (
        <section>
          <h2 className="mb-1 text-lg font-medium">{w.skill.name}</h2>
          <p className="text-sm leading-relaxed text-neutral-300">
            <EffectText text={w.skill.effect} />
          </p>
        </section>
      )}

      {w.flavor && (
        <section>
          <p className="text-sm italic leading-relaxed text-neutral-500">{w.flavor}</p>
        </section>
      )}

      <p className="text-xs text-neutral-600">Fuente: wuthering.gg.</p>
    </div>
  )
}
