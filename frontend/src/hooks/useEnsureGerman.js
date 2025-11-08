import { useLayoutEffect, useState } from "react";

export default function useEnsureGerman(i18nInstance) {
  const [ready, setReady] = useState(() => i18nInstance?.language === "de");

  useLayoutEffect(() => {
    if (!i18nInstance) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const finalize = () => {
      if (!cancelled) {
        setReady(i18nInstance.language === "de");
      }
    };

    if (i18nInstance.language !== "de") {
      setReady(false);
      const result = i18nInstance.changeLanguage("de");
      if (result && typeof result.then === "function") {
        result.then(finalize).catch(finalize);
      } else {
        finalize();
      }
    } else {
      finalize();
    }

    return () => {
      cancelled = true;
    };
  }, [i18nInstance]);

  return ready && i18nInstance?.language === "de";
}

