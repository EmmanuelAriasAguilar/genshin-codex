import type { Character, Team } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listArtifactSets, listCharacters, listTeams, listWeapons } from "../lib/api"
import { elementClass } from "../lib/genshin"
import { CharAvatar, TeamRoster } from "../lib/team-ui"

export const Route = createFileRoute("/builder")({ component: Builder })

function Builder() {
  const charsQ = useQuery({ queryKey: ["characters"], queryFn: listCharacters })
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams })
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: listArtifactSets })

  const [selected, setSelected] = useState<string[]>([])
  const [q, setQ] = useState("")

  const chars = useMemo(() => {
    const m = new Map<string, Character>()
    for (const c of charsQ.data ?? []) m.set(c.slug, c)
    return m
  }, [charsQ.data])

  const toggle = (slug: string) =>
    setSelected((cur) =>
      cur.includes(slug)
        ? cur.filter((s) => s !== slug)
        : cur.length >= 4
          ? cur
          : [...cur, slug]
    )

  const weaponName = (s: string) => weaponsQ.data?.find((w) => w.slug === s)?.name ?? s
  const setName = (s: string) => setsQ.data?.find((a) => a.slug === s)?.name ?? s

  // Comps curadas que contienen TODOS los seleccionados. Ranking: match exacto y "-comp" primero.
  const matches = useMemo(() => {
    if (selected.length === 0) return [] as Team[]
    const sel = new Set(selected)
    return (teamsQ.data ?? [])
      .filter((t) => [...sel].every((s) => t.members.some((m) => m.characterSlug === s)))
      .sort((a, b) => {
        const ax = a.members.length === selected.length ? 0 : 1
        const bx = b.members.length === selected.length ? 0 : 1
        const ac = a.slug.endsWith("-comp") ? 0 : 1
        const bc = b.slug.endsWith("-comp") ? 0 : 1
        return ax - bx || ac - bc
      })
      .slice(0, 6)
  }, [selected, teamsQ.data])

  const filtered = (charsQ.data ?? [])
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const buildInTeam = (t: Team, charSlug: string) => {
    const c = chars.get(charSlug)
    const slot = t.members.find((m) => m.characterSlug === charSlug)
    const b =
      c?.builds.find((x) => x.slug === slot?.buildVariantSlug) ?? c?.builds[0]
    return { c, b }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Armador de equipos</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Elige hasta 4 personajes. El sistema busca las <b>comps curadas</b> que los incluyen y
          te resuelve la <b>build de cada uno en ese equipo</b>. Cambia un personaje y la comp
          sugerida cambia sola.
        </p>
      </div>

      {/* seleccionados */}
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-2">
        {selected.length === 0 && (
          <span className="text-sm text-neutral-500">Nadie seleccionado…</span>
        )}
        {selected.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 py-0.5 pl-0.5 pr-2 text-sm text-cyan-100"
          >
            <CharAvatar char={chars.get(s)} slug={s} size={22} />
            {chars.get(s)?.name ?? s} ✕
          </button>
        ))}
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            limpiar
          </button>
        )}
      </div>

      {/* resultados */}
      {selected.length >= 1 && (
        <div className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500">
            Comps que encajan ({matches.length})
          </h2>
          {matches.length === 0 && (
            <p className="text-sm text-neutral-500">
              No hay comp curada con esa combinación. Prueba con otros, o mira las builds
              individuales de cada personaje.
            </p>
          )}
          {matches.map((t) => (
            <div key={t.slug} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/teams/$slug"
                  params={{ slug: t.slug }}
                  className="font-medium hover:text-cyan-300"
                >
                  {t.name}
                </Link>
                <span className="chip shrink-0">
                  {t.kind === "main" ? "principal" : "variante"}
                </span>
              </div>
              <div className="mt-2">
                <TeamRoster members={t.members} chars={chars} names={false} />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {t.members.map((m) => {
                  const { c, b } = buildInTeam(t, m.characterSlug)
                  const picked = selected.includes(m.characterSlug)
                  return (
                    <div
                      key={m.characterSlug}
                      className={`rounded-md p-2 text-sm ${
                        picked ? "bg-cyan-500/10" : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CharAvatar char={c} slug={m.characterSlug} size={22} />
                        <span className={c ? elementClass(c.element) : ""}>
                          {c?.name ?? m.characterSlug}
                        </span>
                        {b && <span className="ml-auto text-xs text-cyan-300">{b.name}</span>}
                      </div>
                      {b && (
                        <div className="mt-1 pl-7 text-xs text-neutral-500">
                          {weaponName(b.weaponOptions[0])} · {setName(b.artifactSetOptions[0])}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* picker */}
      <div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar personaje…"
          className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-500/50"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c) => {
            const on = selected.includes(c.slug)
            const disabled = !on && selected.length >= 4
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggle(c.slug)}
                disabled={disabled}
                className={`card flex items-center gap-2 p-2.5 text-left ${
                  on ? "border-cyan-500/50 bg-cyan-500/10" : ""
                } ${disabled ? "opacity-40" : ""}`}
              >
                <CharAvatar char={c} slug={c.slug} size={30} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className={`text-xs ${elementClass(c.element)}`}>{c.element}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
