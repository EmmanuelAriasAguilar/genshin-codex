import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/lib/theme"

/** Toaster global (estados success/error de mutaciones y acciones). Sigue el tema. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group border-border bg-popover text-popover-foreground rounded-lg shadow-lg"
        }
      }}
      {...props}
    />
  )
}
