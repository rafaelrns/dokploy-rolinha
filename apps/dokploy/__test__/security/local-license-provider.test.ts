import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

describe("local enterprise license provider", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env = { ...ORIGINAL_ENV };
		process.env.ENTERPRISE_LICENSE_PROVIDER = "local";
		process.env.FORK_LICENSE_SECRET = "test-fork-license-secret";
	});

	afterEach(() => {
		process.env = ORIGINAL_ENV;
		global.fetch = ORIGINAL_FETCH;
	});

	it("generates and validates a local enterprise key", async () => {
		const { generateLocalLicenseKey, validateLicenseKeyDetailed } = await import(
			"@dokploy/server"
		);

		const licenseKey = generateLocalLicenseKey({
			plan: "enterprise-fork",
			features: ["sso", "audit-log"],
			expiresInDays: 30,
		});
		const validation = await validateLicenseKeyDetailed(licenseKey);

		expect(validation.valid).toBe(true);
		expect(validation.source).toBe("local");
		expect(validation.plan).toBe("enterprise-fork");
		expect(validation.features).toEqual(["sso", "audit-log"]);
		expect(validation.expiresAt).toBeInstanceOf(Date);
	}, 15000);

	it("rejects local keys with invalid signature", async () => {
		const { generateLocalLicenseKey, validateLicenseKeyDetailed } = await import(
			"@dokploy/server"
		);

		const licenseKey = generateLocalLicenseKey({
			plan: "pro",
			expiresInDays: 30,
		});
		const [prefix, payload] = licenseKey.split(".");
		const tampered = `${prefix}.${payload}.invalid-signature`;
		const validation = await validateLicenseKeyDetailed(tampered);

		expect(validation.valid).toBe(false);
		expect(validation.error).toContain("signature");
	});

	it("rejects expired local keys", async () => {
		const { LOCAL_LICENSE_KEY_PREFIX, validateLicenseKeyDetailed } = await import(
			"@dokploy/server"
		);

		const payload = {
			sub: "test",
			plan: "enterprise-fork",
			features: ["sso"],
			iat: Math.floor(Date.now() / 1000) - 7200,
			exp: Math.floor(Date.now() / 1000) - 3600,
			iss: "dokploy-rolinha",
		};
		const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
		const signature = crypto
			.createHmac("sha256", process.env.FORK_LICENSE_SECRET || "")
			.update(payloadEncoded)
			.digest("base64url");
		const expiredKey = `${LOCAL_LICENSE_KEY_PREFIX}.${payloadEncoded}.${signature}`;

		const validation = await validateLicenseKeyDetailed(expiredKey);
		expect(validation.valid).toBe(false);
		expect(validation.error).toContain("expired");
	});

	it("uses grace period on remote provider network outages", async () => {
		process.env.ENTERPRISE_LICENSE_PROVIDER = "remote";
		const networkError = Object.assign(new Error("fetch failed"), {
			cause: { code: "ETIMEDOUT" },
		});
		global.fetch = vi.fn().mockRejectedValue(networkError) as any;

		const { validateLicenseKeyDetailed } = await import("@dokploy/server");
		const graceUntil = new Date(Date.now() + 60 * 60 * 1000);
		const validation = await validateLicenseKeyDetailed("remote-key", {
			graceUntil,
			lastKnownValid: true,
		});

		expect(validation.valid).toBe(true);
		expect(validation.source).toBe("remote");
		expect(validation.graceActive).toBe(true);
		expect(validation.error).toContain("grace period");
	});
});
