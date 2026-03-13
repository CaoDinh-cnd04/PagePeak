import { create } from "zustand";

export type LangCode = "vi" | "en" | "ja" | "ko" | "zh" | "th";

type LangState = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
};

function getSavedLang(): LangCode {
  if (typeof window === "undefined") return "vi";
  const saved = localStorage.getItem("app_lang") as LangCode | null;
  if (saved && ["vi", "en", "ja", "ko", "zh", "th"].includes(saved)) return saved;
  return "vi";
}

export const useLangStore = create<LangState>((set) => ({
  lang: getSavedLang(),
  setLang: (lang) => {
    if (typeof window !== "undefined") localStorage.setItem("app_lang", lang);
    set({ lang });
  },
}));
