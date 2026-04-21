import type { NextApiRequest } from "next";

type Bucket = {
	count: number;
	resetAt: number;
};

const rateLimitBuckets = new Map<string, Bucket>();

export const getClientIp = (req: NextApiRequest) => {
	const forwardedFor = req.headers["x-forwarded-for"];
	const realIp = req.headers["x-real-ip"];

	if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
		return forwardedFor.split(",")[0]?.trim() || "unknown";
	}

	if (typeof realIp === "string" && realIp.length > 0) {
		return realIp;
	}

	return req.socket.remoteAddress || "unknown";
};

export const checkRateLimit = ({
	key,
	limit,
	windowMs,
}: {
	key: string;
	limit: number;
	windowMs: number;
}) => {
	const now = Date.now();
	const current = rateLimitBuckets.get(key);

	if (!current || now > current.resetAt) {
		const next: Bucket = { count: 1, resetAt: now + windowMs };
		rateLimitBuckets.set(key, next);
		return {
			allowed: true,
			remaining: limit - 1,
			resetAt: next.resetAt,
		};
	}

	if (current.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: current.resetAt,
		};
	}

	current.count += 1;
	rateLimitBuckets.set(key, current);

	return {
		allowed: true,
		remaining: Math.max(limit - current.count, 0),
		resetAt: current.resetAt,
	};
};

const normalizeHost = (value?: string) => value?.toLowerCase().trim();

export const isAllowedOrigin = (req: NextApiRequest) => {
	const origin = req.headers.origin;
	if (!origin) return true;

	let originHost = "";
	try {
		originHost = normalizeHost(new URL(origin).host) || "";
	} catch {
		return false;
	}

	const host = normalizeHost(
		(typeof req.headers["x-forwarded-host"] === "string"
			? req.headers["x-forwarded-host"]
			: undefined) || req.headers.host,
	);

	const extraAllowedOrigins = (
		process.env.DOKPLOY_ADDITIONAL_TRUSTED_ORIGINS || ""
	)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => {
			try {
				return normalizeHost(new URL(item).host);
			} catch {
				return "";
			}
		})
		.filter(Boolean) as string[];

	if (!host) return false;
	if (originHost === host) return true;
	if (extraAllowedOrigins.includes(originHost)) return true;

	return false;
};
