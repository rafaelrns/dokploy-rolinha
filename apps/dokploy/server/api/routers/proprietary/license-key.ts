import { db } from "@dokploy/server/db";
import { user } from "@dokploy/server/db/schema";
import {
	activateLicenseKey,
	deactivateLicenseKey,
	generateLocalLicenseKey,
	getNextGraceUntil,
	hasValidLicense,
	validateLicenseKeyDetailed,
} from "@dokploy/server/index";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "@/server/api/trpc";
import { getApiI18nMessage } from "@/server/api/utils/api-i18n";

const usingLocalLicenseProvider =
	(process.env.ENTERPRISE_LICENSE_PROVIDER || "local") === "local";

export const licenseKeyRouter = createTRPCRouter({
	activate: adminProcedure
		.input(z.object({ licenseKey: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			try {
				const currentUserId = ctx.user.id;
				const currentUser = await db.query.user.findFirst({
					where: eq(user.id, currentUserId),
				});
				if (!currentUser) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: getApiI18nMessage(ctx.locale ?? "pt-BR", "userNotFound"),
					});
				}

				if (ctx.user.role !== "owner") {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You are not authorized to activate a license key",
					});
				}

				if (!currentUser.enableEnterpriseFeatures) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Please activate enterprise features to activate license key",
					});
				}

				const activation = await activateLicenseKey(input.licenseKey, {
					graceUntil: currentUser.enterpriseLicenseGraceUntil,
					lastKnownValid: currentUser.isValidEnterpriseLicense,
				});
				await db
					.update(user)
					.set({
						licenseKey: input.licenseKey,
						isValidEnterpriseLicense: true,
						enterpriseLicensePlan: activation.plan,
						enterpriseLicenseFeatures: activation.features,
						enterpriseLicenseExpiresAt: activation.expiresAt,
						enterpriseLicenseLastValidatedAt: new Date(),
						enterpriseLicenseValidationSource: activation.source,
						enterpriseLicenseValidationError: null,
						enterpriseLicenseGraceUntil: getNextGraceUntil(),
					})
					.where(eq(user.id, currentUserId));
				return { success: true };
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: getApiI18nMessage(ctx.locale ?? "pt-BR", "unexpected"),
					cause: error,
				});
			}
		}),
	validate: adminProcedure.mutation(async ({ ctx }) => {
		try {
			const currentUserId = ctx.user.id;
			const currentUser = await db.query.user.findFirst({
				where: eq(user.id, currentUserId),
			});
			if (!currentUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: getApiI18nMessage(ctx.locale ?? "pt-BR", "userNotFound"),
				});
			}

			if (ctx.user.role !== "owner") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to validate a license key",
				});
			}

			if (!currentUser.licenseKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No license key found",
				});
			}

			if (!currentUser.enableEnterpriseFeatures) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Please activate enterprise features to validate license key",
				});
			}
			const validation = await validateLicenseKeyDetailed(currentUser.licenseKey, {
				graceUntil: currentUser.enterpriseLicenseGraceUntil,
				lastKnownValid: currentUser.isValidEnterpriseLicense,
			});

			await db
				.update(user)
				.set({
					isValidEnterpriseLicense: validation.valid,
					enterpriseLicensePlan: validation.plan,
					enterpriseLicenseFeatures: validation.features,
					enterpriseLicenseExpiresAt: validation.expiresAt,
					enterpriseLicenseLastValidatedAt: new Date(),
					enterpriseLicenseValidationSource: validation.source,
					enterpriseLicenseValidationError: validation.error || null,
					enterpriseLicenseGraceUntil:
						validation.valid && !validation.graceActive
							? getNextGraceUntil()
							: validation.graceUntil,
				})
				.where(eq(user.id, currentUserId));
			return validation.valid;
		} catch (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					error instanceof Error
						? error.message
							: getApiI18nMessage(ctx.locale ?? "pt-BR", "unexpected"),
			});
		}
	}),
	deactivate: adminProcedure.mutation(async ({ ctx }) => {
		try {
			const currentUserId = ctx.user.id;
			const currentUser = await db.query.user.findFirst({
				where: eq(user.id, currentUserId),
			});
			if (!currentUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: getApiI18nMessage(ctx.locale ?? "pt-BR", "userNotFound"),
				});
			}
			if (!currentUser.licenseKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No license key found",
				});
			}

			if (ctx.user.role !== "owner") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to deactivate a license key",
				});
			}

			try {
				await deactivateLicenseKey(currentUser.licenseKey);
			} catch (err) {
				console.error("Failed to deactivate license key remotely:", err);
			}

			await db
				.update(user)
				.set({
					licenseKey: null,
					isValidEnterpriseLicense: false,
					enterpriseLicensePlan: "free",
					enterpriseLicenseFeatures: [],
					enterpriseLicenseExpiresAt: null,
					enterpriseLicenseLastValidatedAt: new Date(),
					enterpriseLicenseValidationSource: null,
					enterpriseLicenseValidationError: null,
					enterpriseLicenseGraceUntil: null,
				})
				.where(eq(user.id, currentUserId));
			return { success: true };
		} catch (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					error instanceof Error
						? error.message
							: getApiI18nMessage(ctx.locale ?? "pt-BR", "unexpected"),
			});
		}
	}),
	getEnterpriseSettings: adminProcedure.query(async ({ ctx }) => {
		const currentUserId = ctx.user.id;
		const currentUser = await db.query.user.findFirst({
			where: eq(user.id, currentUserId),
		});

		if (!currentUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: getApiI18nMessage(ctx.locale ?? "pt-BR", "userNotFound"),
			});
		}

		if (ctx.user.role !== "owner") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not authorized to get enterprise settings",
			});
		}

		return {
			enableEnterpriseFeatures: !!currentUser.enableEnterpriseFeatures,
			licenseKey: currentUser.licenseKey ?? "",
			isValidEnterpriseLicense: !!currentUser.isValidEnterpriseLicense,
			enterpriseLicensePlan: currentUser.enterpriseLicensePlan || "free",
			enterpriseLicenseFeatures: currentUser.enterpriseLicenseFeatures || [],
			enterpriseLicenseExpiresAt: currentUser.enterpriseLicenseExpiresAt,
			enterpriseLicenseValidationSource:
				currentUser.enterpriseLicenseValidationSource || "unknown",
			enterpriseLicenseValidationError:
				currentUser.enterpriseLicenseValidationError || null,
			enterpriseLicenseGraceUntil: currentUser.enterpriseLicenseGraceUntil,
		};
	}),
	generateLocal: adminProcedure
		.input(
			z.object({
				plan: z
					.enum(["free", "pro", "enterprise-fork"])
					.default("enterprise-fork"),
				expiresInDays: z.number().int().positive().max(3650).default(365),
				features: z.array(z.string().min(1)).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (ctx.user.role !== "owner") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only owners can generate local license keys",
				});
			}

			if (!usingLocalLicenseProvider) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Local license generation is available only when ENTERPRISE_LICENSE_PROVIDER=local",
				});
			}

			try {
				const key = generateLocalLicenseKey({
					plan: input.plan,
					expiresInDays: input.expiresInDays,
					features: input.features,
					sub: ctx.user.id,
				});
				return { key };
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: getApiI18nMessage(ctx.locale ?? "pt-BR", "unexpected"),
				});
			}
		}),
	haveValidLicenseKey: protectedProcedure.query(async ({ ctx }) => {
		return await hasValidLicense(ctx.session.activeOrganizationId);
	}),
	updateEnterpriseSettings: adminProcedure
		.input(
			z.object({
				enableEnterpriseFeatures: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				const currentUserId = ctx.user.id;

				if (input.enableEnterpriseFeatures === undefined) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "enableEnterpriseFeatures must be provided",
					});
				}

				if (ctx.user.role !== "owner") {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You are not authorized to update enterprise settings",
					});
				}

				await db
					.update(user)
					.set({
						enableEnterpriseFeatures: input.enableEnterpriseFeatures,
					})
					.where(eq(user.id, currentUserId));

				return true;
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error
							? error.message
							: getApiI18nMessage(ctx.locale ?? "pt-BR", "unexpected"),
				});
			}
		}),
});
