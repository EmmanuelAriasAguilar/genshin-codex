import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listWeapons } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { rarityColor } from "../lib/genshin"
import { computeWeapon, LEVEL_OPTIONS } from "../lib/invest"

export const Route = createFileRoute("/weapons/$slug")({ component: WeaponDetail })

const fmt = (n: number) => n.toLocaleString("en-US")
const selCls =
  "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:border-cyan-500/50"

function WeaponDetail() {
  const { slug } = Route.useParams()
  const weapons = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const w = weapons.data?.find((x) => x.slug === slug)

  const [cLvl, setCLvl] = useState(1)
  const [tLvl, setTLvl] = useState(90)
  const mats = useMemo(() => (w ? computeWeapon(w, cLvl, tLvl) : []), [w, cLvl, tLvl])

  if (weapons.isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (!w)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el arma.</p>
        <Link to="/weapons" className="text-sm text-cyan-300 hover:underline">
          ← Volver
        </Link>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/weapons" className="text-sm text-cyan-300 hover:underline">
          ← Armas
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <GameIcon src={w.icon} alt={w.name} size={56} />
          <div>
            <h1 className="text-2xl font-semibold">{w.name}</h1>
            <div className={`text-sm font-semibold ${rarityColor(w.rarity)}`}>
              {w.rarity}★ · {w.type}
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 text-sm">
          <span className="chip">Stat principal: {w.mainStat}</span>
          {w.atk90 && <span className="chip">ATK base 90: {Math.round(w.atk90)}</span>}
          {w.subStat && (
            <span className="chip">
              {w.subStat.stat}:{" "}
              {w.subStat.stat.toLowerCase().includes("mastery")
                ? Math.round(w.subStat.value)
                : `${Math.round(w.subStat.value * 1000) / 10}%`}
            </span>
          )}
          {w.suitedRoles.map((r) => (
            <span key={r} className="chip">
              {r}
            </span>
          ))}
        </div>
        {w.passiveEffect && (
          <p className="mt-3 rounded-md bg-white/5 p-3 text-sm text-neutral-300">
            {w.passiveName ? <b>{w.passiveName}: </b> : null}
            {w.passiveEffect}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Inversión / recursos</h2>
        <div className="card p-4">
          {w.ascendCosts && w.ascendCosts.some((s) => s.length) ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-[11px] uppercase tracking-wide text-neutral-500">
                  Nivel
                </span>
                <select value={cLvl} onChange={(e) => setCLvl(Number(e.target.value))} className={selCls}>
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <span className="text-neutral-500">→</span>
                <select value={tLvl} onChange={(e) => setTLvl(Number(e.target.value))} className={selCls}>
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              {mats.length === 0 ? (
                <p className="text-sm text-neutral-500">Sin materiales para ese rango.</p>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {mats.map((m) => (
                    <div
                      key={m.name}
                      className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                        m.name === "Mora" ? "bg-amber-500/10 text-amber-200" : "bg-white/5"
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="tabular-nums">{fmt(m.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">Sin datos de ascensión para esta arma.</p>
          )}
        </div>
      </div>
    </div>
  )
}
