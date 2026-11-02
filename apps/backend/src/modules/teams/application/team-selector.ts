import type {
  BuildVariant,
  Character,
  SelectionRequest,
  SelectionResult,
  SelectionSuggestion,
  Slug
} from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { CharacterRepository } from "../../characters/application/repository.js"

/**
 * Selector de variantes. Regla (ADR-0001 / punto 4-5):
 * para cada personaje elegido, se puntúa cada una de sus variantes de build por cuántos de
 * los OTROS personajes elegidos aparecen en `appliesWithCharacters`. Gana la de mayor score.
 * Si ninguna variante tiene regla que aplique, cae a la primera (normalmente "Genérica").
 *
 * Es una función pura sobre datos del repo → fácil de testear y de explicar.
 */
export class TeamSelector extends Effect.Service<TeamSelector>()("TeamSelector", {
  effect: Effect.gen(function* () {
    const characters = yield* CharacterRepository

    const suggestFor = (
      character: Character,
      others: ReadonlySet<string>
    ): SelectionSuggestion => {
      if (character.builds.length === 0) {
        return {
          characterSlug: character.slug,
          suggestedVariant: null,
          variantName: null,
          score: 0,
          reason: "El personaje aún no tiene builds curadas."
        }
      }

      const scored = character.builds.map((v: BuildVariant) => {
        const matches = v.appliesWithCharacters.filter((s) => others.has(s))
        return { variant: v, score: matches.length, matches }
      })

      // mejor score; en empate, la primera definida (orden de curación = prioridad)
      const best = scored.reduce((a, b) => (b.score > a.score ? b : a))

      if (best.score === 0) {
        const fallback = scored[0]!
        return {
          characterSlug: character.slug,
          suggestedVariant: fallback.variant.slug,
          variantName: fallback.variant.name,
          score: 0,
          reason: "Sin regla específica para este equipo; variante por defecto."
        }
      }

      return {
        characterSlug: character.slug,
        suggestedVariant: best.variant.slug,
        variantName: best.variant.name,
        score: best.score,
        reason: `Coincide con: ${best.matches.join(", ")}.`
      }
    }

    const suggest = (
      request: SelectionRequest
    ): Effect.Effect<SelectionResult> =>
      Effect.gen(function* () {
        const slugs = request.characterSlugs
        const suggestions = yield* Effect.forEach(slugs, (slug: Slug) =>
          characters.findBySlug(slug).pipe(
            Effect.map(
              Option.match({
                onNone: (): SelectionSuggestion => ({
                  characterSlug: slug,
                  suggestedVariant: null,
                  variantName: null,
                  score: 0,
                  reason: "Personaje no encontrado en el catálogo."
                }),
                onSome: (character) =>
                  suggestFor(
                    character,
                    new Set(slugs.filter((s) => s !== slug))
                  )
              })
            )
          )
        )
        return { input: slugs, suggestions }
      })

    return { suggest } as const
  })
}) {}
