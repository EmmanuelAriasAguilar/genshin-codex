import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen.ts"

function RouteError({ error }: { error: Error }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-300">Algo falló al cargar</h2>
        <p className="mt-2 break-words font-mono text-xs text-red-400/80">
          {error?.message ?? "Error desconocido"}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-md bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-400"
        >
          Recargar
        </button>
      </div>
    </div>
  )
}

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultErrorComponent: RouteError
  })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
