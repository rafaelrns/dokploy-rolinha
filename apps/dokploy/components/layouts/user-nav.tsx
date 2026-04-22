import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { SUPPORTED_LOCALES, useI18n } from "@/lib/i18n";
import { getFallbackAvatarInitials } from "@/lib/utils";
import { api } from "@/utils/api";
import { ModeToggle } from "../ui/modeToggle";
import { SidebarMenuButton } from "../ui/sidebar";

const _AUTO_CHECK_UPDATES_INTERVAL_MINUTES = 7;

export const UserNav = () => {
	const router = useRouter();
	const { locale, setLocale, t } = useI18n();
	const { data } = api.user.get.useQuery();
	const { data: localeData } = api.user.getLocale.useQuery();
	const { mutateAsync: persistLocale } = api.user.setLocale.useMutation();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	const applyLocale = async (nextLocale: (typeof SUPPORTED_LOCALES)[number]) => {
		setLocale(nextLocale);
		try {
			await persistLocale({ locale: nextLocale });
		} catch {
			// Keep UI responsive even when locale persistence fails.
		}
	};

	useEffect(() => {
		if (localeData?.locale && localeData.locale !== locale) {
			setLocale(localeData.locale);
		}
	}, [localeData?.locale, locale, setLocale]);

	// const { mutateAsync } = api.auth.logout.useMutation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage
							className="object-cover"
							src={data?.user?.image || ""}
							alt={data?.user?.image || ""}
						/>
						<AvatarFallback className="rounded-lg">
							{getFallbackAvatarInitials(
								`${data?.user?.firstName} ${data?.user?.lastName}`.trim(),
							)}
						</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{t("common.account")}</span>
						<span className="truncate text-xs">{data?.user?.email}</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
				side="bottom"
				align="end"
				sideOffset={4}
			>
				<div className="flex items-center justify-between px-2 py-1.5">
					<DropdownMenuLabel className="flex flex-col">
						{t("userNav.myAccount")}
						<span className="text-xs font-normal text-muted-foreground">
							{data?.user?.email}
						</span>
					</DropdownMenuLabel>
					<ModeToggle />
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-xs text-muted-foreground">
					{t("common.language")}
				</DropdownMenuLabel>
				{SUPPORTED_LOCALES.map((value) => (
					<DropdownMenuItem
						key={value}
						className="cursor-pointer"
						onClick={() => applyLocale(value)}
					>
						{t(`locale.${value}`)} {locale === value ? "✓" : ""}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/settings/profile");
						}}
					>
						{t("common.profile")}
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/home");
						}}
					>
						{t("common.projects")}
					</DropdownMenuItem>
					{!isCloud ? (
						<>
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => {
									router.push("/dashboard/monitoring");
								}}
							>
								{t("common.monitoring")}
							</DropdownMenuItem>
							{permissions?.traefikFiles.read && (
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										router.push("/dashboard/traefik");
									}}
								>
									{t("common.traefik")}
								</DropdownMenuItem>
							)}
							{permissions?.docker.read && (
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										router.push("/dashboard/docker", undefined, {
											shallow: true,
										});
									}}
								>
									{t("common.docker")}
								</DropdownMenuItem>
							)}
						</>
					) : (
						permissions?.organization.update && (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => {
									router.push("/dashboard/settings/servers");
								}}
							>
								{t("common.servers")}
							</DropdownMenuItem>
						)
					)}
				</DropdownMenuGroup>
				{isCloud && data?.role === "owner" && (
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/settings/billing");
						}}
					>
						{t("common.billing")}
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer"
					onClick={async () => {
						await authClient.signOut().then(() => {
							router.push("/");
						});
						// await mutateAsync().then(() => {
						// 	router.push("/");
						// });
					}}
				>
					{t("common.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
