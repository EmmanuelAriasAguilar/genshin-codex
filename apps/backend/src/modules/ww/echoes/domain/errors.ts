import { Data } from "effect"

export class WwEchoNotFound extends Data.TaggedError("WwEchoNotFound")<{
  readonly slug: string
}> {}
