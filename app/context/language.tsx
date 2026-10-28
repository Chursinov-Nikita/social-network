"use client";
import { createContext, useContext } from "react";
import useLanguage, { type Lang } from "../hooks/useLanguage";

type LanguageContextType = {
  lang: Lang;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  toggle: () => {},
});

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { lang, toggle } = useLanguage();
  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
