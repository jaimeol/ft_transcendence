import { initGoogleUI } from "./google";
import type { Ctx } from "./router.js";

export async function mount(el: HTMLElement, ctx: Ctx) {
	const { api, t, navigate } = ctx;

	el.innerHTML = `
	<div class="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white relative overflow-hidden">
		<!-- Glows -->
   		<div class="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-3xl"></div>
		<div class="pointer-events-none absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl"></div>

		<!-- Selector idioma -->
		<div class="fixed top-4 right-4 z-50 text-sm whitespace-nowrap">
	  		<div class="bg-white/5 border border-white/10 backdrop-blur px-3 py-1.5 rounded-full shadow">
			<button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
			<span class="mx-2 text-white/50">|</span>
			<button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
			<span class="mx-2 text-white/50">|</span>
			<button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
	  	</div>
	</div>
	<main class="w-full min-h-screen flex items-center justify-center px-4">
		<section class="w-full max-w-md">
			<div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
				<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-6">
					<span class="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent" data-translate="register-title">
						${t("register-title") || "Create Account"}
					</span>
		  		</h1>

				<form id="form-register" class="space-y-5" autocomplete="off">
					<!-- Email -->
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-email">${t("field-email") || "Email"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
								border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							name="email"
							data-translate-placeholder="email-placeholder"
							placeholder="${t("email-placeholder") || "your@email.com"}"
							type="email"
							inputmode="email"
							spellcheck="false"
							autocapitalize="none"
							autocomplete="email"
							readonly
							required
				  		/>
					</div>

					<!-- Display name -->
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-display_name">${t("field-display_name") || "Display Name"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
							border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							name="display_name"
							data-translate-placeholder="username-placeholder"
							placeholder="${t("username-placeholder") || "Your public username"}"
							autocomplete="nickname"
							required
				  		/>
					</div>

					<!-- Nombre y apellidos -->
					<div class="flex gap-4">
						<div class="flex-1 space-y-2">
							<label class="text-sm text-zinc-300" data-translate="field-first_name">${t("field-first_name") || "Name"}</label>
							<input
								class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						  		name="first_name"
								data-translate-placeholder="name-placeholder"
								placeholder="${t("name-placeholder") || "Name"}"
								autocomplete="given-name"
							/>
						</div>
						<div class="flex-1 space-y-2">
							<label class="text-sm text-zinc-300" data-translate="field-last_name">${t("field-last_name") || "Last Name"}</label>
							<input
								class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								name="last_name"
								data-translate-placeholder="last_name-placeholder"
								placeholder="${t("last_name-placeholder") || "Last Name"}"
								autocomplete="family-name"
							/>
						</div>
					</div>

					<!-- Fecha -->
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-birthdate">${t("field-birthdate") || "Date of birth"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
								border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							name="birthdate"
							type="date"
							autocomplete="bday"
					  	/>
					</div>
					<!-- Contraseña -->
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-password">${t("field-password") || "Password"}</label>
						<div class="relative">
							<input
								id="pwd"
								class="w-full p-3 pr-12 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
									border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								name="password"
								data-translate-placeholder="pass-placeholder"
								placeholder="${t("pass-placeholder") || "Password (min. 8)"}"
								type="password"
								minlength="8"
								autocomplete="new-password"
								required
							/>
							<button
								type="button"
								id="togglePwd"
								class="absolute inset-y-0 right-0 px-3 text-sm text-white/70 hover:text-white"
								aria-label="Mostrar u ocultar contraseña"
							>👁️</button>
						</div>
					</div>

					<!-- Enviar -->
					<button
						id="submitBtn"
						class="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-semibold py-3 rounded-xl transition
							shadow-lg shadow-indigo-600/25
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-black
							disabled:opacity-60 disabled:cursor-not-allowed"
						type="submit"
						data-translate="action-register"
					>${t("action-register") || "Register"}</button>

					<!-- Separador -->
					<div class="relative">
						<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10"></div></div>
						<div class="relative flex justify-center text-sm"><span class="px-2 bg-zinc-900/60 text-zinc-400">o</span></div>
					</div>

					<!-- Google -->
					<button id="google-btn" type="button" aria-label="Registrarse con Google" aria-busy="false"
						class="w-full group inline-flex items-center justify-center gap-3 rounded-2xl font-medium h-11 px-4 text-sm
							ring-1 ring-zinc-300/20 relative transition-all duration-200 ease-out
							hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none
							focus-visible:ring-2 focus-visible:ring-zinc-300/60 disabled:opacity-70 disabled:cursor-not-allowed">
						<span class="relative inline-flex h-5 w-5 items-center justify-center">
							<svg id="google-g-icon" viewBox="0 0 48 48" aria-hidden="true" class="h-5 w-5">...</svg>
							<svg id="google-spinner" viewBox="0 0 24 24" class="h-5 w-5 animate-spin hidden" aria-hidden="true">...</svg>
						</span>
						<span id="google-label">${t("google.register") || "Register with Google"}</span>
						<span class="pointer-events-none ml-1 opacity-0 transition-opacity group-hover:opacity-100">→</span>
					</button>

					<div id="err" class="text-red-400 text-sm min-h-[1.25rem]"></div>
				</form>

				<a href="/login" class="block text-center mt-4 underline opacity-80 hover:opacity-100" data-translate="action-back">
					${t("action-back") || "Back"}
				</a>
			</div>
		</section>
		</main>
	</div>
  `;

  const qs = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector(s) as T | null;
  const setError = (m: string) => { const box = qs<HTMLDivElement>("#err"); if (box) box.textContent = m; };
  const setLoading = (v: boolean) => {
	const btn = qs<HTMLButtonElement>("#submitBtn");
	if (btn) {
		btn.disabled = v;
		btn.textContent = v ? (t("action-register") ? `${t("action-register")}...` : "Registrando...")
							: (t("action-register") || "Register")
	}
  };

  (function setupEmailReadOnly() {
	const email = qs<HTMLInputElement>('input[name="email"]');
	if (!email) return;
	const enable = () => email.removeAttribute("readonly");
	const disable = () => email.setAttribute("readonly", "true");
	disable();
	email.addEventListener("pointerdown", enable);
	email.addEventListener("focus", enable);
	email.addEventListener("keydown", enable);
	email.addEventListener("blur", disable);
	setTimeout(() => { if (document.activeElement === email) enable(); }, 0);
  })();


  (function setupPasswordToggle() {
	const pwd = qs<HTMLInputElement>("#pwd");
	const toggle = qs<HTMLButtonElement>("#togglepwd");
	if (!pwd || !toggle) return;
	toggle.addEventListener("click", () => {
		const isPwd = pwd.type === "password";
		pwd.type = isPwd ? "text" : "password";
		toggle.textContent = isPwd ? "🙈" : "👁️";
	});
  })();

  qs<HTMLFormElement>("#form-register")?.addEventListener("submit", async (e) => {
	e.preventDefault();
	const form = e.currentTarget as HTMLFormElement;
	const data = Object.fromEntries(new FormData(form).entries());

	setError("");
	setLoading(true);

	try {
		const res = await api("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json"},
			body: JSON.stringify(data),
		});

		ctx.user = res?.user ?? res ?? null;
		navigate("/home", { replace: true});
	} catch (err: any) {
		const msg = String(err?.message || "");
		if (msg === "409") setError(`${t("email.name.in-use")}`);
		else if (msg === "400") setError(`${t("register.invalid.password")}`);
		else setError(`${t("register.unexpected")}`);
		setLoading(false);
	}
  });

  import("./google.js")
  	.then(({ initGoogleUI}) => {
		initGoogleUI(el, navigate);
	})
	.catch(console.error);
}

