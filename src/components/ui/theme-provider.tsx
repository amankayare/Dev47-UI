import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  /** If true, saves/restores the previous documentElement classes on unmount */
  scoped?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getEffectiveInitialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;
  try {
    const path = window.location.pathname;
    let effectiveKey = storageKey;
    if (storageKey === "vs-portfolio-theme") {
      if (path.startsWith("/writer")) effectiveKey = "vs-writer-theme";
      else if (path.startsWith("/admin")) effectiveKey = "vs-admin-theme";
    }
    const saved = localStorage.getItem(effectiveKey) || localStorage.getItem("vs-portfolio-theme");
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved as Theme;
    }
  } catch {}
  return defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  scoped = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => getEffectiveInitialTheme(storageKey, defaultTheme)
  )

  useEffect(() => {
    const root = window.document.documentElement

    // Resolve the actual theme (handle 'system')
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme

    if (scoped) {
      // Save current class so we can restore on unmount if needed
      const prevLight = root.classList.contains("light")
      const prevDark = root.classList.contains("dark")

      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
      root.setAttribute("data-theme", resolvedTheme)

      return () => {
        root.classList.remove("light", "dark")
        if (prevDark) root.classList.add("dark")
        else if (prevLight) root.classList.add("light")
      }
    } else {
      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)
      root.setAttribute("data-theme", resolvedTheme)
    }
  }, [theme, scoped])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
