import { auth } from "@dokploy/server/index";
import { toNodeHandler } from "better-auth/node";
import type { NextApiRequest, NextApiResponse } from "next";

// Disallow body parsing, we will parse it manually
export const config = { api: { bodyParser: false } };

const handler = toNodeHandler(auth.handler);
const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

export default async function authRoute(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (AUTH_DEBUG) {
		console.info("[auth-debug] request", {
			method: req.method,
			url: req.url,
			origin: req.headers.origin,
			referer: req.headers.referer,
			forwardedProto: req.headers["x-forwarded-proto"],
			hasCookie: Boolean(req.headers.cookie),
		});
	}

	await handler(req, res);

	if (AUTH_DEBUG) {
		const setCookieHeader = res.getHeader("set-cookie");
		const setCookieCount = Array.isArray(setCookieHeader)
			? setCookieHeader.length
			: setCookieHeader
				? 1
				: 0;
		console.info("[auth-debug] response", {
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			setCookieCount,
		});
	}
}
