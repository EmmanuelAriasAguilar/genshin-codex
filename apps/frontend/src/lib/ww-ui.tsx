import type { Resonator, WwTeam } from "@genshin-codex/domain"
import { Link } from "@tanstack/react-router"
import { WW_ELEMENT_COLOR } from "./genshin"

/** Avatar de resonador con anillo del color de su elemento. */
export function WwAvatar({
  res,
  slug,
  name,
  size = 34
}: {
  res?: Resonator | undefined
  slug: string
  name?: string | undefined
  size?: number
}) {
  const color = res ? WW_ELEMENT_COLOR[res.element] : "#555"
  const common = {
    width: size,
    height: size,
    style: { width: size, height: size, borderColor: color },
    title: res?.name ?? name ?? slug,
    className: "rounded-full border-2 bg-white/5 object-cover"
  }
  if (res?.icon)
    return <img src={res.icon} alt={res.name} loading="lazy" {...common} />
  return (
    <div
      {...common}
      className="grid place-items-center rounded-full border-2 bg-white/5 text-[9px] text-neutral-500"
    >
      {(res?.name ?? name ?? slug).slice(0, 2)}
    </div>
  )
}

/** Roster de team comp: avatares (anillo por elemento) + nombres con rol; enlaza a cada resonador. */
export function WwTeamRoster({
  team,
  bySlug,
  size = 40
}: {
  team: WwTeam
  bySlug: Map<string, Resonator>
  size?: number
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {team.members.map((m) => {
        const res = bySlug.get(m.slug)
        const inner = (
          <div className="flex w-16 flex-col items-center gap-1 text-center">
            <WwAvatar res={res} slug={m.slug} name={m.name} size={size} />
            <span className="text-xs leading-tight">{m.name}</span>
            {m.role && <span className="text-[10px] text-neutral-500">{m.role}</span>}
          </div>
        )
        return res ? (
          <Link
            key={m.slug}
            to="/ww/resonators/$slug"
            params={{ slug: m.slug }}
            className="hover:opacity-80"
          >
            {inner}
          </Link>
        ) : (
          <div key={m.slug}>{inner}</div>
        )
      })}
    </div>
  )
}
