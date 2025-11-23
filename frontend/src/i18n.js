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
    lng: "de", // Primary language is German
    fallbackLng: "de", // Fallback to German if translation missing
    supportedLngs: ["de", "en"],
    detection: {
      order: ["localStorage", "cookie"], // Only check stored preferences, not browser language
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "i18nextLng",
      lookupCookie: "i18next",
      // Only use detected language if it's in the supported list
      checkWhitelist: true,
    },
    // Ensure German is always the default
    load: "languageOnly", // "de-DE" -> "de"
    nonExplicitSupportedLngs: false,
    interpolation: { escapeValue: false },
    debug: false,
  });

// Force German as default if no language is stored or if detected language is not supported
const storedLang = localStorage.getItem("i18nextLng");
if (!storedLang || (storedLang !== "de" && storedLang !== "en")) {
  i18n.changeLanguage("de");
  localStorage.setItem("i18nextLng", "de");
}

export default i18n;
