"use client";

import { useLang } from "@/app/context/language";
import useTheme from "@/app/hooks/useTheme";
import { t } from "@/app/translation/translation";
import { Moon, Sun } from "lucide-react";

const PreferenceButtons = ({ className = "" }: { className?: string }) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const tr = t[lang];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={toggleLang}
        aria-label={tr.language}
        title={tr.language}
        className="icon-btn text-xs font-medium"
      >
        {lang === "en" ? "RU" : "EN"}
      </button>
      <button
        onClick={toggleTheme}
        aria-label={tr.theme}
        title={tr.theme}
        className="icon-btn"
      >
        {theme === "dark" ? (
          <Moon className="size-5" strokeWidth={1.75} />
        ) : (
          <Sun className="size-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
};

export default PreferenceButtons;
