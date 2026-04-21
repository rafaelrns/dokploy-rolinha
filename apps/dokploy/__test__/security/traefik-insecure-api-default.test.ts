import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("Traefik insecure API hardening", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env = { ...ORIGINAL_ENV };
		delete process.env.DOKPLOY_ENABLE_INSECURE_TRAEFIK_API;
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it("disables insecure dashboard API by default", async () => {
		const { getDefaultTraefikConfig, getDefaultServerTraefikConfig } =
			await import("@dokploy/server/setup/traefik-setup");

		expect(getDefaultTraefikConfig()).toContain("insecure: false");
		expect(getDefaultServerTraefikConfig()).toContain("insecure: false");
	});

	it("allows explicit opt-in for legacy insecure dashboard API", async () => {
		process.env.DOKPLOY_ENABLE_INSECURE_TRAEFIK_API = "true";
		const { getDefaultTraefikConfig } = await import(
			"@dokploy/server/setup/traefik-setup"
		);

		expect(getDefaultTraefikConfig()).toContain("insecure: true");
	});
});
