import { and, eq, isNotNull } from "drizzle-orm";
import { scheduleJob } from "node-schedule";
import {
	getNextGraceUntil,
	validateLicenseKeyDetailed,
} from "../../services/proprietary/license-provider";
import { db } from "../../db/index";
import { user as userSchema } from "../../db/schema/user";

export const initEnterpriseBackupCronJobs = async () => {
	scheduleJob("enterprise-check", "0 0 */3 * *", async () => {
		const users = await db.query.user.findMany({
			where: and(
				isNotNull(userSchema.licenseKey),
				isNotNull(userSchema.enableEnterpriseFeatures),
				eq(userSchema.isValidEnterpriseLicense, true),
			),
		});
		for (const user of users) {
			if (user.isValidEnterpriseLicense) {
				console.log(
					"Validating license key....",
					user.firstName,
					user.lastName,
				);
				const validation = await validateLicenseKeyDetailed(user.licenseKey || "", {
					graceUntil: user.enterpriseLicenseGraceUntil,
					lastKnownValid: user.isValidEnterpriseLicense,
				});

				await db
					.update(userSchema)
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
					.where(eq(userSchema.id, user.id));
			}
		}
	});
};
