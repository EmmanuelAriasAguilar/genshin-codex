import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme"

/** Botón dark/light. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema" title="Tema claro/oscuro">
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}
