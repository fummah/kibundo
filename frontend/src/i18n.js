// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Vite can import JSON from /src directly
import de from "./locales/de/translation.json";
import en from "./locales/en/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: "de", // Default language is German
    fallbackLng: "de",
    supportedLngs: ["de", "en"],
    detection: {
      order: ["localStorage", "cookie", "htmlTag", "navigator"], // no ?lng=
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: { escapeValue: false },
    debug: false,
  });

export default i18n;
