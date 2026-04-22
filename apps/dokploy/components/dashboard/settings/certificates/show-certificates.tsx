import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	Link,
	Loader2,
	Server,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { api } from "@/utils/api";
import { HandleCertificate } from "./handle-certificate";
import {
	extractLeafCommonName,
	getCertificateChainExpirationDetails,
	getCertificateChainInfo,
	getExpirationStatus,
} from "./utils";

export const ShowCertificates = () => {
	const { locale } = useI18n();
	const isPt = locale === "pt-BR";
	const { mutateAsync, isPending: isRemoving } =
		api.certificates.remove.useMutation();
	const { data, isPending, refetch } = api.certificates.all.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar  p-2.5 rounded-xl  max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<CardHeader className="">
						<CardTitle className="text-xl flex flex-row gap-2">
							<ShieldCheck className="size-6 text-muted-foreground self-center" />
							{isPt ? "Certificados" : "Certificates"}
						</CardTitle>
						<CardDescription>
							{isPt
								? "Crie certificados no diretório do Traefik"
								: "Create certificates in the Traefik directory"}
						</CardDescription>

						<AlertBlock type="warning">
							{isPt
								? "Os certificados são criados no diretório do Traefik. O Traefik usa esses certificados para proteger suas aplicações. Certificados inválidos podem quebrar sua instância do Traefik e impedir acesso às aplicações."
								: "Certificates are created in the Traefik directory. Traefik uses these certificates to secure your applications. Using invalid certificates can break your Traefik instance, preventing access to your applications."}
						</AlertBlock>
					</CardHeader>
					<CardContent className="space-y-2 py-8 border-t">
						{isPending ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
								<span>{isPt ? "Carregando..." : "Loading..."}</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : (
							<>
								{data?.length === 0 ? (
									<div className="flex flex-col items-center gap-3  min-h-[25vh] justify-center">
										<ShieldCheck className="size-8 self-center text-muted-foreground" />
										<span className="text-base text-muted-foreground text-center">
											{isPt
												? "Você não possui certificados criados"
												: "You don't have any certificates created"}
										</span>
										{permissions?.certificate.create && <HandleCertificate />}
									</div>
								) : (
									<div className="flex flex-col gap-4  min-h-[25vh]">
										<div className="flex flex-col gap-4 rounded-lg ">
											{data?.map((certificate, index) => {
												const expiration = getExpirationStatus(
													certificate.certificateData,
												);
												const chainInfo = getCertificateChainInfo(
													certificate.certificateData,
												);
												const commonName = extractLeafCommonName(
													certificate.certificateData,
												);
												const chainDetails = chainInfo.isChain
													? getCertificateChainExpirationDetails(
															certificate.certificateData,
														)
													: null;
												const isExpanded = expandedChains.has(
													certificate.certificateId,
												);

												const toggleChain = () => {
													setExpandedChains((prev) => {
														const next = new Set(prev);
														if (next.has(certificate.certificateId)) {
															next.delete(certificate.certificateId);
														} else {
															next.add(certificate.certificateId);
														}
														return next;
													});
												};

												return (
													<div
														key={certificate.certificateId}
														className="flex items-center justify-between bg-sidebar p-1 w-full rounded-lg"
													>
														<div className="flex items-center justify-between p-3.5 rounded-lg bg-background border  w-full">
															<div className="flex items-center justify-between">
																<div className="flex gap-2 flex-col">
																	<span className="text-sm font-medium">
																		{index + 1}. {certificate.name}
																	</span>
																	{commonName && (
																		<span className="text-xs text-muted-foreground">
																			CN: {commonName}
																		</span>
																	)}
																	<span className="text-xs text-muted-foreground flex items-center gap-1">
																		<Server className="size-3" />
																		{certificate.server
																			? `${certificate.server.name} (${certificate.server.ipAddress})`
																			: isPt
																				? "Dokploy (Local)"
																				: "Dokploy (Local)"}
																	</span>
																	{chainInfo.isChain && (
																		<div className="flex flex-col gap-1.5 mt-1">
																			<button
																				type="button"
																				onClick={toggleChain}
																				className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 w-fit hover:bg-muted transition-colors"
																			>
																				{isExpanded ? (
																					<ChevronDown className="size-3 text-muted-foreground" />
																				) : (
																					<ChevronRight className="size-3 text-muted-foreground" />
																				)}
																				<Link className="size-3 text-muted-foreground" />
																				<span className="text-xs text-muted-foreground">
																					{isPt
																						? `Cadeia (${chainInfo.count} certificados)`
																						: `Chain (${chainInfo.count} certificates)`}
																				</span>
																			</button>
																			{isExpanded && (
																				<div className="flex flex-col gap-3 pl-2 border-l-2 border-muted">
																					{chainDetails?.map((cert) => (
																						<div
																							key={cert.index}
																							className="flex flex-col gap-1 p-2 rounded-md bg-muted/30"
																						>
																							<span className="text-xs font-medium text-muted-foreground">
																								{cert.label}
																							</span>
																							{cert.commonName && (
																								<span className="text-xs text-muted-foreground/80">
																									CN: {cert.commonName}
																								</span>
																							)}
																							<span
																								className={`text-xs ${cert.className}`}
																							>
																								{cert.message}
																							</span>
																						</div>
																					))}
																				</div>
																			)}
																		</div>
																	)}
																	<div
																		className={`text-xs flex items-center gap-1.5 ${expiration.className}`}
																	>
																		{expiration.status !== "valid" && (
																			<AlertCircle className="size-3" />
																		)}
																		{expiration.message}
																		{certificate.autoRenew &&
																			expiration.status !== "valid" && (
																				<span className="text-xs text-emerald-500 ml-1">
																					{isPt
																						? "(Renovação automática ativada)"
																						: "(Auto-renewal enabled)"}
																				</span>
																			)}
																	</div>
																</div>
															</div>

															<div className="flex flex-row gap-1">
																{permissions?.certificate.update && (
																	<HandleCertificate
																		certificateId={certificate.certificateId}
																	/>
																)}

																{permissions?.certificate.delete && (
																	<DialogAction
																		title={
																			isPt
																				? "Excluir certificado"
																				: "Delete Certificate"
																		}
																		description={
																			isPt
																				? "Tem certeza que deseja excluir este certificado?"
																				: "Are you sure you want to delete this certificate?"
																		}
																		type="destructive"
																		onClick={async () => {
																			await mutateAsync({
																				certificateId:
																					certificate.certificateId,
																			})
																				.then(() => {
																					toast.success(
																						isPt
																							? "Certificado excluído com sucesso"
																							: "Certificate deleted successfully",
																					);
																					refetch();
																				})
																				.catch(() => {
																					toast.error(
																						isPt
																							? "Erro ao excluir certificado"
																							: "Error deleting certificate",
																					);
																				});
																		}}
																	>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="group hover:bg-red-500/10"
																			isLoading={isRemoving}
																		>
																			<Trash2 className="size-4 text-primary group-hover:text-red-500" />
																		</Button>
																	</DialogAction>
																)}
															</div>
														</div>
													</div>
												);
											})}
										</div>

										{permissions?.certificate.create && (
											<div className="flex flex-row gap-2 flex-wrap w-full justify-end mr-4">
												<HandleCertificate />
											</div>
										)}
									</div>
								)}
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
