import type { Character, Team } from "@genshin-codex/domain"
import { ELEMENT_COLOR, elementClass } from "./genshin"

/** Avatar de personaje con anillo del color de su elemento. */
export function CharAvatar({
  char,
  slug,
  size = 32
}: {
  char?: Character | undefined
  slug: string
  size?: number
}) {
  const color = char ? ELEMENT_COLOR[char.element] : "#555"
  const common = {
    width: size,
    height: size,
    style: { width: size, height: size, borderColor: color },
    title: char?.name ?? slug,
    className: "rounded-full border-2 bg-white/5 object-cover"
  }
  if (char?.icon)
    return <img src={char.icon} alt={char.name} loading="lazy" {...common} />
  return (
    <div
      {...common}
      className="grid place-items-center rounded-full border-2 bg-white/5 text-[9px] text-neutral-500"
    >
      {(char?.name ?? slug).slice(0, 2)}
    </div>
  )
}

/** Roster de equipo: fila de avatares (anillo por elemento) + nombres con color de elemento. */
export function TeamRoster({
  members,
  chars,
  size = 34,
  names = true
}: {
  members: Team["members"]
  chars: Map<string, Character>
  size?: number
  names?: boolean
}) {
  return (
    <div>
      <div className="flex -space-x-2">
        {members.map((m) => (
          <CharAvatar
            key={m.characterSlug}
            slug={m.characterSlug}
            char={chars.get(m.characterSlug)}
            size={size}
          />
        ))}
      </div>
      {names && (
        <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs">
          {members.map((m, i) => {
            const c = chars.get(m.characterSlug)
            return (
              <span key={m.characterSlug} className="flex items-center gap-1">
                <span className={c ? elementClass(c.element) : "text-neutral-400"}>
                  {c?.name ?? m.characterSlug}
                </span>
                {i < members.length - 1 && <span className="text-neutral-700">·</span>}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Diff de una variante vs su equipo principal: qué miembro se reemplaza. */
export function teamDiff(
  main: Team | undefined,
  variant: Team
): { out?: string | undefined; in?: string | undefined } {
  if (!main) return {}
  const inV = variant.members.find(
    (m) => !main.members.some((x) => x.characterSlug === m.characterSlug)
  )
  const outM = main.members.find(
    (m) => !variant.members.some((x) => x.characterSlug === m.characterSlug)
  )
  return { out: outM?.characterSlug, in: inV?.characterSlug }
}
