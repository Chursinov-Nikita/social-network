import { useEffect } from "react";
import { useStoredValue } from "./useStoredValue";

type Theme = "dark" | "light";
const THEMES = ["dark", "light"] as const;

const useTheme = () => {
  const [theme, setTheme] = useStoredValue<Theme>("theme", "dark", THEMES);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggle };
};

export default useTheme;
