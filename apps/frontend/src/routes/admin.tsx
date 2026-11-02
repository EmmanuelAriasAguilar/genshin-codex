import type { BuildVariant, Slug, Stat, Team } from "@genshin-codex/domain"
import { slugify } from "@genshin-codex/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  addBuildVariant,
  getAdminToken,
  listArtifactSets,
  listCharacters,
  listWeapons,
  saveTeam,
  setAdminToken
} from "../lib/api"
import { STATS } from "../lib/genshin"

export const Route = createFileRoute("/admin")({ component: Admin })

const splitSlugs = (s: string) =>
  s
    .split(",")
    .map((x) => slugify(x.trim()))
    .filter(Boolean) as Slug[]

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-500/50"

function Admin() {
  const qc = useQueryClient()
  const chars = useQuery({ queryKey: ["characters"], queryFn: listCharacters })
  const weapons = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const sets = useQuery({ queryKey: ["artifact-sets"], queryFn: listArtifactSets })

  const [token, setTok] = useState(getAdminToken() ?? "")

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Admin · curación</h1>

      {/* Token */}
      <section className="card p-4">
        <Field label="Admin token (se guarda en este navegador)">
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setTok(e.target.value)}
              className={inputCls}
              placeholder="ADMIN_TOKEN del backend"
            />
            <button
              type="button"
              onClick={() => setAdminToken(token)}
              className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-black hover:bg-cyan-400"
            >
              Guardar
            </button>
          </div>
        </Field>
        <p className="mt-2 text-xs text-neutral-500">
          Solo se pide para escribir. Las lecturas son públicas. Si el backend no define
          ADMIN_TOKEN, no hace falta.
        </p>
      </section>

      {/* Datalists compartidas */}
      <datalist id="dl-characters">
        {chars.data?.map((c) => <option key={c.slug} value={c.slug} />)}
      </datalist>
      <datalist id="dl-weapons">
        {weapons.data?.map((w) => <option key={w.slug} value={w.slug} />)}
      </datalist>
      <datalist id="dl-sets">
        {sets.data?.map((a) => <option key={a.slug} value={a.slug} />)}
      </datalist>

      <BuildForm
        characterSlugs={chars.data?.map((c) => c.slug) ?? []}
        onDone={() => qc.invalidateQueries({ queryKey: ["characters"] })}
      />

      <TeamForm onDone={() => qc.invalidateQueries({ queryKey: ["teams"] })} />
    </div>
  )
}

function BuildForm({
  characterSlugs,
  onDone
}: {
  characterSlugs: string[]
  onDone: () => void
}) {
  const [character, setCharacter] = useState("")
  const [name, setName] = useState("")
  const [condition, setCondition] = useState("")
  const [appliesWith, setAppliesWith] = useState("")
  const [weaponsStr, setWeaponsStr] = useState("")
  const [setsStr, setSetsStr] = useState("")
  const [statPriority, setStatPriority] = useState<Stat[]>([])
  const [notes, setNotes] = useState("")

  const mut = useMutation({
    mutationFn: () => {
      const variant: BuildVariant = {
        slug: slugify(name) as Slug,
        name,
        condition,
        appliesWithCharacters: splitSlugs(appliesWith),
        weaponOptions: splitSlugs(weaponsStr) as [Slug, ...Slug[]],
        artifactSetOptions: splitSlugs(setsStr) as [Slug, ...Slug[]],
        statPriority,
        ...(notes ? { notes } : {})
      }
      return addBuildVariant(character, variant)
    },
    onSuccess: () => {
      onDone()
      setName("")
      setCondition("")
      setAppliesWith("")
      setWeaponsStr("")
      setSetsStr("")
      setStatPriority([])
      setNotes("")
    }
  })

  const toggleStat = (s: Stat) =>
    setStatPriority((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    )

  const valid =
    character && name && weaponsStr.trim() && setsStr.trim()

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-medium">Agregar variante de build</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Personaje (slug)">
          <input
            list="dl-characters"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            className={inputCls}
            placeholder="hu-tao"
          />
        </Field>
        <Field label="Nombre de la variante">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Vaporize (on-field)"
          />
        </Field>
      </div>
      <Field label="Condición de uso">
        <input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className={inputCls}
          placeholder="Con un aplicador de Hydro fuerte"
        />
      </Field>
      <Field label="Aplica con (slugs, coma-separados)">
        <input
          value={appliesWith}
          onChange={(e) => setAppliesWith(e.target.value)}
          className={inputCls}
          placeholder="yelan, furina"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Armas (slugs, prioridad, coma-sep)">
          <input
            list="dl-weapons"
            value={weaponsStr}
            onChange={(e) => setWeaponsStr(e.target.value)}
            className={inputCls}
            placeholder="staff-of-homa, deathmatch"
          />
        </Field>
        <Field label="Sets (slugs, prioridad, coma-sep)">
          <input
            list="dl-sets"
            value={setsStr}
            onChange={(e) => setSetsStr(e.target.value)}
            className={inputCls}
            placeholder="marechaussee-hunter"
          />
        </Field>
      </div>
      <Field label="Prioridad de stats (click para ordenar)">
        <div className="flex flex-wrap gap-1">
          {STATS.map((s) => {
            const i = statPriority.indexOf(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStat(s)}
                className={`chip ${i >= 0 ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" : ""}`}
              >
                {i >= 0 ? `${i + 1}. ` : ""}
                {s}
              </button>
            )
          })}
        </div>
      </Field>
      <Field label="Notas (opcional)">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
        />
      </Field>
      {mut.isError && (
        <p className="text-sm text-red-300">{(mut.error as Error).message}</p>
      )}
      {mut.isSuccess && <p className="text-sm text-emerald-300">Guardado.</p>}
      <button
        type="button"
        disabled={!valid || mut.isPending}
        onClick={() => mut.mutate()}
        className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400 disabled:opacity-40"
      >
        {mut.isPending ? "Guardando…" : "Agregar build"}
      </button>
    </section>
  )
}

