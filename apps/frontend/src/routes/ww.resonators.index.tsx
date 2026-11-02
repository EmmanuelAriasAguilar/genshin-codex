import type { WwElement, WwWeaponType } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { listResonators } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { tierClass, WW_ELEMENT_COLOR } from "../lib/genshin"
import { ElementDot, hexToRgb, Stars } from "../lib/ui"

export const Route = createFileRoute("/ww/resonators/")({ component: Resonators })

const ELEMENTS: WwElement[] = [
  "Glacio",
  "Fusion",
  "Electro",
  "Aero",
  "Spectro",
  "Havoc"
]
const WEAPONS: WwWeaponType[] = [
  "Sword",
  "Rectifier",
  "Gauntlets",
  "Pistols",
  "Broadblade"
]

function Resonators() {
  const { data, isLoading } = useQuery({
    queryKey: ["ww-resonators"],
    queryFn: listResonators
  })
  const [q, setQ] = useState("")
  const [element, setElement] = useState<WwElement | "all">("all")
  const [weapon, setWeapon] = useState<WwWeaponType | "all">("all")

  const list = (data ?? [])
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => element === "all" || r.element === element)
    .filter((r) => weapon === "all" || r.weaponType === weapon)
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <div>
        <Link to="/ww" className="text-sm text-amber-300 hover:underline">
          ← Wuthering Waves
        </Link>
        <div className="mt-1 flex flex-wrap items-end gap-2">
          <h1 className="mr-auto text-2xl font-semibold tracking-tight">Resonadores</h1>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="field"
          />
          <select
            value={element}
            onChange={(e) => setElement(e.target.value as WwElement | "all")}
            className="field"
          >
            <option value="all">Elemento</option>
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
          <select
            value={weapon}
            onChange={(e) => setWeapon(e.target.value as WwWeaponType | "all")}
            className="field"
          >
            <option value="all">Arma</option>
            {WEAPONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {list.map((r) => (
          <Link
            key={r.slug}
            to="/ww/resonators/$slug"
            params={{ slug: r.slug }}
            className="card relative block p-3"
            style={{ ["--el" as string]: hexToRgb(WW_ELEMENT_COLOR[r.element] ?? "#8aa0b4") }}
          >
            {r.tier && (
              <span
                className={`absolute right-2 top-2 rounded border px-1.5 text-[11px] font-bold ${tierClass(r.tier)}`}
              >
                {r.tier}
              </span>
            )}
            <div className="flex items-center gap-3">
              <GameIcon src={r.icon} alt={r.name} size={46} rarity={r.rarity} rounded />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{r.name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                  <Stars rarity={r.rarity} />
                  <span>· {r.weaponType}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <ElementDot color={WW_ELEMENT_COLOR[r.element] ?? "#8aa0b4"} />
                  <span style={{ color: WW_ELEMENT_COLOR[r.element] }}>{r.element}</span>
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
