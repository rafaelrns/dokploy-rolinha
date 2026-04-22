import { Key, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { api } from "@/utils/api";

export function LicenseKeySettings() {
	const { t } = useI18n();
	const utils = api.useUtils();
	const { data, isPending } = api.licenseKey.getEnterpriseSettings.useQuery();
	const { mutateAsync: updateEnterpriseSettings, isPending: isSaving } =
		api.licenseKey.updateEnterpriseSettings.useMutation();
	const { mutateAsync: activateLicenseKey, isPending: isActivating } =
		api.licenseKey.activate.useMutation();
	const { mutateAsync: validateLicenseKey, isPending: isValidating } =
		api.licenseKey.validate.useMutation();
	const { mutateAsync: deactivateLicenseKey, isPending: isDeactivating } =
		api.licenseKey.deactivate.useMutation();
	const { mutateAsync: generateLocalLicenseKey, isPending: isGeneratingLocalKey } =
		api.licenseKey.generateLocal.useMutation();
	const { data: haveValidLicenseKey, isPending: isCheckingLicenseKey } =
		api.licenseKey.haveValidLicenseKey.useQuery();
	const [licenseKey, setLicenseKey] = useState("");
	const [localPlan, setLocalPlan] = useState<
		"free" | "pro" | "enterprise-fork"
	>("enterprise-fork");
	const [localExpiresInDays, setLocalExpiresInDays] = useState("365");
	const [localFeatures, setLocalFeatures] = useState("");

	useEffect(() => {
		if (data?.licenseKey) {
			setLicenseKey(data.licenseKey);
		}
	}, [data?.licenseKey]);

	const enabled = !!data?.enableEnterpriseFeatures;
	const isUsingLocalProvider =
		data?.enterpriseLicenseValidationSource === "local" ||
		(data?.enterpriseLicenseValidationSource === "unknown" &&
			!data?.licenseKey?.trim());

	return (
		<div className="flex flex-col gap-4 rounded-lg border p-4">
			{isCheckingLicenseKey ? (
				<div className="flex items-center gap-2 justify-center min-h-[25vh]">
					<Loader2 className="size-6 text-muted-foreground animate-spin" />
					<span className="text-sm text-muted-foreground">
						{t("license.checking")}
					</span>
				</div>
			) : (
				<>
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2">
								<Key className="size-6 text-muted-foreground" />
								<CardTitle className="text-xl">{t("license.title")}</CardTitle>
							</div>

							{enabled && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">
										{enabled ? t("common.enabled") : t("common.disabled")}
									</span>
									<Switch
										checked={enabled}
										disabled={isPending || isSaving || isDeactivating}
										onCheckedChange={async (next) => {
											try {
												await updateEnterpriseSettings({
													enableEnterpriseFeatures: next,
												});
												await utils.licenseKey.getEnterpriseSettings.invalidate();
												toast.success(t("license.enterpriseUpdated"));
											} catch (error) {
												console.error(error);
												toast.error(t("license.enterpriseUpdateError"));
											}
										}}
									/>
								</div>
							)}
						</div>

						<p className="text-sm text-muted-foreground">
							{t("license.unlockMessage")}{" "}
							<Link
								href="https://dokploy.com/contact"
								target="_blank"
								rel="noreferrer"
								className="underline underline-offset-4"
							>
								{t("license.contactHere")}
							</Link>
							.
						</p>
						<div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
							<div>
								{t("license.providerSource")}{" "}
								<span className="font-medium">
									{data?.enterpriseLicenseValidationSource || "unknown"}
								</span>
							</div>
							{data?.enterpriseLicensePlan && (
								<div>
									{t("license.currentPlan")}{" "}
									<span className="font-medium">{data.enterpriseLicensePlan}</span>
								</div>
							)}
							{data?.enterpriseLicenseExpiresAt && (
								<div>
									{t("license.expiresAt")}{" "}
									<span className="font-medium">
										{new Date(data.enterpriseLicenseExpiresAt).toLocaleString()}
									</span>
								</div>
							)}
							{data?.enterpriseLicenseGraceUntil && (
								<div>
									{t("license.graceUntil")}{" "}
									<span className="font-medium">
										{new Date(data.enterpriseLicenseGraceUntil).toLocaleString()}
									</span>
								</div>
							)}
							{data?.enterpriseLicenseValidationError && (
								<div className="text-amber-600 dark:text-amber-400">
									{t("license.lastValidationError")}{" "}
									{data.enterpriseLicenseValidationError}
								</div>
							)}
						</div>
					</div>
					{enabled ? (
						<>
							{isUsingLocalProvider && (
								<div className="rounded-lg border bg-muted/20 p-3">
									<div className="mb-3 text-sm font-medium">
										{t("license.generateLocalTitle")}
									</div>
									<div className="grid gap-3 md:grid-cols-3">
										<div className="space-y-2">
											<label className="text-xs font-medium" htmlFor="localPlan">
												{t("license.plan")}
											</label>
											<select
												id="localPlan"
												className="h-9 w-full rounded-md border bg-background px-3 text-sm"
												value={localPlan}
												onChange={(e) =>
													setLocalPlan(
														e.target.value as
															| "free"
															| "pro"
															| "enterprise-fork",
													)
												}
											>
												<option value="free">free</option>
												<option value="pro">pro</option>
												<option value="enterprise-fork">enterprise-fork</option>
											</select>
										</div>
										<div className="space-y-2">
											<label
												className="text-xs font-medium"
												htmlFor="localExpiresInDays"
											>
												{t("license.expiresInDays")}
											</label>
											<Input
												id="localExpiresInDays"
												type="number"
												min={1}
												max={3650}
												value={localExpiresInDays}
												onChange={(e) => setLocalExpiresInDays(e.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-xs font-medium" htmlFor="localFeatures">
												{t("license.features")}
											</label>
											<Input
												id="localFeatures"
												placeholder="sso,audit-log,white-labeling"
												value={localFeatures}
												onChange={(e) => setLocalFeatures(e.target.value)}
											/>
										</div>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										<Button
											variant="outline"
											isLoading={isGeneratingLocalKey}
											disabled={isGeneratingLocalKey || isActivating}
											onClick={async () => {
												try {
													const expiresInDays = Number.parseInt(
														localExpiresInDays || "365",
														10,
													);
													const parsedFeatures = localFeatures
														.split(",")
														.map((f) => f.trim())
														.filter(Boolean);

													const response = await generateLocalLicenseKey({
														plan: localPlan,
														expiresInDays: Number.isFinite(expiresInDays)
															? expiresInDays
															: 365,
														features: parsedFeatures.length
															? parsedFeatures
															: undefined,
													});
													setLicenseKey(response.key);
													await navigator.clipboard.writeText(response.key);
													toast.success(
														t("license.generateLocalSuccess"),
													);
												} catch (error) {
													console.error(error);
													toast.error(
														error instanceof Error
															? error.message
															: t("license.generateLocalError"),
													);
												}
											}}
										>
											{t("license.generateLocal")}
										</Button>
									</div>
								</div>
							)}
							<div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
								<div className="space-y-2">
									<label className="text-sm font-medium" htmlFor="licenseKey">
										{t("license.keyLabel")}
									</label>
									<Input
										id="licenseKey"
										placeholder={t("license.keyPlaceholder")}
										value={licenseKey}
										onChange={(e) => setLicenseKey(e.target.value)}
									/>
								</div>
								<div className="md:justify-self-end flex gap-2">
									{haveValidLicenseKey && (
										<DialogAction
											title="Deactivate License Key"
											description="Are you sure you want to deactivate this license key? This will disable enterprise features."
											onClick={async () => {
												try {
													await deactivateLicenseKey();
													await utils.licenseKey.getEnterpriseSettings.invalidate();
													await utils.licenseKey.haveValidLicenseKey.invalidate();
													setLicenseKey("");
													toast.success("License key deactivated");
												} catch (error) {
													console.error(error);
													toast.error(
														error instanceof Error
															? error.message
															: "Failed to deactivate license key",
													);
												}
											}}
											disabled={isDeactivating || !haveValidLicenseKey}
										>
											<Button
												variant="destructive"
												disabled={isDeactivating || !haveValidLicenseKey}
												isLoading={isDeactivating}
											>
												Deactivate
											</Button>
										</DialogAction>
									)}
									{haveValidLicenseKey && (
										<Button
											variant="outline"
											disabled={
												isSaving || isCheckingLicenseKey || isDeactivating
											}
											isLoading={isValidating}
											onClick={async () => {
												try {
													const valid = await validateLicenseKey();
													if (valid) {
														toast.success("License key is valid");
													} else {
														toast.error("License key is invalid");
													}
												} catch (error) {
													console.error(error);
													toast.error(
														error instanceof Error
															? error.message
															: "Failed to validate license key",
													);
												}
											}}
										>
											Validate
										</Button>
									)}
									{!haveValidLicenseKey && (
										<Button
											variant="secondary"
											disabled={
												isSaving ||
												isValidating ||
												isDeactivating ||
												!licenseKey.trim()
											}
											isLoading={isActivating}
											onClick={async () => {
												try {
													await activateLicenseKey({ licenseKey });
													await utils.licenseKey.getEnterpriseSettings.invalidate();
													await utils.licenseKey.haveValidLicenseKey.invalidate();
													toast.success("License key activated");
												} catch (error) {
													console.error(error);
													toast.error(
														error instanceof Error
															? error.message
															: "Failed to activate license key",
													);
												}
											}}
										>
											Activate
										</Button>
									)}
								</div>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center gap-4 justify-center min-h-[30vh] text-center">
							<div className="flex flex-col items-center gap-2 max-w-[400px]">
								<div className="rounded-full bg-muted p-4">
									<ShieldCheck className="size-8 text-muted-foreground" />
								</div>
								<div className="space-y-1">
									<h3 className="text-lg font-semibold">Enterprise Features</h3>
									<p className="text-sm text-muted-foreground">
										Unlock advanced capabilities like SSO, Audit logs,
										whitelabeling and more.
									</p>
								</div>
							</div>

							<Button
								onClick={async () => {
									try {
										await updateEnterpriseSettings({
											enableEnterpriseFeatures: true,
										});
										await utils.licenseKey.getEnterpriseSettings.invalidate();
										toast.success("Enterprise features enabled");
									} catch (error) {
										console.error(error);
										toast.error("Failed to enable enterprise features");
									}
								}}
								isLoading={isSaving}
								disabled={isPending || isDeactivating}
							>
								Enable Enterprise Features
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
