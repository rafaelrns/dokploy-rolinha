export const SERVER_DEFAULT_LOCALE = "pt-BR" as const;
export const SERVER_SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type ServerLocale = (typeof SERVER_SUPPORTED_LOCALES)[number];

export const isServerLocale = (value?: string | null): value is ServerLocale =>
	!!value && SERVER_SUPPORTED_LOCALES.includes(value as ServerLocale);

export const resolveServerLocale = (value?: string | null): ServerLocale =>
	isServerLocale(value) ? value : SERVER_DEFAULT_LOCALE;
