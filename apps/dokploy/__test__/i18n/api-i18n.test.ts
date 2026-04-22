import { describe, expect, it } from "vitest";
import { getApiI18nMessage } from "@/server/api/utils/api-i18n";

describe("api i18n messages", () => {
	it("returns portuguese translations", () => {
		expect(getApiI18nMessage("pt-BR", "unauthorized")).toBe(
			"Você precisa entrar para continuar.",
		);
	});

	it("returns english translations", () => {
		expect(getApiI18nMessage("en", "forbidden")).toBe(
			"You do not have permission to perform this action.",
		);
	});
});
