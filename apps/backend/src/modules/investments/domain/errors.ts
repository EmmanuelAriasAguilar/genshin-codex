import { Data } from "effect"

export class InvestmentNotFound extends Data.TaggedError("InvestmentNotFound")<{
  readonly slug: string
}> {}
