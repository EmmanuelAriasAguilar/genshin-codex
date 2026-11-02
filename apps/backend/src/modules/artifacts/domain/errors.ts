import { Data } from "effect"

export class ArtifactSetNotFound extends Data.TaggedError("ArtifactSetNotFound")<{
  readonly slug: string
}> {}
