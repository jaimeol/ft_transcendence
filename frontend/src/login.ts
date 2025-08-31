import { initializeLanguages, changeLanguage, language } from "./translate.js";

declare global {
	interface Window {
		api: (url: string, init?: RequestInit) => Promise<any>;
		changeLanguage: (lang: language) => Promise<void>;
	}
}

declare const api: (url: string, init?: RequestInit) => Promise<any>;

function qs<T extends HTMLElement = HTMLElement>(sel: string) {
	return document.querySelector(sel) as T | null;
}

function setError(msg: string) {
	const err = qs<HTMLDivElement>("#error-message");
	if (err) {
		err.textContent = msg;
		err.style.display = "block";
	}
}

function clearError() {
	const err = qs<HTMLDivElement>("#error-message");
	if (err) {
		err.style.display = "none";
	}
}

function setLoading(loading: boolean) {
	const btn = qs<HTMLButtonElement>('button[type="submit"]');
	if (btn) {
		btn.disabled = loading;
		btn.textContent = loading ? "Iniciando sesión..." : "Entrar";
	}
}

async function onSubmit(e: Event) {
	e.preventDefault();
	clearError();
	
	const form = e.currentTarget as HTMLFormElement;
	const formData = new FormData(form);
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!email || !password) {
		setError("Por favor, completa todos los campos");
		return;
	}

	setLoading(true);

	try {
		const response = await api("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});

		console.log("Login exitoso:", response);
		
		// Redirigir al usuario a la página principal
		window.location.href = "/home.html";
		
	} catch (error) {
		console.error("Error en login:", error);
		setError(error instanceof Error ? error.message : "Error al iniciar sesión");
		setLoading(false);
	}
}

function initLogin() {
	const form = qs<HTMLFormElement>("#login-form");
	if (form) {
		form.addEventListener("submit", onSubmit);
	}
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
	initializeLanguages();
	initLogin();
});

// Hacer changeLanguage disponible globalmente
window.changeLanguage = changeLanguage;
