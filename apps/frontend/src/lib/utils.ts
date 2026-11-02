import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Une clases condicionalmente (clsx) y resuelve conflictos de Tailwind (twMerge).
 *  Es la base de todos los primitivos de components/ui/*. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
