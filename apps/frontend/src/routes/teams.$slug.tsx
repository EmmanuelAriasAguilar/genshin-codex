import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { getTeam, listArtifactSets, listCharacters, listTeams, listWeapons } from "../lib/api"
import { GameIcon } from "../lib/game-icon"
import { elementClass } from "../lib/genshin"

export const Route = createFileRoute("/teams/$slug")({ component: TeamDetail })

function TeamDetail() {
  const { slug } = Route.useParams()
  const team = useQuery({ queryKey: ["teams", slug], queryFn: () => getTeam(slug) })
  const chars = useQuery({ queryKey: ["characters"], queryFn: listCharacters })
  const allTeams = useQuery({ queryKey: ["teams"], queryFn: listTeams })
  const weapons = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const sets = useQuery({ queryKey: ["artifact-sets"], queryFn: listArtifactSets })

  if (team.isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (team.isError || !team.data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el equipo.</p>
        <Link to="/teams" className="text-sm text-cyan-300 hover:underline">
          ← Volver
        </Link>
      </div>
    )

  const t = team.data
  const findChar = (s: string) => chars.data?.find((c) => c.slug === s)
  const findVariant = (charSlug: string, variantSlug: string) =>
    findChar(charSlug)?.builds.find((b) => b.slug === variantSlug)
  const weaponName = (s: string) => weapons.data?.find((w) => w.slug === s)?.name ?? s
  const weaponIcon = (s: string) => weapons.data?.find((w) => w.slug === s)?.icon
  const setName = (s: string) => sets.data?.find((a) => a.slug === s)?.name ?? s
  const setIcon = (s: string) => sets.data?.find((a) => a.slug === s)?.icon

  // Familia de variantes: si es main, sus variantes; si es variante, la main + hermanas.
  const mainSlug = t.kind === "variant" ? t.basedOn : t.slug
  const family = (allTeams.data ?? []).filter(
    (x) => x.slug !== t.slug && (x.basedOn === mainSlug || x.slug === mainSlug)
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teams" className="text-sm text-cyan-300 hover:underline">
          ← Equipos
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{t.name}</h1>
          <span className="chip">{t.kind === "main" ? "principal" : "variante"}</span>
        </div>
        {t.description && <p className="mt-2 text-sm text-neutral-400">{t.description}</p>}
        {t.basedOn && (
          <p className="mt-1 text-sm">
            Variante de{" "}
            <Link
              to="/teams/$slug"
              params={{ slug: t.basedOn }}
              className="text-cyan-300 hover:underline"
            >
              el equipo principal
            </Link>
          </p>
        )}
      </div>

      {t.rotation && (
        <div className="card p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-neutral-500">
            Rotación
          </h2>
          <p className="whitespace-pre-line text-sm text-neutral-200">{t.rotation}</p>
        </div>
      )}

      <p className="text-sm text-neutral-500">
        Cada personaje muestra la build que le toca{" "}
        <span className="text-neutral-300">en este equipo</span> y sus otras variantes. La
        rotación frame-perfect vive en la guía KQM de cada personaje (ficha → “Guía completa”).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {t.members.map((m) => {
          const c = findChar(m.characterSlug)
          const v = findVariant(m.characterSlug, m.buildVariantSlug) ?? c?.builds[0]
          const others = (c?.builds ?? []).filter((b) => b.slug !== v?.slug)
          return (
            <div key={m.characterSlug} className="card p-4">
              <div className="flex items-center gap-3">
                <GameIcon src={c?.icon} alt={c?.name ?? m.characterSlug} size={40} rounded />
                <Link
                  to="/characters/$slug"
                  params={{ slug: m.characterSlug }}
                  className="flex-1 font-medium hover:text-cyan-300"
                >
                  {c?.name ?? m.characterSlug}
                </Link>
                {c && (
                  <span className={`text-xs font-semibold ${elementClass(c.element)}`}>
                    {c.element}
                  </span>
                )}
              </div>

              {v && (
                <>
                  <div className="mt-2 text-sm">
                    <span className="text-neutral-500">Build:</span>{" "}
                    <span className="text-cyan-300">{v.name}</span>
                  </div>
                  <dl className="mt-2 space-y-2 text-sm">
                    <div>
                      <dt className="mb-1 text-xs uppercase text-neutral-500">
                        Armas que le convienen
                      </dt>
                      <dd className="flex flex-col gap-1">
                        {v.weaponOptions.map((w, i) => (
                          <span key={w} className="flex items-center gap-1.5">
                            <span className="w-4 text-xs text-neutral-600">{i + 1}.</span>
                            <GameIcon src={weaponIcon(w)} alt="" size={20} />
                            {weaponName(w)}
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-xs uppercase text-neutral-500">
                        Sets de artefactos
                      </dt>
                      <dd className="flex flex-col gap-1">
                        {v.artifactSetOptions.map((s, i) => (
                          <span key={s} className="flex items-center gap-1.5">
                            <span className="w-4 text-xs text-neutral-600">{i + 1}.</span>
                            <GameIcon src={setIcon(s)} alt="" size={20} />
                            {setName(s)}
                          </span>
                        ))}
                      </dd>
                    </div>
                    {v.mainStats && (
                      <div>
                        <dt className="mb-1 text-xs uppercase text-neutral-500">Main stats</dt>
                        <dd className="flex flex-wrap gap-1">
                          <span className="chip">Arena: {v.mainStats.sands}</span>
                          <span className="chip">Cáliz: {v.mainStats.goblet}</span>
                          <span className="chip">Corona: {v.mainStats.circlet}</span>
                        </dd>
                      </div>
                    )}
                    {v.statPriority.length > 0 && (
                      <div>
                        <dt className="mb-1 text-xs uppercase text-neutral-500">Substats</dt>
                        <dd className="flex flex-wrap gap-1">
                          {v.statPriority.map((st, i) => (
                            <span key={st} className="chip">
                              {i + 1}. {st}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              )}

              {others.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                    Otras variantes de {c?.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {others.map((b) => (
                      <Link
                        key={b.slug}
                        to="/characters/$slug"
                        params={{ slug: m.characterSlug }}
                        className="chip hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {family.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">
            {t.kind === "main" ? "Variantes de este equipo" : "Equipo principal y otras variantes"}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {family.map((f) => (
              <Link
                key={f.slug}
                to="/teams/$slug"
                params={{ slug: f.slug }}
                className="card flex items-center gap-3 p-3"
              >
                <div className="flex -space-x-1">
                  {f.members.map((m) => (
                    <GameIcon
                      key={m.characterSlug}
                      src={findChar(m.characterSlug)?.icon}
                      alt=""
                      size={26}
                      rounded
                      className="ring-1 ring-[#0b0b10]"
                    />
                  ))}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <span className="chip shrink-0">{f.kind === "main" ? "principal" : "variante"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
