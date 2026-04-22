import { describe, expect, it } from "vitest";
import { resolveApiLocale } from "@/server/api/utils/locale";

describe("resolveApiLocale", () => {
	it("prefers user locale when available", () => {
		const locale = resolveApiLocale(
			{
				headers: {},
			} as any,
			"en",
		);
		expect(locale).toBe("en");
	});

	it("uses locale header when user locale is missing", () => {
		const locale = resolveApiLocale({
			headers: {
				"x-dokploy-locale": "en",
			},
		} as any);
		expect(locale).toBe("en");
	});

	it("uses cookie locale when header is absent", () => {
		const locale = resolveApiLocale({
			headers: {
				cookie: "session=abc; dokploy_locale=pt-BR",
			},
		} as any);
		expect(locale).toBe("pt-BR");
	});

	it("falls back to pt-BR", () => {
		const locale = resolveApiLocale({
			headers: {},
		} as any);
		expect(locale).toBe("pt-BR");
	});
});
