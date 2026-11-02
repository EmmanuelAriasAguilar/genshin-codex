import type { Character, Team } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { listCharacters, listTeams } from "../lib/api"
import { CharAvatar, TeamRoster, teamDiff } from "../lib/team-ui"
import { elementClass } from "../lib/genshin"

export const Route = createFileRoute("/teams/")({ component: Teams })

function VariantRow({
  main,
  variant,
  chars
}: {
  main: Team
  variant: Team
  chars: Map<string, Character>
}) {
  const { out, in: inn } = teamDiff(main, variant)
  const outC = out ? chars.get(out) : undefined
  const inC = inn ? chars.get(inn) : undefined
  return (
    <Link
      to="/teams/$slug"
      params={{ slug: variant.slug }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
    >
      <span className="text-neutral-600">↳</span>
      {inC && <CharAvatar char={inC} slug={inn!} size={24} />}
      <span className="text-neutral-300">
        {outC && inC ? (
          <>
            <span className={outC ? elementClass(outC.element) : ""}>{outC.name}</span>
            <span className="text-neutral-600"> → </span>
            <span className={inC ? elementClass(inC.element) : ""}>{inC.name}</span>
          </>
        ) : (
          variant.name
        )}
      </span>
    </Link>
  )
}

function Teams() {
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams })
  const charsQ = useQuery({ queryKey: ["characters"], queryFn: listCharacters })
  const [q, setQ] = useState("")
  const nq = q.trim().toLowerCase()

  const chars = useMemo(() => {
    const m = new Map<string, Character>()
    for (const c of charsQ.data ?? []) m.set(c.slug, c)
    return m
  }, [charsQ.data])

  const teams = teamsQ.data ?? []

  // Agrupar por DPS principal (primer miembro = carry).
  const carries = useMemo(() => {
    const byCarry = new Map<string, Team[]>()
    for (const t of teams) {
      const carry = t.members[0]?.characterSlug
      if (!carry) continue
      if (!byCarry.has(carry)) byCarry.set(carry, [])
      byCarry.get(carry)!.push(t)
    }
    return [...byCarry.entries()]
      .map(([slug, ts]) => {
        const mains = ts
          .filter((t) => t.kind === "main")
          .sort((a, b) => {
            const ac = a.slug.endsWith("-comp") ? 0 : 1
            const bc = b.slug.endsWith("-comp") ? 0 : 1
            return ac - bc || a.name.localeCompare(b.name)
          })
        const variantsByMain = new Map<string, Team[]>()
        for (const t of ts)
          if (t.kind === "variant" && t.basedOn) {
            if (!variantsByMain.has(t.basedOn)) variantsByMain.set(t.basedOn, [])
            variantsByMain.get(t.basedOn)!.push(t)
          }
        return { carry: chars.get(slug), slug, mains, variantsByMain, count: ts.length }
      })
      .filter((x) => x.carry && x.mains.length > 0)
      .sort((a, b) => a.carry!.name.localeCompare(b.carry!.name))
  }, [teams, chars])

  const matches = (sec: (typeof carries)[number]) => {
    if (!nq) return true
    if (sec.carry!.name.toLowerCase().includes(nq)) return true
    return sec.mains.some(
      (t) =>
        t.name.toLowerCase().includes(nq) ||
        t.members.some((m) =>
          (chars.get(m.characterSlug)?.name ?? m.characterSlug).toLowerCase().includes(nq)
        )
    )
  }
  const sections = carries.filter(matches)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Equipos</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por DPS, personaje o equipo…"
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-500/50 sm:w-80"
        />
      </div>
      <p className="text-sm text-neutral-500">
        {teams.length} equipos por <span className="text-neutral-300">DPS principal</span>. Cada
        comp muestra sus variantes (qué personaje se reemplaza).
      </p>

      {teamsQ.isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="space-y-2">
        {sections.map((sec) => (
          <details key={sec.slug} open={!!nq} className="card overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-white/5">
              <CharAvatar char={sec.carry} slug={sec.slug} size={36} />
              <Link
                to="/characters/$slug"
                params={{ slug: sec.slug }}
                className={`font-medium hover:underline ${elementClass(sec.carry!.element)}`}
                onClick={(e) => e.stopPropagation()}
              >
                {sec.carry!.name}
              </Link>
              <span className="text-xs text-neutral-500">
                {sec.mains.length} comp{sec.mains.length === 1 ? "" : "s"}
              </span>
            </summary>

            <div className="space-y-2 border-t border-white/10 p-3">
              {sec.mains.map((main) => {
                const variants = sec.variantsByMain.get(main.slug) ?? []
                return (
                  <div key={main.slug} className="rounded-lg bg-white/[0.02] p-3">
                    <Link
                      to="/teams/$slug"
                      params={{ slug: main.slug }}
                      className="block rounded-md transition-colors hover:bg-white/5"
                    >
                      <TeamRoster members={main.members} chars={chars} />
                    </Link>
                    {variants.length > 0 && (
                      <div className="mt-2 border-t border-white/5 pt-1">
                        <div className="px-2 py-0.5 text-[11px] uppercase tracking-wide text-neutral-600">
                          Variantes
                        </div>
                        {variants.map((v) => (
                          <VariantRow key={v.slug} main={main} variant={v} chars={chars} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      {teamsQ.data && sections.length === 0 && (
        <p className="text-sm text-neutral-500">Sin resultados para “{q}”.</p>
      )}
    </div>
  )
}
