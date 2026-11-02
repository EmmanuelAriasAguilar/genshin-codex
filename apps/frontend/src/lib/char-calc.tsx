import type { Character } from "@genshin-codex/domain"
import { useMemo, useState } from "react"
import {
  computeCharacterFull,
  LEVEL_OPTIONS,
  TALENT_LABELS,
  TALENT_OPTIONS,
  type TalentTarget
} from "./invest"

const fmt = (n: number) => n.toLocaleString("en-US")
const selCls =
  "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:border-cyan-500/50"

function Sel({
  value,
  onChange,
  options
}: {
  value: number
  onChange: (v: number) => void
  options: number[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={selCls}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/** Calculadora de inversión (nivel + 3 talentos individuales) para un personaje. */
export function CharacterCalc({ character }: { character: Character }) {
  const [cLvl, setCLvl] = useState(1)
  const [tLvl, setTLvl] = useState(90)
  const [talents, setTalents] = useState<TalentTarget[]>([
    { cur: 1, tgt: 9 },
    { cur: 1, tgt: 9 },
    { cur: 1, tgt: 9 }
  ])
  const setT = (i: number, patch: Partial<TalentTarget>) =>
    setTalents((cur) => cur.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  const materials = useMemo(
    () => (character.invest ? computeCharacterFull(character.invest, cLvl, tLvl, talents) : []),
    [character.invest, cLvl, tLvl, talents]
  )

  if (!character.invest) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">
            Nivel de personaje
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Sel value={cLvl} onChange={setCLvl} options={LEVEL_OPTIONS} />
            <span className="text-neutral-500">→</span>
            <Sel value={tLvl} onChange={setTLvl} options={LEVEL_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wide text-neutral-500">Talentos</div>
        {talents.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 text-neutral-400">{TALENT_LABELS[i]}</span>
            <Sel value={t.cur} onChange={(v) => setT(i, { cur: v })} options={TALENT_OPTIONS} />
            <span className="text-neutral-500">→</span>
            <Sel value={t.tgt} onChange={(v) => setT(i, { tgt: v })} options={TALENT_OPTIONS} />
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-neutral-500">
          Materiales totales
        </div>
        {materials.length === 0 ? (
          <p className="text-sm text-neutral-500">Nada que subir con ese rango.</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {materials.map((m) => (
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
      </div>
    </div>
  )
}
