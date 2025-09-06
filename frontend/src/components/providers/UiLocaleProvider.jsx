// src/components/providers/UiLocaleProvider.jsx
import React, { useEffect, useMemo } from "react";
import { ConfigProvider } from "antd";
import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/locale/en";
import { useTranslation } from "react-i18next";

const antdLocales = { de: deDE, en: enUS };

export default function UiLocaleProvider({ children, fallback = "de" }) {
  const { i18n } = useTranslation();            // i18next = source of truth
  const lang = (i18n?.language || fallback).split("-")[0]; // "de-DE" -> "de"

  useEffect(() => {
    dayjs.locale(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const locale = useMemo(() => antdLocales[lang] ?? antdLocales[fallback], [lang, fallback]);

  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
}
