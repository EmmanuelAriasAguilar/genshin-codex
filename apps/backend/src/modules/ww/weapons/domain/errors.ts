import { Data } from "effect"

export class WwWeaponNotFound extends Data.TaggedError("WwWeaponNotFound")<{
  readonly slug: string
}> {}
