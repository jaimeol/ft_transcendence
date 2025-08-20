import { initializeLanguages } from "./translate.js";

declare global {
	interface Window {
		api: (url: string, init?: RequestInit) => Promise<any>;
	}
}

declare const api: (url: string, init?: RequestInit) => Promise<any>;

function qs<T extends HTMLElement = HTMLElement> (sel: string) {
	return document.querySelector(sel) as T | null;
}

function setError(msg: string) {
	const err = qs<HTMLDivElement>("#err");
	if (err) err.textContent = msg;
}

function disableSubmit(disabled: boolean) {
	const btn = qs<HTMLButtonElement>("#submitBtn");
	if (btn) btn.disabled = disabled;
}

async function onSubmit(e: Event) {
	e.preventDefault();
	const form = e.currentTarget as HTMLFormElement;
	const data = Object.fromEntries(new FormData(form).entries());

	try {
		disableSubmit(true);
		setError("");
		await api("/api/auth/register", {
			method: "POST",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json" },
		});
		location.href = "../menu.html";
	} catch (err: any) {
		setError(err?.message ?? "Error inesperado");
	} finally {
		disableSubmit (false);
	}
}

function setupEmailReadOnly() {
	const emailInput = qs<HTMLInputElement>('input[name="email"]');
	if (!emailInput) return;

	const enable = () => emailInput.removeAttribute("readonly");
	const disable = () => emailInput.setAttribute("readonly", "true");

	disable();

	emailInput.addEventListener('pointerdown', enable);
	emailInput.addEventListener('focus', enable);
	emailInput.addEventListener('keydown', enable);

	emailInput.addEventListener("blur", disable);

	setTimeout(() => {
		if (document.activeElement === emailInput) enable();
	}, 0);
}

function setupPasswordToggle() {
	const pwd = qs<HTMLInputElement>("#pwd");
	const toggle = qs<HTMLButtonElement>("#togglePwd");
	if (!pwd || !toggle) return;

	toggle.addEventListener("click", () => {
		const isPwd = pwd.type === "password";
		pwd.type = isPwd ? "text" : "password";
		toggle.textContent = isPwd ? "🙈" : "👁️";
	});
}

window.addEventListener("DOMContentLoaded", async () => { 
	await initializeLanguages();
	const form = qs<HTMLFormElement>("#f");
	if (form) form.addEventListener("submit", onSubmit);

	setupEmailReadOnly();
	setupPasswordToggle();
})