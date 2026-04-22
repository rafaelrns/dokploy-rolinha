import crypto from "node:crypto";
import { getPublicIpWithFallback } from "@dokploy/server/wss/utils";

export const LICENSE_KEY_URL = "https://licenses-api.dokploy.com";
export const LOCAL_LICENSE_KEY_PREFIX = "dkl1";

export type EnterprisePlan = "free" | "pro" | "enterprise-fork";

export type LicenseValidationResult = {
	valid: boolean;
	source: "local" | "remote";
	plan: EnterprisePlan;
	features: string[];
	expiresAt: Date | null;
	graceActive: boolean;
	graceUntil: Date | null;
	error?: string;
};

type LocalLicensePayload = {
	sub?: string;
	plan: EnterprisePlan;
	features: string[];
	exp: number;
	iat: number;
	iss: string;
};

type ValidateOptions = {
	graceUntil?: Date | string | null;
	lastKnownValid?: boolean;
};

const DEFAULT_LOCAL_FEATURES: Record<EnterprisePlan, string[]> = {
	free: [],
	pro: ["custom-roles"],
	"enterprise-fork": [
		"custom-roles",
		"audit-log",
		"sso",
		"white-labeling",
		"advanced-monitoring",
	],
};

const isNetworkError = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false;
	if (error.message === "fetch failed") return true;
	const cause = (error as Error & { cause?: { code?: string } }).cause;
	return (
		cause?.code === "ECONNREFUSED" ||
		cause?.code === "ENOTFOUND" ||
		cause?.code === "ETIMEDOUT"
	);
};

const shouldUseLocalProvider = () => {
	const provider = process.env.ENTERPRISE_LICENSE_PROVIDER || "local";
	return provider === "local";
};

const getGracePeriodMs = () => {
	const hours = Number.parseInt(
		process.env.ENTERPRISE_LICENSE_GRACE_PERIOD_HOURS || "72",
		10,
	);
	return (Number.isFinite(hours) && hours > 0 ? hours : 72) * 60 * 60 * 1000;
};

export const getNextGraceUntil = () => new Date(Date.now() + getGracePeriodMs());

const resolveGraceUntil = (value?: Date | string | null) => {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const base64UrlEncode = (value: string) =>
	Buffer.from(value).toString("base64url");
const base64UrlDecode = (value: string) =>
	Buffer.from(value, "base64url").toString("utf8");

const normalizeEnterprisePlan = (value: string): EnterprisePlan => {
	if (value === "free" || value === "pro" || value === "enterprise-fork") {
		return value;
	}
	return "enterprise-fork";
};

const getLocalLicenseSecret = () => process.env.FORK_LICENSE_SECRET || "";

const signPayload = (payloadEncoded: string, secret: string) =>
	crypto
		.createHmac("sha256", secret)
		.update(payloadEncoded)
		.digest("base64url");

const invalidResult = (
	source: "local" | "remote",
	error: string,
	graceUntil?: Date | null,
): LicenseValidationResult => ({
	valid: false,
	source,
	plan: "free",
	features: [],
	expiresAt: null,
	graceActive: false,
	graceUntil: graceUntil ?? null,
	error,
});

const validateLocalLicenseKeyInternal = (
	licenseKey: string,
): LicenseValidationResult => {
	const secret = getLocalLicenseSecret();
	if (!secret) {
		return invalidResult(
			"local",
			"FORK_LICENSE_SECRET is required when ENTERPRISE_LICENSE_PROVIDER=local",
		);
	}

	const [prefix, payloadEncoded, signature] = licenseKey.split(".");
	if (!prefix || !payloadEncoded || !signature || prefix !== LOCAL_LICENSE_KEY_PREFIX) {
		return invalidResult("local", "Invalid local license key format");
	}

	const expectedSignature = signPayload(payloadEncoded, secret);
	const incomingBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);
	if (
		incomingBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(incomingBuffer, expectedBuffer)
	) {
		return invalidResult("local", "Invalid local license signature");
	}

	try {
		const payload = JSON.parse(
			base64UrlDecode(payloadEncoded),
		) as LocalLicensePayload;
		const expiresAt = new Date(payload.exp * 1000);
		if (!payload.exp || Number.isNaN(expiresAt.getTime())) {
			return invalidResult("local", "Invalid local license expiration");
		}

		if (expiresAt.getTime() <= Date.now()) {
			return invalidResult("local", "License key has expired");
		}

		const plan = normalizeEnterprisePlan(payload.plan);
		const features = Array.isArray(payload.features)
			? payload.features
			: DEFAULT_LOCAL_FEATURES[plan];

		return {
			valid: true,
			source: "local",
			plan,
			features,
			expiresAt,
			graceActive: false,
			graceUntil: null,
		};
	} catch {
		return invalidResult("local", "Invalid local license payload");
	}
};

