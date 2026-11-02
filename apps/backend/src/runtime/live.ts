import { Layer } from "effect"
import { PgLive } from "../db/sql.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { CharacterRepositoryPostgres } from "../modules/characters/infrastructure/postgres-repository.js"
import { WeaponService } from "../modules/weapons/application/weapon-service.js"
import { WeaponRepositoryPostgres } from "../modules/weapons/infrastructure/postgres-repository.js"
import { ArtifactSetService } from "../modules/artifacts/application/artifact-service.js"
import { ArtifactSetRepositoryPostgres } from "../modules/artifacts/infrastructure/postgres-repository.js"
import { TeamService } from "../modules/teams/application/team-service.js"
import { TeamSelector } from "../modules/teams/application/team-selector.js"
import { TeamRepositoryPostgres } from "../modules/teams/infrastructure/postgres-repository.js"
import { ResonatorService } from "../modules/ww/resonators/application/resonator-service.js"
import { ResonatorRepositoryPostgres } from "../modules/ww/resonators/infrastructure/postgres-repository.js"
import { WwWeaponService } from "../modules/ww/weapons/application/ww-weapon-service.js"
import { WwWeaponRepositoryPostgres } from "../modules/ww/weapons/infrastructure/postgres-repository.js"
import { WwEchoService } from "../modules/ww/echoes/application/ww-echo-service.js"
import { WwEchoRepositoryPostgres } from "../modules/ww/echoes/infrastructure/postgres-repository.js"
import { WwSonataService } from "../modules/ww/sonatas/application/ww-sonata-service.js"
import { WwSonataRepositoryPostgres } from "../modules/ww/sonatas/infrastructure/postgres-repository.js"
import { InvestmentService } from "../modules/investments/application/investment-service.js"
import { InvestmentRepositoryPostgres } from "../modules/investments/infrastructure/postgres-repository.js"

/** Repos Postgres (comparten el mismo SqlClient). */
export const ReposLive = Layer.mergeAll(
  CharacterRepositoryPostgres,
  WeaponRepositoryPostgres,
  ArtifactSetRepositoryPostgres,
  TeamRepositoryPostgres,
  ResonatorRepositoryPostgres,
  WwWeaponRepositoryPostgres,
  WwEchoRepositoryPostgres,
  WwSonataRepositoryPostgres,
  InvestmentRepositoryPostgres
).pipe(Layer.provide(PgLive))

/** Todos los servicios de aplicación, ya con sus repos. Reusado por server, seed y worker. */
export const ServicesLive = Layer.mergeAll(
  CharacterService.Default,
  WeaponService.Default,
  ArtifactSetService.Default,
  TeamService.Default,
  TeamSelector.Default,
  ResonatorService.Default,
  WwWeaponService.Default,
  WwEchoService.Default,
  WwSonataService.Default,
  InvestmentService.Default
).pipe(Layer.provide(ReposLive))
