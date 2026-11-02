import { Data } from "effect"

export class WeaponNotFound extends Data.TaggedError("WeaponNotFound")<{
  readonly slug: string
}> {}
