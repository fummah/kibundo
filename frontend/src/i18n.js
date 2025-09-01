import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import de from "./locales/de.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    en_US: { translation: en }, // alias
    de: { translation: de },
    de_DE: { translation: de }  // alias
  },
  lng: localStorage.getItem("i18nextLng") || "en",
  fallbackLng: ["en", "en_US"],
  supportedLngs: ["en", "en_US", "de", "de_DE"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

export default i18n;
