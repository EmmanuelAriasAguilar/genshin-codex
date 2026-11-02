import { Data } from "effect"

export class ResonatorNotFound extends Data.TaggedError("ResonatorNotFound")<{
  readonly slug: string
}> {}
