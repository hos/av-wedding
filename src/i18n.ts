import i18next from "i18next";
import type { Context, MiddlewareFn } from "grammy";
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
  const lng = lang?.startsWith("ru") ? "ru" : "en";
  return i18next.t(key, { lng, ...values });
}

/** Context flavor that adds ctx.t() */
export interface I18nFlavor {
  t(key: string, values?: Record<string, string>): string;
}

export type I18nContext = Context & I18nFlavor;

/** Middleware that adds ctx.t() bound to the user's language */
export function i18nMiddleware(): MiddlewareFn<I18nContext> {
  return (ctx, next) => {
    const lang = ctx.from?.language_code;
    ctx.t = (key: string, values?: Record<string, string>) => t(key, lang, values);
    return next();
  };
}
