import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  getResonator,
  listResonators,
  listWwSonatas,
  listWwWeapons
} from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { tierClass, WW_ELEMENT_COLOR } from "../lib/genshin"
import { EffectText } from "../lib/text"

export const Route = createFileRoute("/ww/resonators/$slug")({
  component: ResonatorDetail
})

function ResonatorDetail() {
  const { slug } = Route.useParams()
  const res = useQuery({
    queryKey: ["ww-resonator", slug],
    queryFn: () => getResonator(slug)
  })
  const weapons = useQuery({ queryKey: ["ww-weapons"], queryFn: listWwWeapons })
  const sonatas = useQuery({ queryKey: ["ww-sonatas"], queryFn: listWwSonatas })
  const roster = useQuery({ queryKey: ["ww-resonators"], queryFn: listResonators })

  if (res.isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (res.isError || !res.data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el resonador.</p>
        <Link to="/ww/resonators" className="text-sm text-amber-300 hover:underline">
          ← Resonadores
        </Link>
      </div>
    )

  const r = res.data
  const color = WW_ELEMENT_COLOR[r.element]
  // Match tolerante: ignora may/min, apóstrofos y símbolos (& / espacios) para no
  // dejar iconos vacíos por diferencias de codificación (ej. "Lux & Umbra").
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const weaponByName = (name: string) =>
    weapons.data?.find((w) => w.name === name) ??
    weapons.data?.find((w) => norm(w.name) === norm(name))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link to="/ww/resonators" className="text-sm text-amber-300 hover:underline">
          ← Resonadores
        </Link>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <div className="flex items-center gap-3">
            <GameIcon src={r.icon} alt={r.name} size={64} rounded />
            <div>
              <h1 className="text-2xl font-semibold">{r.name}</h1>
              <span className="font-semibold" style={{ color }}>
                {r.element}
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-sm">
            {r.tier && (
              <span className={`chip font-bold ${tierClass(r.tier)}`}>
                Tier {r.tier}
              </span>
            )}
            <span className="chip">{r.rarity}★</span>
            <span className="chip">{r.weaponType}</span>
          </div>
        </div>
      </div>

      {r.build ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Build recomendada</h2>

          {r.build.weapons.length > 0 && (
            <div className="card p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Armas · mejor → alternativas
              </div>
              <div className="space-y-1.5">
                {r.build.weapons.map((wName, i) => {
                  const w = weaponByName(wName)
                  return (
                    <div
                      key={wName}
                      className={`flex items-center gap-2 text-sm ${i === 0 ? "rounded-[2px] bg-[rgb(var(--accent-neon)/0.06)] px-1 py-0.5" : ""}`}
                    >
                      <span className="w-4 text-xs text-neutral-600">{i + 1}.</span>
                      <GameIcon src={w?.icon} alt={wName} size={26} rarity={w?.rarity} />
                      <span className={i === 0 ? "font-medium" : ""}>{wName}</span>
                      {i === 0 && (
                        <span className="badge badge-accent px-1 py-0 text-[9px]">MEJOR</span>
                      )}
                      {w && (
                        <span className="ml-auto text-xs text-neutral-500">
                          {w.rarity}★ · {w.type}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {r.build.sonatas.length > 0 && (
            <div className="card p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                Sonata sets (Echoes)
              </div>
              <div className="space-y-3">
                {r.build.sonatas.map((name) => {
                  const s =
                    sonatas.data?.find((x) => x.name === name) ??
                    sonatas.data?.find((x) => norm(x.name) === norm(name))
                  return (
                    <div key={name} className="rounded-md bg-white/5 p-3">
                      <div className="flex items-center gap-2">
                        <GameIcon src={s?.icon} alt={name} size={28} />
                        <Link
                          to="/ww/sonatas"
                          className="font-medium hover:text-amber-200"
                          style={
                            s?.element ? { color: WW_ELEMENT_COLOR[s.element] } : undefined
                          }
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
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Fuente: wuthering.gg. Los main stats por slot y substats no están disponibles en la
            fuente.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Aún sin build recomendada para este resonador.
        </p>
      )}

      {r.teams && r.teams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Team comps</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.teams.map((team) => (
              <div key={team.name} className="card p-4">
                <div className="mb-3 text-sm font-medium">{team.name}</div>
                <div className="flex flex-wrap gap-3">
                  {team.members.map((mbr) => {
                    const m = roster.data?.find((x) => x.slug === mbr.slug)
                    const ring = m ? WW_ELEMENT_COLOR[m.element] : undefined
                    const inner = (
                      <div className="flex w-16 flex-col items-center gap-1 text-center">
                        <span
                          className="rounded-full p-0.5"
                          style={ring ? { boxShadow: `0 0 0 2px ${ring}` } : undefined}
                        >
                          <GameIcon src={m?.icon} alt={mbr.name} size={44} rounded />
                        </span>
                        <span className="text-xs leading-tight">{mbr.name}</span>
                        {mbr.role && (
                          <span className="text-[10px] text-neutral-500">{mbr.role}</span>
                        )}
                      </div>
                    )
                    return m ? (
                      <Link
                        key={mbr.slug}
                        to="/ww/resonators/$slug"
                        params={{ slug: mbr.slug }}
                        className="hover:opacity-80"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={mbr.slug}>{inner}</div>
                    )
                  })}
                </div>

                {team.alternatives && team.alternatives.length > 0 && (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Flex / variantes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.alternatives.map((alt) => {
                        const m = roster.data?.find((x) => x.slug === alt.slug)
                        const ring = m ? WW_ELEMENT_COLOR[m.element] : undefined
                        const chip = (
                          <span className="flex items-center gap-1.5 rounded-[2px] border border-border/60 bg-muted/30 py-0.5 pl-0.5 pr-2">
                            <span
                              className="rounded-full p-[1px]"
                              style={ring ? { boxShadow: `0 0 0 1.5px ${ring}` } : undefined}
                            >
                              <GameIcon src={m?.icon} alt={alt.name} size={22} rounded />
                            </span>
                            <span className="text-[11px]">{alt.name}</span>
                          </span>
                        )
                        return m ? (
                          <Link
                            key={alt.slug}
                            to="/ww/resonators/$slug"
                            params={{ slug: alt.slug }}
                            className="hover:opacity-80"
                          >
                            {chip}
                          </Link>
                        ) : (
                          <div key={alt.slug}>{chip}</div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500">Fuente: game8.co.</p>
        </div>
      )}
    </div>
  )
}
