export const LOCALE_COOKIE_NAME = "dokploy_locale";

export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt-BR";

export const isSupportedLocale = (value?: string | null): value is AppLocale =>
	!!value && SUPPORTED_LOCALES.includes(value as AppLocale);
