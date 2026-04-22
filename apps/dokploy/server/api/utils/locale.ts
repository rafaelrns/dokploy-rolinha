import type { NextApiRequest, NextApiResponse } from "next";

export const API_DEFAULT_LOCALE = "pt-BR" as const;
export const API_SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type ApiLocale = (typeof API_SUPPORTED_LOCALES)[number];
export const API_LOCALE_COOKIE_NAME = "dokploy_locale";

export const isApiLocale = (value?: string | null): value is ApiLocale =>
	!!value && API_SUPPORTED_LOCALES.includes(value as ApiLocale);

const parseCookie = (cookieHeader?: string) => {
	if (!cookieHeader) {
		return {};
	}
	return cookieHeader
		.split(";")
		.map((entry) => entry.trim())
		.reduce<Record<string, string>>((acc, pair) => {
			const separatorIndex = pair.indexOf("=");
			if (separatorIndex < 0) {
				return acc;
			}
			const key = pair.slice(0, separatorIndex);
			const value = decodeURIComponent(pair.slice(separatorIndex + 1));
			acc[key] = value;
			return acc;
		}, {});
};

export const resolveApiLocale = (req: NextApiRequest, userLocale?: string | null) => {
	if (isApiLocale(userLocale)) {
		return userLocale;
	}

	const headerLocale = req.headers["x-dokploy-locale"];
	if (typeof headerLocale === "string" && isApiLocale(headerLocale)) {
		return headerLocale;
	}

	const cookieLocale = parseCookie(req.headers.cookie)[API_LOCALE_COOKIE_NAME];
	if (isApiLocale(cookieLocale)) {
		return cookieLocale;
	}

	const acceptLanguage = req.headers["accept-language"];
	if (typeof acceptLanguage === "string") {
		if (acceptLanguage.toLowerCase().includes("pt-br")) {
			return "pt-BR";
		}
		if (acceptLanguage.toLowerCase().includes("en")) {
			return "en";
		}
	}

	return API_DEFAULT_LOCALE;
};

export const setLocaleCookie = (res: NextApiResponse, locale: ApiLocale) => {
	res.setHeader(
		"Set-Cookie",
		`${API_LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`,
	);
};
