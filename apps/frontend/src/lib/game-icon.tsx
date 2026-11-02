type Props = {
  src?: string | undefined
  alt: string
  size?: number | undefined
  rounded?: boolean | undefined
  /** Si se pasa (3/4/5), envuelve el icono en un marco de rareza (dorado/morado/azul). */
  rarity?: number | undefined
  className?: string | undefined
}

/** Icono de juego (personaje/arma/set) con placeholder, marco de rareza opcional y
 *  manejo de imágenes rotas. */
export function GameIcon({ src, alt, size = 44, rounded, rarity, className }: Props) {
  const shape = rounded ? "rounded-full" : "rounded-md"
  const inner = !src ? (
    <div
      style={{ width: size, height: size }}
      className={`${shape} grid place-items-center bg-white/5 text-[10px] font-medium text-neutral-500 ${className ?? ""}`}
    >
      {alt.slice(0, 2)}
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`${shape} bg-neutral-900/60 object-cover ${className ?? ""}`}
      style={{ width: size, height: size }}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden"
      }}
    />
  )

  if (!rarity) return inner
  const frameClass =
    rarity >= 5 ? "frame-5" : rarity === 4 ? "frame-4" : "frame-3"
  return (
    <span className={`frame ${frameClass} ${rounded ? "frame-round" : ""}`}>
      {inner}
    </span>
  )
}
