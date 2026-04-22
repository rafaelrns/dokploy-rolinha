import { IS_CLOUD, isAdminPresent } from "@dokploy/server";
import { validateRequest } from "@dokploy/server/lib/auth";
import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { type ReactElement, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";
import { SignInWithGithub } from "@/components/proprietary/auth/sign-in-with-github";
import { SignInWithGoogle } from "@/components/proprietary/auth/sign-in-with-google";
import { SignInWithSSO } from "@/components/proprietary/sso/sign-in-with-sso";
import { AlertBlock } from "@/components/shared/alert-block";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { api } from "@/utils/api";
import { useWhitelabelingPublic } from "@/utils/hooks/use-whitelabeling";

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

const _TwoFactorSchema = z.object({
	code: z.string().min(6),
});

type LoginForm = z.infer<typeof LoginSchema>;

const redirectToDashboard = () => {
	// Force a full navigation so SSR pages read the fresh auth cookie.
	window.location.assign("/dashboard/home");
};

interface Props {
	IS_CLOUD: boolean;
}
export default function Home({ IS_CLOUD }: Props) {
	const { t } = useI18n();
	const { config: whitelabeling } = useWhitelabelingPublic();
	const { data: showSignInWithSSO } = api.sso.showSignInWithSSO.useQuery();
	const [isLoginLoading, setIsLoginLoading] = useState(false);
	const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);
	const [isBackupCodeLoading, setIsBackupCodeLoading] = useState(false);
	const [isTwoFactor, setIsTwoFactor] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [isBackupCodeModalOpen, setIsBackupCodeModalOpen] = useState(false);
	const [backupCode, setBackupCode] = useState("");
	const loginForm = useForm<LoginForm>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const waitForSessionAndRedirect = async () => {
		const maxAttempts = 12;
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			try {
				const session = await authClient.getSession();
				if (session?.data?.session) {
					redirectToDashboard();
					return;
				}
			} catch {
				// Ignore transient session-check failures and retry briefly.
			}
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		// Last fallback to avoid trapping the user in loading state.
		redirectToDashboard();
	};

	const onSubmit = async (values: LoginForm) => {
		setIsLoginLoading(true);
		try {
			const { data, error } = await authClient.signIn.email({
				email: values.email,
				password: values.password,
			});

			if (error) {
				const isEmailNotVerified =
					error.code === "EMAIL_NOT_VERIFIED" ||
					error.message?.toLowerCase().includes("email not verified");
				if (isEmailNotVerified) {
					const msg =
						t("login.emailNotVerified");
					toast.info(msg);
					setError(msg);
					return;
				}
				toast.error(error.message);
				setError(error.message || t("login.errorGeneric"));
				return;
			}

			// @ts-ignore
			if (data?.twoFactorRedirect as boolean) {
				setTwoFactorCode("");
				setIsTwoFactor(true);
				toast.info(t("login.enter2faCode"));
				return;
			}

			toast.success(t("login.success"));
			await waitForSessionAndRedirect();
		} catch {
			toast.error(t("login.errorGeneric"));
		} finally {
			setIsLoginLoading(false);
		}
	};
	const onTwoFactorSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (twoFactorCode.length !== 6) {
			toast.error(t("login.enterValid2fa"));
			return;
		}

		setIsTwoFactorLoading(true);
		try {
			const { error } = await authClient.twoFactor.verifyTotp({
				code: twoFactorCode.replace(/\s/g, ""),
			});

			if (error) {
				toast.error(error.message);
				setError(error.message || t("login.error2fa"));
				return;
			}

			toast.success(t("login.success"));
			await waitForSessionAndRedirect();
		} catch {
			toast.error(t("login.error2fa"));
		} finally {
			setIsTwoFactorLoading(false);
		}
	};

	const onBackupCodeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (backupCode.length < 8) {
			toast.error(t("login.enterValidBackupCode"));
			return;
		}

		setIsBackupCodeLoading(true);
		try {
			const { error } = await authClient.twoFactor.verifyBackupCode({
				code: backupCode.trim(),
			});

			if (error) {
				toast.error(error.message);
				setError(error.message || t("login.errorBackup"));
				return;
			}

			toast.success(t("login.success"));
			await waitForSessionAndRedirect();
		} catch {
			toast.error(t("login.errorBackup"));
		} finally {
			setIsBackupCodeLoading(false);
		}
	};

	const loginContent = (
		<>
			{IS_CLOUD && <SignInWithGithub />}
			{IS_CLOUD && <SignInWithGoogle />}
			<Form {...loginForm}>
				<form
					onSubmit={loginForm.handleSubmit(onSubmit)}
					className="space-y-4"
					id="login-form"
				>
					<FormField
						control={loginForm.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("login.emailLabel")}</FormLabel>
								<FormControl>
									<Input placeholder={t("login.emailPlaceholder")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={loginForm.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("login.passwordLabel")}</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder={t("login.passwordPlaceholder")}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button className="w-full" type="submit" isLoading={isLoginLoading}>
						{t("login.loginButton")}
					</Button>
				</form>
			</Form>
		</>
	);

	return (
		<>
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-2xl font-semibold tracking-tight">
					<div className="flex flex-row items-center justify-center gap-2">
						<Logo
							className="size-12"
							logoUrl={
								whitelabeling?.loginLogoUrl ||
								whitelabeling?.logoUrl ||
								undefined
							}
						/>
						{t("login.signInTitle")}
					</div>
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("login.signInSubtitle")}
				</p>
			</div>
			{error && (
				<AlertBlock type="error" className="my-2">
					<span>{error}</span>
				</AlertBlock>
			)}
			<CardContent className="p-0">
				{!isTwoFactor ? (
					<>
						{showSignInWithSSO ? (
							<SignInWithSSO>{loginContent}</SignInWithSSO>
						) : (
							loginContent
						)}
					</>
				) : (
					<>
						<form
							onSubmit={onTwoFactorSubmit}
							className="space-y-4"
							id="two-factor-form"
							autoComplete="on"
						>
							<div className="flex flex-col gap-2">
								<Label htmlFor="totp-code">{t("login.twoFactorCodeLabel")}</Label>
								<InputOTP
									id="totp-code"
									name="totp"
									value={twoFactorCode}
									onChange={setTwoFactorCode}
									maxLength={6}
									placeholder="••••••"
									pattern={REGEXP_ONLY_DIGITS}
									autoFocus
								/>
								<CardDescription>
									{t("login.enter2faSubtitle")}
								</CardDescription>
								<button
									type="button"
									onClick={() => setIsBackupCodeModalOpen(true)}
									className="text-sm text-muted-foreground hover:underline self-start mt-2"
								>
									{t("login.lostAuthenticator")}
								</button>
							</div>

							<div className="flex gap-4">
								<Button
									variant="outline"
									className="w-full"
									type="button"
									onClick={() => {
										setIsTwoFactor(false);
										setTwoFactorCode("");
									}}
								>
									{t("common.cancel")}
								</Button>
								<Button
									className="w-full"
									type="submit"
									isLoading={isTwoFactorLoading}
								>
									{t("login.verifyButton")}
								</Button>
							</div>
						</form>

						<Dialog
							open={isBackupCodeModalOpen}
							onOpenChange={setIsBackupCodeModalOpen}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>{t("login.enterBackupCodeTitle")}</DialogTitle>
									<DialogDescription>
										{t("login.enterBackupCodeSubtitle")}
									</DialogDescription>
								</DialogHeader>

								<form onSubmit={onBackupCodeSubmit} className="space-y-4">
									<div className="flex flex-col gap-2">
										<Label>{t("login.backupCodeLabel")}</Label>
										<Input
											value={backupCode}
											onChange={(e) => setBackupCode(e.target.value)}
											placeholder={t("login.backupCodePlaceholder")}
											className="font-mono"
										/>
										<CardDescription>
											{t("login.backupCodeHelp")}
										</CardDescription>
									</div>

									<div className="flex gap-4">
										<Button
											variant="outline"
											className="w-full"
											type="button"
											onClick={() => {
												setIsBackupCodeModalOpen(false);
												setBackupCode("");
											}}
										>
											{t("common.cancel")}
										</Button>
										<Button
											className="w-full"
											type="submit"
											isLoading={isBackupCodeLoading}
										>
											{t("login.verifyButton")}
										</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
					</>
				)}

				<div className="flex flex-row justify-between flex-wrap">
					<div className="mt-4 text-center text-sm flex flex-row justify-center gap-2">
						{IS_CLOUD && (
							<Link
								className="hover:underline text-muted-foreground"
								href="/register"
							>
								{t("login.createAccount")}
							</Link>
						)}
					</div>

					<div className="mt-4 text-sm flex flex-row justify-center gap-2">
						{IS_CLOUD ? (
							<Link
								className="hover:underline text-muted-foreground"
								href="/send-reset-password"
							>
								{t("login.lostPassword")}
							</Link>
						) : (
							<Link
								className="hover:underline text-muted-foreground"
								href="https://docs.dokploy.com/docs/core/reset-password"
								target="_blank"
							>
								{t("login.lostPassword")}
							</Link>
						)}
					</div>
				</div>
				<div className="p-2" />
			</CardContent>
		</>
	);
}

Home.getLayout = (page: ReactElement) => {
	return <OnboardingLayout>{page}</OnboardingLayout>;
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
	if (IS_CLOUD) {
		try {
			const { user } = await validateRequest(context.req);
			if (user) {
				return {
					redirect: {
						permanent: true,
						destination: "/dashboard/home",
					},
				};
			}
		} catch {}

		return {
			props: {
				IS_CLOUD: IS_CLOUD,
			},
		};
	}
	const hasAdmin = await isAdminPresent();

	if (!hasAdmin) {
		return {
			redirect: {
				permanent: true,
				destination: "/register",
			},
		};
	}

	const { user } = await validateRequest(context.req);

	if (user) {
		return {
			redirect: {
				permanent: true,
				destination: "/dashboard/home",
			},
		};
	}

	return {
		props: {
			hasAdmin,
		},
	};
}