type MemberInput = { characterSlug: string; buildVariantSlug: string }

function TeamForm({ onDone }: { onDone: () => void }) {
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [kind, setKind] = useState<"main" | "variant">("main")
  const [basedOn, setBasedOn] = useState("")
  const [description, setDescription] = useState("")
  const [members, setMembers] = useState<MemberInput[]>([
    { characterSlug: "", buildVariantSlug: "" },
    { characterSlug: "", buildVariantSlug: "" },
    { characterSlug: "", buildVariantSlug: "" },
    { characterSlug: "", buildVariantSlug: "" }
  ])

  const setMember = (i: number, patch: Partial<MemberInput>) =>
    setMembers((cur) => cur.map((m, j) => (j === i ? { ...m, ...patch } : m)))

  const mut = useMutation({
    mutationFn: () => {
      const filled = members.filter((m) => m.characterSlug && m.buildVariantSlug)
      const team: Team = {
        slug: (slugify(slug || name) as Slug),
        name,
        kind,
        ...(description ? { description } : {}),
        ...(kind === "variant" && basedOn ? { basedOn: slugify(basedOn) as Slug } : {}),
        members: filled.map((m) => ({
          characterSlug: slugify(m.characterSlug) as Slug,
          buildVariantSlug: slugify(m.buildVariantSlug) as Slug
        }))
      }
      return saveTeam(team)
    },
    onSuccess: onDone
  })

  const valid =
    name && members.some((m) => m.characterSlug && m.buildVariantSlug)

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-medium">Crear / editar equipo</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Slug (auto si vacío)">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tipo">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "main" | "variant")}
            className={inputCls}
          >
            <option value="main">principal</option>
            <option value="variant">variante</option>
          </select>
        </Field>
        {kind === "variant" && (
          <Field label="Basado en (slug del principal)">
            <input value={basedOn} onChange={(e) => setBasedOn(e.target.value)} className={inputCls} />
          </Field>
        )}
      </div>
      <Field label="Descripción">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
        />
      </Field>
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          Miembros (personaje · variante)
        </span>
        {members.map((m, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input
              list="dl-characters"
              value={m.characterSlug}
              onChange={(e) => setMember(i, { characterSlug: e.target.value })}
              className={inputCls}
              placeholder={`personaje ${i + 1}`}
            />
            <input
              value={m.buildVariantSlug}
              onChange={(e) => setMember(i, { buildVariantSlug: e.target.value })}
              className={inputCls}
              placeholder="slug de variante (ej: vaporize)"
            />
          </div>
        ))}
      </div>
      {mut.isError && (
        <p className="text-sm text-red-300">{(mut.error as Error).message}</p>
      )}
      {mut.isSuccess && <p className="text-sm text-emerald-300">Equipo guardado.</p>}
      <button
        type="button"
        disabled={!valid || mut.isPending}
        onClick={() => mut.mutate()}
        className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-400 disabled:opacity-40"
      >
        {mut.isPending ? "Guardando…" : "Guardar equipo"}
      </button>
    </section>
  )
}
