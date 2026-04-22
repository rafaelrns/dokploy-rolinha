import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import enMessages from "@/locales/en.json";
import ptBrMessages from "@/locales/pt-BR.json";
import {
	DEFAULT_LOCALE,
	LOCALE_COOKIE_NAME,
	type AppLocale,
	isSupportedLocale,
} from "./constants";

type MessageDict = Record<string, string>;

const MESSAGES: Record<AppLocale, MessageDict> = {
	"pt-BR": ptBrMessages,
	en: enMessages,
};

const getLocaleCookie = (): string | undefined => {
	if (typeof document === "undefined") {
		return undefined;
	}
	const value = document.cookie
		.split("; ")
		.find((row) => row.startsWith(`${LOCALE_COOKIE_NAME}=`))
		?.split("=")[1];
	return value;
};

const resolveInitialLocale = (): AppLocale => {
	const cookieLocale = getLocaleCookie();
	if (isSupportedLocale(cookieLocale)) {
		return cookieLocale;
	}
	if (typeof navigator !== "undefined") {
		const browserLocale = navigator.language;
		if (browserLocale.startsWith("pt")) {
			return "pt-BR";
		}
		if (browserLocale.startsWith("en")) {
			return "en";
		}
	}
	return DEFAULT_LOCALE;
};

const interpolateMessage = (
	template: string,
	vars?: Record<string, string | number>,
) => {
	if (!vars) return template;
	return Object.entries(vars).reduce((acc, [key, value]) => {
		return acc.replaceAll(`{${key}}`, String(value));
	}, template);
};

type I18nContextState = {
	locale: AppLocale;
	setLocale: (locale: AppLocale) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextState | null>(null);

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
	const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale);

	useEffect(() => {
		document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
	}, [locale]);

	const setLocale = useCallback((nextLocale: AppLocale) => {
		setLocaleState(nextLocale);
	}, []);

	const t = useCallback(
		(key: string, vars?: Record<string, string | number>) => {
			const selectedMessages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
			const fallbackMessages = MESSAGES[DEFAULT_LOCALE];
			const template = selectedMessages[key] ?? fallbackMessages[key] ?? key;
			return interpolateMessage(template, vars);
		},
		[locale],
	);

	const value = useMemo(
		() => ({
			locale,
			setLocale,
			t,
		}),
		[locale, setLocale, t],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useI18n must be used within LocaleProvider");
	}
	return context;
};
