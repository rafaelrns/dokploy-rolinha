import { IS_CLOUD, shouldDeploy } from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";
import { compose } from "@/server/db/schema";
import { checkRateLimit, getClientIp } from "@/server/api/utils/http-security";
import type { DeploymentJob } from "@/server/queues/queue-types";
import { myQueue } from "@/server/queues/queueSetup";
import { deploy } from "@/server/utils/deploy";
import {
	extractBranchName,
	extractCommitMessage,
	extractCommittedPaths,
	extractHash,
	getProviderByHeader,
	parseWebhookBody,
	readRawRequestBody,
	validateGiteaWebhookRequest,
	validateGithubWebhookRequest,
	validateGitlabWebhookRequest,
} from "../[refreshToken]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		res.status(405).json({ message: "Method not allowed" });
		return;
	}

	const { refreshToken } = req.query;
	const ip = getClientIp(req);
	const webhookRate = checkRateLimit({
		key: `deploy-compose-webhook:${refreshToken}:${ip}`,
		limit: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || "60", 10),
		windowMs: Number.parseInt(
			process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || "60000",
			10,
		),
	});
	res.setHeader("X-RateLimit-Remaining", String(webhookRate.remaining));
	res.setHeader("X-RateLimit-Reset", String(webhookRate.resetAt));
	if (!webhookRate.allowed) {
		console.warn(
			`[webhook] Rejected compose deploy webhook due to rate limit. refreshToken=${refreshToken} ip=${ip}`,
		);
		res.status(429).json({ message: "Too many requests" });
		return;
	}

	const rawBody = await readRawRequestBody(req);
	const body = parseWebhookBody(rawBody);
	try {
		if (req.headers["x-github-event"] === "ping") {
			res.status(200).json({ message: "Ping received, webhook is active" });
			return;
		}
		const composeResult = await db.query.compose.findFirst({
			where: eq(compose.refreshToken, refreshToken as string),
			with: {
				environment: {
					with: {
						project: true,
					},
				},
				bitbucket: true,
				github: true,
				gitlab: true,
				gitea: true,
			},
		});

		if (!composeResult) {
			res.status(404).json({ message: "Compose Not Found" });
			return;
		}
		if (!composeResult?.autoDeploy) {
			res.status(400).json({
				message: "Automatic deployments are disabled for this compose",
			});
			return;
		}

		if (req.headers["x-github-event"]) {
			const signatureHeader = req.headers["x-hub-signature-256"];
			const isValidGithubSignature = validateGithubWebhookRequest({
				rawBody,
				signatureHeader: Array.isArray(signatureHeader)
					? signatureHeader[0]
					: signatureHeader,
				githubWebhookSecret: composeResult.github?.githubWebhookSecret,
				resourceId: composeResult.composeId,
			});

			if (!isValidGithubSignature) {
				res.status(401).json({ message: "Invalid webhook signature" });
				return;
			}
		}

		if (req.headers["x-gitlab-event"]) {
			const signatureHeader = req.headers["x-gitlab-token"];
			const isValidGitlabToken = validateGitlabWebhookRequest({
				tokenHeader: Array.isArray(signatureHeader)
					? signatureHeader[0]
					: signatureHeader,
				gitlabWebhookSecret: composeResult.gitlab?.secret,
				resourceId: composeResult.composeId,
			});
			if (!isValidGitlabToken) {
				res.status(401).json({ message: "Invalid webhook signature" });
				return;
			}
		}

		if (req.headers["x-gitea-event"]) {
			const signatureHeader = req.headers["x-gitea-signature"];
			const isValidGiteaSignature = validateGiteaWebhookRequest({
				rawBody,
				signatureHeader: Array.isArray(signatureHeader)
					? signatureHeader[0]
					: signatureHeader,
				giteaWebhookSecret: composeResult.gitea?.clientSecret,
				resourceId: composeResult.composeId,
			});
			if (!isValidGiteaSignature) {
				res.status(401).json({ message: "Invalid webhook signature" });
				return;
			}
		}

		const deploymentTitle = extractCommitMessage(req.headers, body);
		const deploymentHash = extractHash(req.headers, body);
		const sourceType = composeResult.sourceType;

		if (sourceType === "github") {
			const branchName = extractBranchName(req.headers, body);
			const normalizedCommits = body?.commits?.flatMap(
				(commit: any) => commit.modified,
			);

			const shouldDeployPaths = shouldDeploy(
				composeResult.watchPaths,
				normalizedCommits,
			);

			if (!shouldDeployPaths) {
				res.status(301).json({ message: "Watch Paths Not Match" });
				return;
			}

			if (!branchName || branchName !== composeResult.branch) {
				res.status(301).json({ message: "Branch Not Match" });
				return;
			}
		} else if (sourceType === "gitlab") {
			const branchName = extractBranchName(req.headers, body);
			const normalizedCommits = body?.commits?.flatMap(
				(commit: any) => commit.modified,
			);

			const shouldDeployPaths = shouldDeploy(
				composeResult.watchPaths,
				normalizedCommits,
			);

			if (!shouldDeployPaths) {
				res.status(301).json({ message: "Watch Paths Not Match" });
				return;
			}
			if (!branchName || branchName !== composeResult.gitlabBranch) {
				res.status(301).json({ message: "Branch Not Match" });
				return;
			}
		} else if (sourceType === "bitbucket") {
			const branchName = extractBranchName(req.headers, body);
			if (!branchName || branchName !== composeResult.bitbucketBranch) {
				res.status(301).json({ message: "Branch Not Match" });
				return;
			}

			const committedPaths = await extractCommittedPaths(
				body,
				composeResult.bitbucket,
				composeResult.bitbucketRepositorySlug ||
					composeResult.bitbucketRepository ||
					"",
			);

			const shouldDeployPaths = shouldDeploy(
				composeResult.watchPaths,
				committedPaths,
			);

			if (!shouldDeployPaths) {
				res.status(301).json({ message: "Watch Paths Not Match" });
				return;
			}
		} else if (sourceType === "git") {
			const branchName = extractBranchName(req.headers, body);
			if (!branchName || branchName !== composeResult.customGitBranch) {
				res.status(301).json({ message: "Branch Not Match" });
				return;
			}
			const provider = getProviderByHeader(req.headers);
			let normalizedCommits: string[] = [];

			if (provider === "github") {
				normalizedCommits = body?.commits?.flatMap(
					(commit: any) => commit.modified,
				);
			} else if (provider === "gitlab") {
				normalizedCommits = body?.commits?.flatMap(
					(commit: any) => commit.modified,
				);
			} else if (provider === "gitea") {
				normalizedCommits = body?.commits?.flatMap(
					(commit: any) => commit.modified,
				);
			}

			const shouldDeployPaths = shouldDeploy(
				composeResult.watchPaths,
				normalizedCommits,
			);

			if (!shouldDeployPaths) {
				res.status(301).json({ message: "Watch Paths Not Match" });
				return;
			}
		} else if (sourceType === "gitea") {
			const branchName = extractBranchName(req.headers, body);

			const normalizedCommits = body?.commits?.flatMap(
				(commit: any) => commit.modified,
			);

			const shouldDeployPaths = shouldDeploy(
				composeResult.watchPaths,
				normalizedCommits,
			);

			if (!shouldDeployPaths) {
				res.status(301).json({ message: "Watch Paths Not Match" });
				return;
			}

			if (!branchName || branchName !== composeResult.giteaBranch) {
				res.status(301).json({ message: "Branch Not Match" });
				return;
			}
		}

		try {
			const jobData: DeploymentJob = {
				composeId: composeResult.composeId as string,
				titleLog: deploymentTitle,
				type: "deploy",
				applicationType: "compose",
				descriptionLog: `Hash: ${deploymentHash}`,
				server: !!composeResult.serverId,
			};

			if (IS_CLOUD && composeResult.serverId) {
				jobData.serverId = composeResult.serverId;
				deploy(jobData).catch((error) => {
					console.error("Background deployment failed:", error);
				});
			} else {
				await myQueue.add(
					"deployments",
					{ ...jobData },
					{
						removeOnComplete: true,
						removeOnFail: true,
					},
				);
			}
		} catch (error) {
			res.status(400).json({ message: "Error deploying Compose", error });
			return;
		}

		res.status(200).json({ message: "Compose deployed successfully" });
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: "Error deploying Compose", error });
	}
}

export const config = {
	api: {
		bodyParser: false,
		sizeLimit: process.env.DEPLOY_WEBHOOK_BODY_SIZE_LIMIT || "2mb",
	},
};
