import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("BETTER_AUTH_SECRET hardening", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env = { ...ORIGINAL_ENV };
		delete process.env.BETTER_AUTH_SECRET;
		delete process.env.ALLOW_INSECURE_DEFAULT_AUTH_SECRET;
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it("fails fast in production when BETTER_AUTH_SECRET is missing", async () => {
		process.env = { ...process.env, NODE_ENV: "production" };

		await expect(import("@dokploy/server/constants")).rejects.toThrow(
			"BETTER_AUTH_SECRET is required in production",
		);
	});

	it("uses explicit BETTER_AUTH_SECRET in production", async () => {
		process.env = { ...process.env, NODE_ENV: "production" };
		process.env.BETTER_AUTH_SECRET = "super-secret";

		const { BETTER_AUTH_SECRET } = await import("@dokploy/server/constants");

		expect(BETTER_AUTH_SECRET).toBe("super-secret");
	});

	it("allows temporary compatibility flag in production", async () => {
		process.env = { ...process.env, NODE_ENV: "production" };
		process.env.ALLOW_INSECURE_DEFAULT_AUTH_SECRET = "true";

		const { BETTER_AUTH_SECRET } = await import("@dokploy/server/constants");

		expect(BETTER_AUTH_SECRET).toBe("better-auth-secret-123456789");
	});
});
