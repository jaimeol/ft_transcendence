import type { Ctx } from "./router.js";

export function mount(el: HTMLElement, { t }: Ctx) {
  // Metemos TODO el HTML de la landing dentro de un contenedor "relative"
  el.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white relative overflow-hidden">

      <!-- Accentos de fondo -->
      <div class="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl"></div>

      <!-- Selector de idioma -->
      <div class="absolute top-4 right-4 z-50 text-sm/none">
        <div class="bg-white/5 border border-white/10 backdrop-blur px-3 py-1.5 rounded-full shadow">
          <button class="hover:underline" onclick="window.changeLanguage?.('en')" aria-label="Change language to English">EN</button>
          <span class="mx-2 text-white/50">|</span>
          <button class="hover:underline" onclick="window.changeLanguage?.('es')" aria-label="Cambiar idioma a Español">ES</button>
          <span class="mx-2 text-white/50">|</span>
          <button class="hover:underline" onclick="window.changeLanguage?.('fr')" aria-label="Changer la langue en Français">FR</button>
        </div>
      </div>

      <!-- Contenido centrado -->
      <main class="min-h-screen grid place-items-center">
        <section class="w-full max-w-md mx-auto">
          <!-- Tarjeta -->
          <div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
            <!-- Logo / título -->
            <div class="flex items-center gap-3 mb-6">
              <div class="size-10 rounded-xl bg-gradient-to-br from-indigo-400 to-emerald-400 shadow-lg"></div>
              <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
                <span class="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                  Ft_Transcendence
                </span>
              </h1>
            </div>

            <!-- CTA -->
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <a href="/register"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-medium
                       bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                       shadow-lg shadow-indigo-600/25 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-black"
                data-translate="register" aria-label="Registrarse">
                ✨ <span data-translate="register">Registrarse</span>
              </a>

              <a href="/login"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-medium
                       bg-white/10 hover:bg-white/15 active:bg-white/20
                       border border-white/10 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/40 focus-visible:ring-offset-black"
                data-translate="login" aria-label="Iniciar sesión">
                🔑 <span data-translate="login">Iniciar sesión</span>
              </a>
            </div>
          </div>

          <!-- Pie sutil -->
          <div class="text-center mt-6 text-xs text-white/50">
            <span data-translate="landing.footer">© 2025 Ft_Transcendence. All rights reserved.</span>
          </div>
        </section>
      </main>
    </div>
  `;
}
