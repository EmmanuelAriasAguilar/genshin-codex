import type { Element, InvestmentItem } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { getInvestment } from "../lib/api"
import { elementClass } from "../lib/genshin"

export const Route = createFileRoute("/investments/$slug")({
  component: InvestmentDetail
})

function ItemRow({ it }: { it: InvestmentItem }) {
  return (
    <div className="flex gap-3 px-3 py-2.5">
      {it.rank && (
        <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-bold tabular-nums text-amber-300/80">
          {it.rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{it.what}</span>
          {it.teamDmg && (
            <span className="text-xs font-semibold text-emerald-300">
              equipo {it.teamDmg}
            </span>
          )}
          {it.charDmg && (
            <span className="text-xs text-cyan-300">personaje {it.charDmg}</span>
          )}
        </div>
        {it.notes && <p className="mt-0.5 text-xs text-neutral-400">{it.notes}</p>}
      </div>
    </div>
  )
}

const CHART_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185"]

function BreakdownBar({
  parts
}: {
  parts: readonly { label: string; share: number }[]
}) {
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {parts.map((p, i) => (
          <div
            key={p.label}
            className="h-full"
            style={{
              width: `${p.share}%`,
              backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
            }}
            title={`${p.label}: ${p.share}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {parts.map((p, i) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-neutral-300">{p.label}</span>
            <span className="tabular-nums text-neutral-500">{p.share}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function InvestmentDetail() {
  const { slug } = Route.useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["investment", slug],
    queryFn: () => getInvestment(slug)
  })

  if (isLoading) return <p className="text-sm text-neutral-500">Cargando…</p>
  if (isError || !data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">No se encontró el análisis.</p>
        <Link to="/investments" className="text-sm text-cyan-300 hover:underline">
          ← Análisis de inversión
        </Link>
      </div>
    )

  const a = data
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link to="/investments" className="text-sm text-cyan-300 hover:underline">
          ← Análisis de inversión
        </Link>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
          <h1
            className={`text-2xl font-semibold ${a.element ? elementClass(a.element as Element) : ""}`}
          >
            {a.character}
          </h1>
          {a.summary && (
            <p className="mt-2 max-w-2xl text-sm text-neutral-300">{a.summary}</p>
          )}
          <div className="mt-2 text-xs text-neutral-500">
            Fuente: {a.source.author}
            {a.source.url && (
              <>
                {" · "}
                <a
                  href={a.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  ver original
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {a.scenarios.map((sc) => (
        <section key={sc.title}>
          <h2 className="mb-2 text-lg font-medium">{sc.title}</h2>
          <div className="card divide-y divide-white/5">
            {sc.items.map((it, i) => (
              <ItemRow key={`${it.what}-${i}`} it={it} />
            ))}
          </div>
        </section>
      ))}

      {a.optional && a.optional.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-medium">Opcionales</h2>
          <div className="card divide-y divide-white/5">
            {a.optional.map((it, i) => (
              <ItemRow key={`opt-${it.what}-${i}`} it={it} />
            ))}
          </div>
        </section>
      )}

      {a.breakdowns && a.breakdowns.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Reparto de daño del equipo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {a.breakdowns.map((bd) => (
              <div key={bd.title} className="card p-4">
                <div className="mb-2 text-sm font-medium">{bd.title}</div>
                <BreakdownBar parts={bd.parts} />
              </div>
            ))}
          </div>
        </section>
      )}

      {a.tables && a.tables.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-lg font-medium">Tablas de daño</h2>
          {a.tables.map((t) => (
            <div key={t.title} className="space-y-1.5">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-left text-xs text-neutral-400">
                      {t.columns.map((c) => (
                        <th key={c} className="px-3 py-2 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, ri) => {
                      const isTotal = (row[0] ?? "").toLowerCase().startsWith("total")
                      return (
                        <tr
                          key={ri}
                          className={`border-t border-white/5 ${
                            isTotal ? "bg-white/[0.03] font-semibold" : ""
                          }`}
                        >
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`px-3 py-2 tabular-nums ${
                                ci === 0
                                  ? "font-normal not-italic text-neutral-300"
                                  : "text-neutral-400"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {t.note && <p className="text-xs text-neutral-500">{t.note}</p>}
            </div>
          ))}
        </section>
      )}

      {a.comparisons && a.comparisons.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-medium">Comparaciones directas</h2>
          <div className="card divide-y divide-white/5">
            {a.comparisons.map((c) => (
              <div key={c.label} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{c.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-emerald-300">
                    {c.value}
                  </span>
                </div>
                {c.notes && <p className="mt-0.5 text-xs text-neutral-500">{c.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {a.notes && a.notes.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-medium">Notas del autor</h2>
          <ul className="space-y-1.5">
            {a.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-sm text-neutral-400">
                <span className="text-neutral-600">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
