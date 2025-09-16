export function mount(el, { api, t, navigate }) {
    el.innerHTML = `
	<div class="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white relative overflow-hidden">
	  <!-- Idioma fijo arriba -->
	  <div class="fixed top-4 right-4 z-50 text-sm whitespace-nowrap">
		<div class="bg-white/5 border border-white/10 backdrop-blur px-3 py-1.5 rounded-full shadow">
		  <button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
		  <span class="mx-2 text-white/50">|</span>
		  <button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
		  <span class="mx-2 text-white/50">|</span>
		  <button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
		</div>
	  </div>

	  <main class="min-h-screen grid place-items-center px-4">
		<section class="w-full max-w-md p-8 rounded-2xl bg-zinc-900/60 backdrop-blur">
		  <h1 class="text-3xl font-bold mb-8 text-center">${t("login") ?? "Iniciar sesión"}</h1>

		  <div id="error-message" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm hidden"></div>

		  <form id="login-form" class="space-y-6" autocomplete="on">
			<div class="space-y-2">
			  <label for="email" class="block text-sm text-white">${t("field-email") ?? "Email"}</label>
			  <input id="email" name="email" type="email" inputmode="email" autocomplete="username"
					 autocapitalize="none" spellcheck="false"
					 class="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white placeholder-zinc-400 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-indigo-500 transition"
					 placeholder="${t("email-placeholder") ?? "tu@email.com"}" required />
			</div>

			<div class="space-y-2">
			  <label for="password" class="block text-sm text-zinc-300">${t("field-password") ?? "Contraseña"}</label>
			  <input id="password" name="password" type="password" autocomplete="current-password"
					 class="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white placeholder-zinc-400 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-indigo-500 transition"
					 placeholder="••••••••" required />
			</div>

			<button id="submitBtn" type="submit"
					class="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-3 rounded-lg text-lg font-semibold transition">
			  ${t("login") ?? "Entrar"}
			</button>

			<!-- Google -->
			<div class="mt-2 space-y-2">
			<button id="google-btn" type="button" aria-label="Continuar con Google" aria-busy="false"
			  class="w-full group inline-flex items-center justify-center gap-3 rounded-2xl font-medium h-11 px-4 text-sm
					ring-1 ring-zinc-300/20 relative transition-all duration-200 ease-out
					hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none
					focus-visible:ring-2 focus-visible:ring-zinc-300/60 disabled:opacity-70 disabled:cursor-not-allowed">
			  <span class="relative inline-flex h-5 w-5 items-center justify-center">
				<svg id="google-g-icon" viewBox="0 0 48 48" aria-hidden="true" class="h-5 w-5">…</svg>
				<svg id="google-spinner" viewBox="0 0 24 24" class="h-5 w-5 animate-spin hidden" aria-hidden="true">…</svg>
			  </span>
			  <span id="google-label">Continuar con Google</span>
			  <span class="pointer-events-none ml-1 opacity-0 transition-opacity group-hover:opacity-100">→</span>
			</button>


			  <!-- Contenedor por si prefieres renderizar el botón oficial -->
			  <div id="google-host" class="w-full"></div>
			</div>

			<p class="text-sm text-center text-zinc-400 mt-2">
			  <span>${t("no_account") ?? "¿No tienes cuenta?"}</span>
			  <a class="ml-1 text-indigo-400 hover:text-indigo-300 underline" href="/register">${t("register") ?? "Regístrate"}</a>
			</p>
		  </form>
		</section>
	  </main>
	</div>
  `;
    // ------- helpers -------
    const qs = (s) => el.querySelector(s);
    const err = qs("#error-message");
    const submitBtn = qs("#submitBtn");
    const setError = (m) => { if (!err)
        return; err.textContent = m; err.classList.remove("hidden"); err.style.display = "block"; };
    const clearError = () => { if (err) {
        err.classList.add("hidden");
        err.style.display = "none";
    } };
    const setLoading = (v) => { if (submitBtn) {
        submitBtn.disabled = v;
        submitBtn.textContent = v ? (t("logging_in") ?? "Iniciando sesión...") : (t("login") ?? "Entrar");
    } };
    // Email/password
    qs("#login-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        const email = String(data.email || "");
        const password = String(data.password || "");
        if (!email || !password)
            return setError(t("fill_all_fields") ?? "Por favor, completa todos los campos");
        setLoading(true);
        try {
            await api("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            await api("/api/auth/me").catch(() => { });
            navigate("/home", { replace: true });
        }
        catch (e) {
            setError(e?.message ?? (t("login_error") ?? "Error al iniciar sesión"));
            setLoading(false);
        }
    });
    import("./google.js").then(({ initGoogleUI }) => {
        initGoogleUI(el, navigate);
    }).catch(console.error);
}