// declare const api: (url: string, init?: RequestInit) => Promise<any>;

// function qs<T extends HTMLElement = HTMLElement> (sel: string) {
// 	return document.querySelector(sel) as T | null;
// }

// function setError(msg: string) {
// 	const err = qs<HTMLDivElement>("#err");
// 	if (err) err.textContent = msg;
// }

// function disableSubmit(disabled: boolean) {
// 	const btn = qs<HTMLButtonElement>("#submitBtn");
// 	if (btn) btn.disabled = disabled;
// }

// async function onSubmit(e: Event) {
// 	e.preventDefault();
// 	const form = e.currentTarget as HTMLFormElement;
// 	const data = Object.fromEntries(new FormData(form).entries());

// 	try {
// 		disableSubmit(true);
// 		setError("");
// 		await api("/api/auth/register", {
// 			method: "POST",
// 			body: JSON.stringify(data),
// 			headers: { "Content-Type": "application/json" },
// 		});
// 		location.href = "../home.html";
// 	} catch (err: any) {
// 		setError(err?.message ?? "Error inesperado");
// 	} finally {
// 		disableSubmit (false);
// 	}
// }

// function setupEmailReadOnly() {
// 	const emailInput = qs<HTMLInputElement>('input[name="email"]');
// 	if (!emailInput) return;

// 	const enable = () => emailInput.removeAttribute("readonly");
// 	const disable = () => emailInput.setAttribute("readonly", "true");

// 	disable();

// 	emailInput.addEventListener('pointerdown', enable);
// 	emailInput.addEventListener('focus', enable);
// 	emailInput.addEventListener('keydown', enable);

// 	emailInput.addEventListener("blur", disable);

// 	setTimeout(() => {
// 		if (document.activeElement === emailInput) enable();
// 	}, 0);
// }

// function setupPasswordToggle() {
// 	const pwd = qs<HTMLInputElement>("#pwd");
// 	const toggle = qs<HTMLButtonElement>("#togglePwd");
// 	if (!pwd || !toggle) return;

// 	toggle.addEventListener("click", () => {
// 		const isPwd = pwd.type === "password";
// 		pwd.type = isPwd ? "text" : "password";
// 		toggle.textContent = isPwd ? "🙈" : "👁️";
// 	});
// }

// window.addEventListener("DOMContentLoaded", async () => { 
// 	await initializeLanguages();
// 	const form = qs<HTMLFormElement>("#f");
// 	if (form) form.addEventListener("submit", onSubmit);

// 	setupEmailReadOnly();
// 	setupPasswordToggle();
// })