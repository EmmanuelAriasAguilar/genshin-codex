import type {
  BuildVariant,
  Character,
  CharacterCatalogData,
  CharacterDraft,
  Slug
} from "@genshin-codex/domain"
import { Effect, Option } from "effect"
import { CharacterNotFound, DuplicateBuildVariant } from "../domain/errors.js"
import { CharacterRepository } from "./repository.js"

/**
 * Servicio de aplicación: casos de uso de personajes.
 * Orquesta el repositorio (puerto) y las reglas de dominio. Sin detalles de HTTP ni de DB.
 */
export class CharacterService extends Effect.Service<CharacterService>()(
  "CharacterService",
  {
    effect: Effect.gen(function* () {
      const repo = yield* CharacterRepository

      const list = repo.list

      const getBySlug = (slug: Slug) =>
        repo.findBySlug(slug).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new CharacterNotFound({ slug })),
              onSome: Effect.succeed
            })
          )
        )

      const save = (draft: CharacterDraft) => repo.upsert(draft)

      const remove = (slug: Slug) => repo.remove(slug)

      /**
       * Upsert desde el auto-sync del catálogo: actualiza SOLO los campos objetivos
       * (nombre, elemento, arma, rareza...) y PRESERVA builds/roles curados por Mane.
       * Si el personaje es nuevo, entra sin builds y con rol por defecto pendiente de curar.
       */
      const syncCatalog = (data: CharacterCatalogData) =>
        repo.findBySlug(data.slug).pipe(
          Effect.flatMap((existing) => {
            const draft: CharacterDraft = Option.match(existing, {
              onNone: () => ({
                ...data,
                roles: ["DPS"] as const, // placeholder hasta curación
                builds: []
              }),
              onSome: (current): CharacterDraft => ({
                ...current,
                // solo pisamos datos de catálogo:
                name: data.name,
                element: data.element,
                weaponType: data.weaponType,
                rarity: data.rarity,
                ...(data.region !== undefined ? { region: data.region } : {}),
                ...(data.version !== undefined ? { version: data.version } : {}),
                ...(data.icon !== undefined ? { icon: data.icon } : {}),
                ...(data.art !== undefined ? { art: data.art } : {}),
                ...(data.combat !== undefined ? { combat: data.combat } : {}),
                ...(data.invest !== undefined ? { invest: data.invest } : {}),
                ...(data.talents !== undefined ? { talents: data.talents } : {}),
                ...(data.passives !== undefined ? { passives: data.passives } : {}),
                ...(data.constellations !== undefined
                  ? { constellations: data.constellations }
                  : {}),
                ...(data.profile !== undefined ? { profile: data.profile } : {})
              })
            })
            return repo.upsert(draft)
          })
        )

      /** Agrega una variante de build a un personaje existente (validando slug único). */
      const addBuildVariant = (characterSlug: Slug, variant: BuildVariant) =>
        getBySlug(characterSlug).pipe(
          Effect.flatMap((character: Character) => {
            const clash = character.builds.some((b) => b.slug === variant.slug)
            if (clash) {
              return Effect.fail(
                new DuplicateBuildVariant({
                  characterSlug,
                  variantSlug: variant.slug
                })
              )
            }
            return repo.upsert({
              ...character,
              builds: [...character.builds, variant]
            })
          })
        )

      return { list, getBySlug, save, remove, syncCatalog, addBuildVariant } as const
    }),
    dependencies: []
  }
) {}
