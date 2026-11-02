// Servidor de producción: SSR de TanStack Start + assets + proxy /api -> backend (sin prefijo).
import handler from "./dist/server/server.js"

const clientDir = `${import.meta.dir}/dist/client`
const port = Number(process.env.PORT ?? 4900)
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4901"

Bun.serve({
  port,
  idleTimeout: 30,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname.startsWith("/api/")) {
      const target = backendUrl + url.pathname.replace(/^\/api/, "") + url.search
      const init: RequestInit & { duplex?: "half" } = {
        method: req.method,
        headers: req.headers,
        redirect: "manual"
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = req.body
        init.duplex = "half"
      }
      return fetch(target, init)
    }

    if (url.pathname !== "/") {
      const file = Bun.file(clientDir + url.pathname)
      if (await file.exists()) return new Response(file)
    }

    return handler.fetch(req)
  }
})

console.log(`[frontend] SSR + /api proxy en http://localhost:${port} (backend: ${backendUrl})`)
