import type { Element, Role } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { listCharacters } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { ELEMENT_COLOR, ELEMENTS, elementClass, roleEs, ROLES, weaponEs } from "../lib/genshin"
import { Badge, hexToRgb, PageHeader, Stars } from "../lib/ui"

export const Route = createFileRoute("/characters/")({ component: Characters })

function Characters() {
  const { data, isLoading } = useQuery({
    queryKey: ["characters"],
    queryFn: listCharacters
  })
  const [q, setQ] = useState("")
  const [element, setElement] = useState<Element | "all">("all")
  const [role, setRole] = useState<Role | "all">("all")

  const list = (data ?? [])
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => element === "all" || c.element === element)
    .filter((c) => role === "all" || c.roles.includes(role))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Personajes"
        subtitle={data ? `${list.length} de ${data.length}` : undefined}
        right={
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="field"
            />
            <select
              value={element}
              onChange={(e) => setElement(e.target.value as Element | "all")}
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
              value={role}
              onChange={(e) => setRole(e.target.value as Role | "all")}
              className="field"
            >
              <option value="all">Rol</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </>
        }
      />

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {list.map((c) => (
          <Link
            key={c.slug}
            to="/characters/$slug"
            params={{ slug: c.slug }}
            className="card p-3.5"
            style={{ ["--el" as string]: hexToRgb(ELEMENT_COLOR[c.element]) }}
          >
            <div className="flex items-center gap-3">
              <GameIcon src={c.icon} alt={c.name} size={46} rarity={c.rarity} rounded />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${elementClass(c.element)}`}
                  >
                    {c.element}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                  <Stars rarity={c.rarity} />
                  <span>· {weaponEs(c.weaponType)}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 hidden flex-wrap items-center gap-1 sm:flex">
              {c.roles.map((r) => (
                <Badge key={r}>{roleEs(r)}</Badge>
              ))}
              <span className="ml-auto text-xs text-neutral-500">
                {c.builds.length} build{c.builds.length === 1 ? "" : "s"}
              </span>
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
