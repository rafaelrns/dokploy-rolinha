import type { NextApiRequest, NextApiResponse } from "next";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import {
	checkRateLimit,
	getClientIp,
	isAllowedOrigin,
} from "@/server/api/utils/http-security";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const trpcHandler = createNextApiHandler({
	router: appRouter,
	createContext: createTRPCContext,
	onError:
		process.env.NODE_ENV === "development"
			? ({ path, error }) => {
					console.error(
						`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
					);
				}
			: undefined,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const isMutationLikeMethod = req.method === "POST";
	if (isMutationLikeMethod && !isAllowedOrigin(req)) {
		console.warn(
			`[http-security] Rejected tRPC request due to invalid origin. host=${req.headers.host || "unknown"} origin=${req.headers.origin || "unknown"}`,
		);
		res.status(403).json({ message: "Invalid origin" });
		return;
	}

	const ip = getClientIp(req);
	const limit = Number.parseInt(process.env.TRPC_RATE_LIMIT_MAX || "300", 10);
	const windowMs = Number.parseInt(
		process.env.TRPC_RATE_LIMIT_WINDOW_MS || "60000",
		10,
	);
	const rate = checkRateLimit({
		key: `trpc:${ip}`,
		limit: Number.isFinite(limit) && limit > 0 ? limit : 300,
		windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
	});

	res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
	res.setHeader("X-RateLimit-Reset", String(rate.resetAt));
	if (!rate.allowed) {
		console.warn(`[http-security] Rejected tRPC request due to rate limit. ip=${ip}`);
		res.status(429).json({ message: "Too many requests" });
		return;
	}

	return trpcHandler(req, res);
}

export const config = {
	api: {
		bodyParser: false,
		sizeLimit: "25mb",
	},
};
