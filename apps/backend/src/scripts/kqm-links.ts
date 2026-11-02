import type { Slug } from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { ServicesLive } from "../runtime/live.js"

/**
 * Enlaza cada personaje a su guía completa de KeqingMains (theorycrafting autoritativo:
 * prioridad de talentos, ER, combos, teams). KQM no expone data estructurada confiable,
 * así que la integración correcta es LINKEAR a la fuente (siempre actualizada), no scrapear.
 *
 * Correr: `bun run src/scripts/kqm-links.ts`
 */

// Slugs de personaje que existen en keqingmains.com (nav del sitio, nombres cortos).
const KQM_SLUGS = [
  "albedo", "aloy", "amber", "anemo-traveler", "ayaka", "ayato", "baizhu",
  "barbara", "beidou", "bennett", "candace", "chongyun", "collei", "dehya",
  "diluc", "diona", "electro-traveler", "eula", "faruzan", "fischl", "furina",
  "ganyu", "geo-traveler", "gorou", "heizou", "hu-tao", "itto", "jean", "kaeya",
  "kaveh", "kazuha", "keqing", "kirara", "klee", "kokomi", "layla", "lisa",
  "mika", "mona", "nahida", "navia", "neuvillette", "nilou", "ningguang",
  "noelle", "qiqi", "raiden", "razor", "rosaria", "sara", "shenhe", "sucrose",
  "tartaglia", "thoma", "tighnari", "venti", "wanderer", "xiangling", "xiao",
  "xingqiu", "xinyan", "yae", "yanfei", "yaoyao", "yelan", "yoimiya", "yunjin",
  "zhongli", "dehya"
]

const program = Effect.gen(function* () {
  const charSvc = yield* CharacterService
  const chars = yield* charSvc.list

  const kqm = new Set(KQM_SLUGS)
  // Empareja nuestro slug (nombre completo) con el slug corto de KQM.
  const matchKqm = (slug: string): string | null => {
    if (kqm.has(slug)) return slug
    for (const k of kqm) {
      if (slug.endsWith(`-${k}`) || slug.startsWith(`${k}-`)) return k
    }
    return null
  }

  let linked = 0
  for (const c of chars) {
    const k = matchKqm(c.slug)
    if (!k) continue
    if (c.kqmUrl === `https://keqingmains.com/${k}/`) {
      linked++
      continue
    }
    yield* charSvc.save({ ...c, kqmUrl: `https://keqingmains.com/${k}/` })
    linked++
  }

  yield* Effect.log(`kqm-links: ${linked}/${chars.length} personajes enlazados a KeqingMains`)
}).pipe(Effect.provide(ServicesLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
