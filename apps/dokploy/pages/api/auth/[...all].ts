import { auth } from "@dokploy/server/index";
import { toNodeHandler } from "better-auth/node";
import type { NextApiRequest, NextApiResponse } from "next";

// Disallow body parsing, we will parse it manually
export const config = { api: { bodyParser: false } };

const handler = toNodeHandler(auth.handler);
const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

const extractCookieNames = (cookieHeader?: string | string[]) => {
	if (!cookieHeader) return [];
	const raw = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
	return raw
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.map((pair) => pair.split("=")[0]?.trim())
		.filter((name): name is string => Boolean(name));
};

const extractSetCookieSummaries = (setCookieHeader?: string | string[]) => {
	if (!setCookieHeader) return [];
	const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
	return values.map((cookie) => {
		const [nameValue, ...attrs] = cookie.split(";").map((item) => item.trim());
		const cookieName = nameValue?.split("=")[0] ?? "unknown";
		const sameSite = attrs.find((a) => a.toLowerCase().startsWith("samesite="));
		const hasSecure = attrs.some((a) => a.toLowerCase() === "secure");
		const hasHttpOnly = attrs.some((a) => a.toLowerCase() === "httponly");
		const domain = attrs.find((a) => a.toLowerCase().startsWith("domain="));
		const path = attrs.find((a) => a.toLowerCase().startsWith("path="));
		return {
			cookieName,
			sameSite: sameSite ?? null,
			secure: hasSecure,
			httpOnly: hasHttpOnly,
			domain: domain ?? null,
			path: path ?? null,
		};
	});
};

export default async function authRoute(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (AUTH_DEBUG) {
		const requestCookieNames = extractCookieNames(req.headers.cookie);
		console.info("[auth-debug] request", {
			method: req.method,
			url: req.url,
			origin: req.headers.origin,
			referer: req.headers.referer,
			forwardedProto: req.headers["x-forwarded-proto"],
			hasCookie: Boolean(req.headers.cookie),
			requestCookieNames,
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
		const setCookieSummaries = extractSetCookieSummaries(
			setCookieHeader as string | string[] | undefined,
		);
		console.info("[auth-debug] response", {
			method: req.method,
			url: req.url,
			statusCode: res.statusCode,
			setCookieCount,
			setCookieSummaries,
		});
	}
}
