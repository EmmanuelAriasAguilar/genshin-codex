import { Data } from "effect"

export class WwSonataNotFound extends Data.TaggedError("WwSonataNotFound")<{
  readonly slug: string
}> {}
