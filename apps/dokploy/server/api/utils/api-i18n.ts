import type { ApiLocale } from "./locale";

const apiMessages: Record<ApiLocale, Record<string, string>> = {
	"pt-BR": {
		invalidOrigin: "Origem inválida",
		tooManyRequests: "Muitas requisições",
		unauthorized: "Você precisa entrar para continuar.",
		forbidden: "Você não tem permissão para executar esta ação.",
		userNotFound: "Usuário não encontrado.",
		currentPasswordIncorrect: "A senha atual está incorreta.",
		newPasswordRequired: "A nova senha é obrigatória.",
		licenseRequired: "Uma licença enterprise válida é obrigatória.",
		unexpected: "Erro inesperado. Tente novamente.",
	},
	en: {
		invalidOrigin: "Invalid origin",
		tooManyRequests: "Too many requests",
		unauthorized: "You need to sign in to continue.",
		forbidden: "You do not have permission to perform this action.",
		userNotFound: "User not found.",
		currentPasswordIncorrect: "Current password is incorrect.",
		newPasswordRequired: "New password is required.",
		licenseRequired: "A valid enterprise license is required.",
		unexpected: "Unexpected error. Try again.",
	},
};

export const getApiI18nMessage = (locale: ApiLocale, key: keyof (typeof apiMessages)["en"]) =>
	apiMessages[locale][key] ?? apiMessages["pt-BR"][key];
