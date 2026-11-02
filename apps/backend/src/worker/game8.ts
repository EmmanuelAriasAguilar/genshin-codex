import { slugify, type WwTeam } from "@genshin-codex/domain"

/**
 * Parsers de game8.co para team comps de Wuthering Waves.
 * game8 está tras CloudFront y BLOQUEA IPv4 desde nuestra red (202 vacío); solo responde por IPv6.
 * El container Docker solo tiene egress IPv4, así que estos parsers NO corren en el sync:
 * se ejecutan en el host (que sí tiene IPv6) vía `game8-snapshot.ts`, que vuelca un JSON
 * (`../data/ww-teams.json`) que el sync lee y adjunta a cada resonador.
 */

const decode = (s: string) =>
  s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
const normApos = (s: string) => s.replace(/[’‘]/g, "'")

// Mapa slug->archiveID desde la tier list de game8 (cada personaje enlaza a su ficha).
export const parseGame8Ids = (html: string): Map<string, string> => {
  const map = new Map<string, string>()
  for (const m of html.matchAll(
    /href="[^"]*\/archives\/(\d+)"[^>]*>\s*<img[^>]*alt="([^"]+?) Icon"/g
  )) {
    const slug = slugify(normApos(decode(m[2] ?? "")))
    if (slug && !map.has(slug)) map.set(slug, m[1] ?? "")
  }
  return map
}

// Teams de la ficha game8: <h2>… Best Teams</h2> → varios <h3>equipo</h3> + <table>.
// Los miembros se filtran contra el catálogo (así se descartan los sets de la otra columna).
export const parseGame8Teams = (
  html: string,
  byName: Map<string, string> // nombre(lower) | slug -> slug del resonador
): WwTeam[] => {
  const hi = html.search(/<h2[^>]*>[^<]*Best Teams?[^<]*<\/h2>/i)
  if (hi < 0) return []
  const rest0 = html.slice(hi + 4)
  const nextH2 = rest0.search(/<h2[^>]*>/)
  const section = nextH2 >= 0 ? html.slice(hi, hi + 4 + nextH2) : html.slice(hi, hi + 8000)
  const teams: WwTeam[] = []
  for (const p of section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/g)) {
    const teamName = decode((p[1] ?? "").replace(/<[^>]+>/g, "").trim())
    const body = p[2] ?? ""
    const members: { slug: string; name: string; role?: string }[] = []
    const seen = new Set<string>()
    for (const im of body.matchAll(/alt=['"]Wuthering Waves - ([^'"]+)['"]/g)) {
      const nm = normApos(decode((im[1] ?? "").trim()))
      const slug = byName.get(nm.toLowerCase()) ?? byName.get(slugify(nm))
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      const near = body.slice(im.index ?? 0, (im.index ?? 0) + 300)
      const role = near.match(/\((Main DPS|Sub-DPS|Support|Healer|Buffer|Hypercarry)\)/i)?.[1]
      members.push({ slug, name: nm, ...(role ? { role } : {}) })
    }
    // game8 mete alternativas "flex" en la misma tabla; el equipo core son los que llevan rol.
    // Si ninguno trae rol, nos quedamos con los primeros 3 (tamaño de equipo en WuWa).
    const roled = members.filter((m) => m.role)
    const core = roled.length >= 2 ? roled : members.slice(0, 3)
    if (core.length >= 2) {
      // El resto de la tabla = sustitutos flex (variantes de la comp).
      const coreSlugs = new Set(core.map((m) => m.slug))
      const alternatives = members.filter((m) => !coreSlugs.has(m.slug))
      teams.push({
        name: teamName,
        members: core,
        ...(alternatives.length ? { alternatives } : {})
      })
    }
  }
  return teams
}
