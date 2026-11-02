import type { BuildVariant, CharacterDraft, StatTarget } from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"

/**
 * Deriva objetivos de stats aproximados por build a partir de su ARQUETIPO (main stats + prioridad
 * de substats que la build ya declara). NO son cifras oficiales por personaje — esas no existen como
 * dato limpio; en Genshin los targets son dependientes del arquetipo y del equipo (sobre todo el ER).
 * Es determinista e idempotente: recalcula y sobreescribe statTargets en cada build.
 * Correr: `bun run src/worker/enrich-stat-targets.ts`.
 */

const deriveTargets = (b: BuildVariant): StatTarget[] => {
  const sands = (b.mainStats?.sands ?? "").toLowerCase()
  const circlet = (b.mainStats?.circlet ?? "").toLowerCase()
  const pr = b.statPriority
  const has = (s: string) => pr.includes(s as never)
  const lead = (s: string) => pr.indexOf(s as never) >= 0 && pr.indexOf(s as never) <= 1

  const crit = circlet.includes("crit") || has("CritRate") || has("CritDMG")
  const em =
    circlet.includes("mastery") ||
    sands.includes("mastery") ||
    (lead("ElementalMastery") && !circlet.includes("crit"))
  const erFocused = sands.includes("recharge") || lead("EnergyRecharge")

  const out: StatTarget[] = []

  if (crit)
    out.push({
      stat: "Crit Rate / Crit DMG",
      target: "~70% / ~140%+ (ratio ≈ 1:2; apunta a Crit Value ~180–220)"
    })
  if (em)
    out.push({
      stat: "Maestría Elemental (EM)",
      target:
        "~200+ base; sube a ~400–1000 en builds de reacción (Hyperbloom/Aggravate/Spread) y ~150–250 si la combinas con crit (Vaporize/Melt)"
    })

  if (sands.includes("atk") || (!em && !sands))
    out.push({ stat: "Ataque (ATK)", target: "ATK on-field alto (~1800–2500 con buffs de equipo)" })
  else if (sands.includes("hp"))
    out.push({ stat: "Vida (HP)", target: "HP% en arena — personaje que escala con HP" })
  else if (sands.includes("def"))
    out.push({ stat: "Defensa (DEF)", target: "DEF% en arena — personaje que escala con DEF" })

  out.push({
    stat: "Recarga de Energía (ER)",
    target: erFocused
      ? "Alta: ~180–250%+ según tu equipo y rotación"
      : "Depende de tu equipo: típico ~120–160% (revisa el requisito de tu comp)"
  })

  return out
}

const program = Effect.gen(function* () {
  const svc = yield* CharacterService
  const chars = yield* svc.list

  let nBuilds = 0
  const updated: CharacterDraft[] = chars.map((c) => {
    const builds = c.builds.map((b) => {
      nBuilds++
      return { ...b, statTargets: deriveTargets(b) }
    })
    return { ...c, builds }
  })

  yield* Effect.forEach(updated, (c) => svc.save(c), { discard: true })
  yield* Effect.log(
    `enrich-stat-targets: ${updated.length} personajes, ${nBuilds} builds con statTargets`
  )
}).pipe(Effect.provide(ServicesLive), Effect.provide(PgLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
