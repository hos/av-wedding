import i18next from "i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

await i18next.init({
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
});

export function t(
  key: string,
  lang?: string,
  values?: Record<string, string>,
): string {
  const lng = lang === "ru" ? "ru" : "en";
  return i18next.t(key, { lng, ...values });
}
