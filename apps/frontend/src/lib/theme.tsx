import * as React from "react"

/**
 * Theming dark/light sobre las variables CSS de shadcn (.dark en <html>).
 * SSR: el shell renderiza <html class="dark"> por defecto; este provider ajusta
 * en cliente según localStorage / prefers-color-scheme tras montar.
 */
type Theme = "dark" | "light"

const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {}
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("dark")

  // Init desde storage / preferencia del SO (solo cliente).
  React.useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) as Theme | null
    if (saved === "light" || saved === "dark") {
      setTheme(saved)
    } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light")
    }
  }, [])

  // Aplica la clase + persiste.
  React.useEffect(() => {
    const el = document.documentElement
    el.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem("theme", theme)
    } catch {
      /* noop */
    }
  }, [theme])

  const value = React.useMemo(
    () => ({ theme, setTheme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }),
    [theme]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => React.useContext(ThemeContext)
