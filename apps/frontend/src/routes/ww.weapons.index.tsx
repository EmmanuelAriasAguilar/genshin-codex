import type { WwWeaponType } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { listWwWeapons } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { rarityColor } from "../lib/genshin"

export const Route = createFileRoute("/ww/weapons/")({ component: WwWeapons })

const TYPES: WwWeaponType[] = [
  "Sword",
  "Broadblade",
  "Pistols",
  "Gauntlets",
  "Rectifier"
]

function WwWeapons() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-weapons"],
    queryFn: listWwWeapons
  })
  const [q, setQ] = useState("")
  const [type, setType] = useState<WwWeaponType | "all">("all")

  const list = (data ?? [])
    .filter((w) => w.name.toLowerCase().includes(q.toLowerCase()))
    .filter((w) => type === "all" || w.type === type)
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">Armas</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-amber-500/50"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WwWeaponType | "all")}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm"
          >
            <option value="all">Tipo</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {list.map((w) => (
          <Link
            key={w.slug}
            to="/ww/weapons/$slug"
            params={{ slug: w.slug }}
            className="card p-3 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <GameIcon src={w.icon} alt={w.name} size={46} rarity={w.rarity} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{w.name}</span>
                  <span
                    className={`shrink-0 text-sm font-semibold ${rarityColor(w.rarity)}`}
                  >
                    {w.rarity}★
                  </span>
                </div>
                <div className="text-xs text-neutral-500">{w.type}</div>
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
