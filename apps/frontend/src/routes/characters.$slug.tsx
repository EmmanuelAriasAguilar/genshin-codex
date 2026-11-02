import type { BuildVariant } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  getCharacter,
  listArtifactSets,
  listWeapons
} from "../lib/api"
import { CharacterCalc } from "../lib/char-calc"
import { GameIcon } from "../lib/game-icon"
import { elementClass, roleEs, weaponEs } from "../lib/genshin"
import { EffectText } from "../lib/text"

type SetInfo = {
  name: string
  icon?: string | undefined
  bonus2?: string | undefined
  bonus4?: string | undefined
}
type WeaponInfo = {
  name: string
  icon?: string | undefined
  mainStat?: string | undefined
  passiveName?: string | undefined
  passiveEffect?: string | undefined
}

export const Route = createFileRoute("/characters/$slug")({ component: CharacterDetail })

function BuildCard({
  v,
  weaponInfo,
  setInfo
}: {
  v: BuildVariant
  weaponInfo: (s: string) => WeaponInfo
  setInfo: (s: string) => SetInfo
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{v.name}</h3>
        {v.appliesWithCharacters.length > 0 && (
          <span className="chip">con {v.appliesWithCharacters.join(", ")}</span>
        )}
      </div>
      {v.condition && (
        <p className="mt-1 text-sm text-neutral-400">{v.condition}</p>
      )}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Armas — qué aporta cada una
          </dt>
          <dd className="space-y-2">
            {v.weaponOptions.map((s, i) => {
              const info = weaponInfo(s)
              return (
                <div key={s} className="rounded-md bg-white/5 p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-neutral-600">{i + 1}.</span>
                    <GameIcon src={info.icon} alt={info.name} size={22} />
                    <span className="font-medium">{info.name}</span>
                    {info.mainStat && (
                      <span className="chip ml-auto">{info.mainStat}</span>
                    )}
                  </div>
                  {info.passiveEffect && (
                    <p className="mt-1 pl-6 text-xs text-neutral-400">
                      {info.passiveName ? (
                        <span className="text-neutral-500">{info.passiveName}: </span>
                      ) : null}
                      <EffectText text={info.passiveEffect} clamp={2} />
                    </p>
                  )}
                </div>
              )
            })}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Sets de artefactos — qué hace cada uno
          </dt>
          <dd className="space-y-2">
            {v.artifactSetOptions.map((s, i) => {
              const info = setInfo(s)
              return (
                <div key={s} className="rounded-md bg-white/5 p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-neutral-600">{i + 1}.</span>
                    <GameIcon src={info.icon} alt={info.name} size={22} />
                    <span className="font-medium">{info.name}</span>
                  </div>
                  {(info.bonus2 || info.bonus4) && (
                    <div className="mt-1 space-y-0.5 pl-6 text-xs text-neutral-400">
                      {info.bonus2 && (
                        <p>
                          <span className="text-neutral-500">2pz:</span>{" "}
                          <EffectText text={info.bonus2} />
                        </p>
                      )}
                      {info.bonus4 && (
                        <p>
                          <span className="text-neutral-500">4pz:</span>{" "}
                          <EffectText text={info.bonus4} clamp={2} />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </dd>
        </div>
        {v.mainStats && (
          <div className="sm:col-span-2">
            <dt className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
              Main stats por slot (para cualquier set de arriba)
            </dt>
            <dd className="flex flex-wrap gap-1">
              <span className="chip">Arena: {v.mainStats.sands}</span>
              <span className="chip">Cáliz: {v.mainStats.goblet}</span>
              <span className="chip">Corona: {v.mainStats.circlet}</span>
            </dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            Prioridad de substats
          </dt>
          <dd className="flex flex-wrap gap-1">
            {v.statPriority.map((s, i) => (
              <span key={s} className="chip">
                {i + 1}. {s}
              </span>
            ))}
          </dd>
        </div>
        {v.talentPriority && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Prioridad de talentos
            </dt>
            <dd className="text-neutral-200">{v.talentPriority}</dd>
          </div>
        )}
        {v.statTargets && v.statTargets.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Objetivos de stats (aprox.)
            </dt>
            <dd className="mt-1 space-y-1">
              {v.statTargets.map((t) => (
                <div key={t.stat} className="flex flex-wrap gap-x-2 text-sm">
                  <span className="min-w-40 font-medium text-neutral-200">{t.stat}</span>
                  <span className="text-neutral-400">{t.target}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-neutral-600">
                Guía general por tipo de build; el ER exacto depende de tu equipo y rotación.
              </p>
            </dd>
          </div>
        )}
      </dl>
      {v.tips && (
        <p className="mt-3 rounded-md bg-amber-500/5 p-2 text-xs text-amber-100/80">
          💡 {v.tips}
        </p>
      )}
      {v.notes && (
        <p className="mt-2 text-[11px] text-neutral-500">{v.notes}</p>
      )}
    </div>
  )
}

function CharacterDetail() {
  const { slug } = Route.useParams()
  const char = useQuery({
    queryKey: ["characters", slug],
    queryFn: () => getCharacter(slug)
  })
  const weapons = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const sets = useQuery({ queryKey: ["artifact-sets"], queryFn: listArtifactSets })
  const [variantIdx, setVariantIdx] = useState(0)

  const weaponInfo = (s: string): WeaponInfo => {
    const w = weapons.data?.find((x) => x.slug === s)
    return {
      name: w?.name ?? s,
      icon: w?.icon,
      mainStat: w?.mainStat,
      passiveName: w?.passiveName,
      passiveEffect: w?.passiveEffect
    }
  }
  const setInfo = (s: string): SetInfo => {
    const a = sets.data?.find((x) => x.slug === s)
    return {
      name: a?.name ?? s,
      icon: a?.icon,
      bonus2: a?.bonus2,
      bonus4: a?.bonus4
    }
  }

  if (char.isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (char.isError || !char.data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el personaje.</p>
        <Link to="/characters" className="text-sm text-cyan-300 hover:underline">
          ← Volver
        </Link>
      </div>
    )

  const c = char.data
  return (
    <div className="space-y-6" data-el={c.element}>
      <div className="space-y-2">
        <Link to="/characters" className="text-sm text-cyan-300 hover:underline">
          ← Personajes
        </Link>
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          {c.art && (
            <img
              src={c.art}
              alt=""
              loading="lazy"
              className="pointer-events-none absolute right-0 top-0 h-full w-2/3 object-cover object-top opacity-40"
              style={{
                maskImage: "linear-gradient(to left, black, transparent 80%)",
                WebkitMaskImage: "linear-gradient(to left, black, transparent 80%)"
              }}
            />
          )}
          <div className="relative p-5">
            <div className="flex items-center gap-3">
              <GameIcon src={c.icon} alt={c.name} size={64} rounded />
              <div>
                <h1 className="text-2xl font-semibold">{c.name}</h1>
                {c.profile?.title && (
                  <p className="text-sm italic text-neutral-400">{c.profile.title}</p>
                )}
                <span className={`font-semibold ${elementClass(c.element)}`}>
                  {c.element}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1 text-sm">
              <span className="chip">{c.rarity}★</span>
              <span className="chip">{weaponEs(c.weaponType)}</span>
              {c.region && <span className="chip">{c.region}</span>}
              {c.roles.map((r) => (
                <span key={r} className="chip">
                  {roleEs(r)}
                </span>
              ))}
            </div>
            {c.kqmUrl && (
              <a
                href={c.kqmUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/20"
              >
                Guía completa (KeqingMains) ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">
          Builds{" "}
          <span className="text-sm font-normal text-neutral-500">
            ({c.builds.length})
          </span>
        </h2>
        {c.builds.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún sin builds curadas. Agrégalas desde Admin.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Tabs de variantes (interactivo) */}
            <div className="flex flex-wrap gap-2">
              {c.builds.map((v, i) => (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => setVariantIdx(i)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    i === Math.min(variantIdx, c.builds.length - 1)
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 text-neutral-400 hover:bg-white/5"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
            {(() => {
              const v = c.builds[Math.min(variantIdx, c.builds.length - 1)]!
              return <BuildCard v={v} weaponInfo={weaponInfo} setInfo={setInfo} />
            })()}
          </div>
        )}
      </div>

      {c.invest && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Inversión / recursos</h2>
          <div className="card p-4">
            <CharacterCalc character={c} />
          </div>
        </div>
      )}

      {c.talents && c.talents.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Talentos</h2>
          <div className="space-y-2">
            {c.talents.map((t) => (
              <details key={t.kind} className="card p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <GameIcon src={t.icon} alt={t.name} size={28} />
                  <span className="chip">{t.kind}</span>
                  <span>{t.name}</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-400">
                  <EffectText text={t.description} />
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {c.passives && c.passives.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Talentos pasivos</h2>
          <div className="space-y-2">
            {c.passives.map((p) => (
              <details key={p.name} className="card p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <GameIcon src={p.icon} alt={p.name} size={28} />
                  <span>{p.name}</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-400">
                  <EffectText text={p.description} />
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {c.constellations && c.constellations.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Constelaciones</h2>
          <div className="space-y-2">
            {c.constellations.map((k) => (
              <details key={k.level} className="card p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <GameIcon src={k.icon} alt={k.name} size={28} />
                  <span className="chip">C{k.level}</span>
                  <span>{k.name}</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-400">
                  <EffectText text={k.description} />
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {c.profile && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Perfil</h2>
          <div className="card space-y-2 p-4 text-sm">
            {c.profile.description && (
              <p className="whitespace-pre-line text-neutral-400">
                {c.profile.description}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {c.profile.title && (
                <Fact label="Título" value={c.profile.title} />
              )}
              {c.profile.affiliation && (
                <Fact label="Afiliación" value={c.profile.affiliation} />
              )}
              {c.profile.constellationName && (
                <Fact label="Constelación" value={c.profile.constellationName} />
              )}
              {c.profile.birthday && (
                <Fact label="Cumpleaños" value={c.profile.birthday} />
              )}
              {c.profile.cv?.english && (
                <Fact label="Voz (EN)" value={c.profile.cv.english} />
              )}
              {c.profile.cv?.japanese && (
                <Fact label="Voz (JP)" value={c.profile.cv.japanese} />
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-300">{value}</dd>
    </div>
  )
}
