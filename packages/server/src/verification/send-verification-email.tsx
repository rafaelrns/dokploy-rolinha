import { renderAsync } from "@react-email/components";
import { resolveServerLocale } from "../i18n/locale";
import VerifyEmailTemplate from "../emails/emails/verify-email";
import { sendEmailNotification } from "../utils/notifications/utils";

export const sendEmail = async ({
	email,
	subject,
	text,
	attachments,
}: {
	email: string;
	subject: string;
	text: string;
	attachments?: { filename: string; content: Buffer }[];
}) => {
	await sendEmailNotification(
		{
			fromAddress: process.env.SMTP_FROM_ADDRESS || "",
			toAddresses: [email],
			smtpServer: process.env.SMTP_SERVER || "",
			smtpPort: Number(process.env.SMTP_PORT),
			username: process.env.SMTP_USERNAME || "",
			password: process.env.SMTP_PASSWORD || "",
		},
		subject,
		text,
		attachments,
	);

	return true;
};

export const sendVerificationEmail = async ({
	userName,
	email,
	verificationUrl,
	locale,
}: {
	userName: string;
	email: string;
	verificationUrl: string;
	locale?: string | null;
}) => {
	const resolvedLocale = resolveServerLocale(locale);
	const html = await renderAsync(
		VerifyEmailTemplate({
			userName: userName || "User",
			verificationUrl,
			locale: resolvedLocale,
		}),
	);
	await sendEmail({
		email,
		subject:
			resolvedLocale === "en" ? "Verify your email" : "Verifique seu e-mail",
		text: html,
	});
};