const validateRemoteLicenseKey = async (
	licenseKey: string,
	options?: ValidateOptions,
): Promise<LicenseValidationResult> => {
	const graceUntil = resolveGraceUntil(options?.graceUntil);

	try {
		const ip = await getPublicIpWithFallback();
		const result = await fetch(`${LICENSE_KEY_URL}/licenses/validate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ licenseKey, ip }),
		});

		if (!result.ok) {
			const errorData = await result.json().catch(() => ({}));
			return invalidResult(
				"remote",
				errorData.message || "Failed to validate license key",
				graceUntil,
			);
		}

		const data = await result.json();
		return {
			valid: !!data.valid,
			source: "remote",
			plan: normalizeEnterprisePlan(data.plan || "enterprise-fork"),
			features: Array.isArray(data.features) ? data.features : [],
			expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
			graceActive: false,
			graceUntil: getNextGraceUntil(),
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Failed to validate license key";

		if (
			isNetworkError(error) &&
			options?.lastKnownValid &&
			graceUntil &&
			graceUntil.getTime() > Date.now()
		) {
			return {
				valid: true,
				source: "remote",
				plan: "enterprise-fork",
				features: [],
				expiresAt: null,
				graceActive: true,
				graceUntil,
				error: "Using grace period due to license server connectivity issues",
			};
		}

		return invalidResult("remote", errorMessage, graceUntil);
	}
};

export const validateLicenseKeyDetailed = async (
	licenseKey: string,
	options?: ValidateOptions,
) => {
	if (!licenseKey?.trim()) {
		return invalidResult("local", "License key is required");
	}

	if (shouldUseLocalProvider()) {
		return validateLocalLicenseKeyInternal(licenseKey);
	}

	return validateRemoteLicenseKey(licenseKey, options);
};

export const validateLicenseKey = async (
	licenseKey: string,
	options?: ValidateOptions,
) => {
	const result = await validateLicenseKeyDetailed(licenseKey, options);
	return result.valid;
};

export const activateLicenseKey = async (
	licenseKey: string,
	options?: ValidateOptions,
) => {
	const result = await validateLicenseKeyDetailed(licenseKey, options);
	if (!result.valid) {
		throw new Error(result.error || "Failed to activate license key");
	}
	return result;
};

export const deactivateLicenseKey = async (licenseKey: string) => {
	if (shouldUseLocalProvider()) {
		return { success: true, source: "local" as const };
	}

	const ip = await getPublicIpWithFallback();
	const result = await fetch(`${LICENSE_KEY_URL}/licenses/deactivate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ licenseKey, ip }),
	});

	if (!result.ok) {
		const errorData = await result.json().catch(() => ({}));
		throw new Error(errorData.message || "Failed to deactivate license key");
	}

	return { success: true, source: "remote" as const };
};

export const generateLocalLicenseKey = ({
	plan = "enterprise-fork",
	features,
	expiresInDays = 365,
	sub = "self-hosted",
}: {
	plan?: EnterprisePlan;
	features?: string[];
	expiresInDays?: number;
	sub?: string;
}) => {
	const secret = getLocalLicenseSecret();
	if (!secret) {
		throw new Error(
			"FORK_LICENSE_SECRET is required to generate local enterprise license keys",
		);
	}

	const iat = Math.floor(Date.now() / 1000);
	const safeDays =
		Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 365;
	const exp = iat + safeDays * 24 * 60 * 60;
	const payload: LocalLicensePayload = {
		sub,
		plan,
		features: features?.length ? features : DEFAULT_LOCAL_FEATURES[plan],
		iat,
		exp,
		iss: process.env.LOCAL_LICENSE_ISSUER || "dokploy-rolinha",
	};
	const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
	const signature = signPayload(payloadEncoded, secret);
	return `${LOCAL_LICENSE_KEY_PREFIX}.${payloadEncoded}.${signature}`;
};

