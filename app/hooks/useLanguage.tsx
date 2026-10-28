import { useStoredValue } from "./useStoredValue";

export type Lang = "en" | "ru";
const LANGS = ["en", "ru"] as const;

const useLanguage = () => {
  const [lang, setLang] = useStoredValue<Lang>("lang", "en", LANGS);

  const toggle = () => setLang(lang === "en" ? "ru" : "en");

  return { lang, toggle };
};

export default useLanguage;
