import type { Element } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { listInvestments } from "../lib/api"
import { elementClass } from "../lib/genshin"

export const Route = createFileRoute("/investments/")({ component: Investments })

function Investments() {
  const { data, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: listInvestments
  })

  const list = (data ?? []).slice().sort((a, b) => a.character.localeCompare(b.character))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Análisis de inversión</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Orden de jale costo-efectivo por personaje: qué conviene pullear y en qué orden
          (constelaciones, arma sig., teammates) con el aumento aproximado de daño. Curado de
          fuentes, no calculado por nosotros — cada uno acredita su autor.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => (
          <Link
            key={a.slug}
            to="/investments/$slug"
            params={{ slug: a.slug }}
            className="card p-4 transition-colors hover:bg-white/5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-lg font-medium ${a.element ? elementClass(a.element as Element) : ""}`}
              >
                {a.character}
              </span>
              {a.element && (
                <span className="text-xs text-neutral-500">{a.element}</span>
              )}
            </div>
            {a.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{a.summary}</p>
            )}
            <div className="mt-2 text-xs text-neutral-600">por {a.source.author}</div>
          </Link>
        ))}
      </div>
      {data && list.length === 0 && (
        <p className="text-sm text-neutral-500">Aún no hay análisis cargados.</p>
      )}
    </div>
  )
}
