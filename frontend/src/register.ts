import { initGoogleUI } from "./google";
import type { Ctx } from "./router.js";
import { currentTranslations, initializeLanguages } from "./translate.js";

export async function mount(el: HTMLElement, ctx: Ctx) {
	// Inicializar el sistema de traducción primero
	await initializeLanguages();
	
	const { api, t, navigate } = ctx;

	el.innerHTML = `
	<div class="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white relative overflow-hidden">
		<div class="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-3xl"></div>
		<div class="pointer-events-none absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl"></div>

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
						${t("register-title") || "Crear cuenta"}
					</span>
		  		</h1>

				<form id="form-register" class="space-y-5" autocomplete="off">
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-email">${t("field-email") || "Correo electrónico"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
								border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							name="email"
							data-translate-placeholder="email-placeholder"
							placeholder="${t("email-placeholder") || "tu@email.com"}"
							type="email"
							inputmode="email"
							spellcheck="false"
							autocapitalize="none"
							autocomplete="email"
							readonly
							required
				  		/>
					</div>

					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-display_name">${t("field-display_name") || "Nombre público"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
							border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
							name="display_name"
							data-translate-placeholder="username-placeholder"
							placeholder="${t("username-placeholder") || "Tu nombre público"}"
							autocomplete="nickname"
							required
				  		/>
					</div>

					<div class="flex gap-4">
						<div class="flex-1 space-y-2">
							<label class="text-sm text-zinc-300" data-translate="field-first_name">${t("field-first_name") || "Nombre"}</label>
							<input
								class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						  		name="first_name"
								data-translate-placeholder="name-placeholder"
								placeholder="${t("name-placeholder") || "Nombre"}"
								autocomplete="given-name"
							/>
						</div>
						<div class="flex-1 space-y-2">
							<label class="text-sm text-zinc-300" data-translate="field-last_name">${t("field-last_name") || "Apellido"}</label>
							<input
								class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								name="last_name"
								data-translate-placeholder="last_name-placeholder"
								placeholder="${t("last_name-placeholder") || "Apellido"}"
								autocomplete="family-name"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-birthdate">${t("field-birthdate") || "Fecha de nacimiento"}</label>
						<input
							class="w-full p-3 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
								border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
							name="birthdate"
							type="date"
							autocomplete="bday"
					  	/>
					</div>
					<div class="space-y-2">
						<label class="text-sm text-zinc-300" data-translate="field-password">${t("field-password") || "Contraseña"}</label>
						<div class="relative">
							<input
								id="pwd"
								class="w-full p-3 pr-12 rounded-xl bg-zinc-900/60 text-white placeholder-zinc-400
									border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
								name="password"
								data-translate-placeholder="pass-placeholder"
								placeholder="${t("pass-placeholder") || "Contraseña (mín. 8)"}"
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

					<button
						id="submitBtn"
						class="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-semibold py-3 rounded-xl transition
							shadow-lg shadow-indigo-600/25
							focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-black
							disabled:opacity-60 disabled:cursor-not-allowed"
						type="submit"
						data-translate="action-register"
					>${t("action-register") || "Registrarse"}</button>

					<div class="relative">
						<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10"></div></div>
						<div class="relative flex justify-center text-sm"><span class="px-2 bg-zinc-900/60 text-zinc-400">o</span></div>
					</div>

					<button id="google-btn" type="button" aria-label="Registrarse con Google" aria-busy="false"
						class="w-full group inline-flex items-center justify-center gap-3 rounded-2xl font-medium h-11 px-4 text-sm
							ring-1 ring-zinc-300/20 relative transition-all duration-200 ease-out
							hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none
							focus-visible:ring-2 focus-visible:ring-zinc-300/60 disabled:opacity-70 disabled:cursor-not-allowed">
						<span class="relative inline-flex h-5 w-5 items-center justify-center">
							<svg id="google-g-icon" viewBox="0 0 48 48" aria-hidden="true" class="h-5 w-5">
								<path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.1 6.25C12.43 13.72 17.74 9.5 24 9.5z"></path>
								<path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
								<path fill="#FBBC05" d="M10.66 28.71c-.6-1.8-1-3.75-1-5.71s.4-3.91 1-5.71l-8.1-6.25C.9 14.07 0 18.86 0 24c0 5.14.9 9.93 2.56 14.07l8.1-6.36z"></path>
								<path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-8.1 6.25C6.51 42.62 14.62 48 24 48z"></path>
								<path fill="none" d="M0 0h48v48H0z"></path>
							</svg>
							<svg id="google-spinner" viewBox="0 0 24 24" class="h-5 w-5 animate-spin hidden" aria-hidden="true">…</svg>
						</span>
						<span id="google-label">${t("google.register") || "Registrarse con Google"}</span>
						<span class="pointer-events-none ml-1 opacity-0 transition-opacity group-hover:opacity-100">→</span>
					</button>

					<div id="err" class="text-red-400 text-sm min-h-[1.25rem]"></div>
				</form>

				<a href="/" class="block text-center mt-4 underline opacity-80 hover:opacity-100" data-translate="action-back">
					${t("action-back") || "Volver"}
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
	const toggle = qs<HTMLButtonElement>("#togglePwd"); // Corregido: P mayúscula
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

	// Validar fecha de nacimiento
	const birthdateInput = qs<HTMLInputElement>('input[name="birthdate"]');
	const birthdateValidation = validateBirthdate(birthdateInput?.value || '');
	
	if (!birthdateValidation.valid) {
		setError(birthdateValidation.message);
		return;
	}

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

	window.addEventListener("languageChanged", () => {
		// Título
		qs('[data-translate="register-title"]')!.textContent = t("register-title") || "Crear cuenta";
		
		// Labels
		qs('[data-translate="field-email"]')!.textContent = t("field-email") || "Correo electrónico";
		qs('[data-translate="field-display_name"]')!.textContent = t("field-display_name") || "Nombre público";
		qs('[data-translate="field-first_name"]')!.textContent = t("field-first_name") || "Nombre";
		qs('[data-translate="field-last_name"]')!.textContent = t("field-last_name") || "Apellido";
		qs('[data-translate="field-birthdate"]')!.textContent = t("field-birthdate") || "Fecha de nacimiento";
		qs('[data-translate="field-password"]')!.textContent = t("field-password") || "Contraseña";

		// Placeholders
		const emailInput = qs<HTMLInputElement>('input[name="email"]');
		if (emailInput) emailInput.placeholder = t("email-placeholder") || "tu@email.com";
		
		const displayNameInput = qs<HTMLInputElement>('input[name="display_name"]');
		if (displayNameInput) displayNameInput.placeholder = t("username-placeholder") || "Tu nombre público";

		const firstNameInput = qs<HTMLInputElement>('input[name="first_name"]');
		if (firstNameInput) firstNameInput.placeholder = t("name-placeholder") || "Nombre";

		const lastNameInput = qs<HTMLInputElement>('input[name="last_name"]');
		if (lastNameInput) lastNameInput.placeholder = t("last_name-placeholder") || "Apellido";

		const passwordInput = qs<HTMLInputElement>('input[name="password"]');
		if (passwordInput) passwordInput.placeholder = t("pass-placeholder") || "Contraseña (mín. 8)";

		const submitBtn = qs<HTMLButtonElement>("#submitBtn");
		if (submitBtn && !submitBtn.disabled) {
			submitBtn.textContent = t("action-register") || "Registrarse";
		}
		
		qs("#google-label")!.textContent = t("google.register") || "Registrarse con Google";
		
		qs('[data-translate="action-back"]')!.textContent = t("action-back") || "Volver";
	});

	function validateBirthdate(date: string): { valid: boolean; message: string } {
	  // Verificar si la fecha está vacía
	  if (!date) return { valid: true, message: '' }; // Opcional, permitir sin fecha
	  
	  const birthDate = new Date(date);
	  const today = new Date();
	  
	  // Verificar que sea una fecha válida
	  if (isNaN(birthDate.getTime())) {
	    return { 
	      valid: false, 
	      message: t("birthdate.invalid") || "Fecha inválida"
	    };
	  }
	  
	  // Verificar que no sea una fecha futura
	  if (birthDate > today) {
	    return { 
	      valid: false, 
	      message: t("birthdate.future") || "La fecha no puede ser futura"
	    };
	  }
	  
	  return { valid: true, message: '' };
	}
}