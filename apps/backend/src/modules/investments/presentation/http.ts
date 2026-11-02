import {
  InvestmentAnalysis,
  InvestmentAnalysisDraft,
  Slug
} from "@genshin-codex/domain"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect, Schema } from "effect"
import type { InvestmentNotFound } from "../domain/errors.js"
import { InvestmentService } from "../application/investment-service.js"

const decodeSlug = Schema.decodeUnknown(Slug)

export const investmentsRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/investments",
    Effect.gen(function* () {
      const svc = yield* InvestmentService
      const all = yield* svc.list
      return yield* HttpServerResponse.schemaJson(Schema.Array(InvestmentAnalysis))(all)
    })
  ),
  HttpRouter.get(
    "/investments/:slug",
    Effect.gen(function* () {
      const svc = yield* InvestmentService
      const { slug } = yield* HttpRouter.params
      const a = yield* svc.getBySlug(yield* decodeSlug(slug))
      return yield* HttpServerResponse.schemaJson(InvestmentAnalysis)(a)
    }).pipe(
      Effect.catchTag("InvestmentNotFound", (e: InvestmentNotFound) =>
        HttpServerResponse.json({ error: "not_found", slug: e.slug }, { status: 404 })
      )
    )
  ),
  HttpRouter.post(
    "/investments",
    Effect.gen(function* () {
      const svc = yield* InvestmentService
      const draft = yield* HttpServerRequest.schemaBodyJson(InvestmentAnalysisDraft)
      const saved = yield* svc.save(draft)
      return yield* HttpServerResponse.schemaJson(InvestmentAnalysis)(saved).pipe(
        Effect.map(HttpServerResponse.setStatus(201))
      )
    })
  )
)
