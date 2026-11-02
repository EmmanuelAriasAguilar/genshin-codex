import { Data } from "effect"

export class TeamNotFound extends Data.TaggedError("TeamNotFound")<{
  readonly slug: string
}> {}
