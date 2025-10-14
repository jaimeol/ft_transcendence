
import { Ctx } from "./router";
import { currentTranslations, initializeLanguages } from "./translate.js";

type UserLite = {
  id: number;
  display_name: string;
  avatar_path?: string | null;
  online?: boolean;
};

export async function mount(el: HTMLElement, ctx: Ctx) {
	// Inicializar el sistema de traducción primero
	await initializeLanguages();

	let isAuthed = false;

	try {
		const response = await ctx.api("/api/auth/me");

		isAuthed = !!(response && response.user);
	} catch (error) {
		isAuthed = false;
	}

	if (!isAuthed) {
		ctx.navigate("/login", { replace: true });
		return;
	}
	
	const t = ctx.t;

	const $ = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector(s) as T | null;
	const $$ = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(el.querySelectorAll(s)) as T[];

	const escapeHTML = (s: string = "") =>
  		s.replace(/[&<>"']/g, c =>
    	({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]!
  	);
	const avatarUrl = (p?: string | null) => (p && p.trim()) ? p : "/files/defautl-avatar.png";

	const userRow = (u: UserLite, actionsHtml = "") => `
	<div class="flex item-center gap-3 p-2 rounded bg-white/5 border border-white/10">
		<img src="${avatarUrl(u.avatar_path)}" width="36" height="36"
			class="avatar object-cover rounded-full"
			onerror="this.onerror=null; this.src='/default-avatar.png'" alt="Avatar">
		<div class="flex-1">
			<div class="font-semibold">${escapeHTML(u.display_name)}</div>
			<div class="opacity-70 text-xs">${u.online ? "🟢 Online": "⚪ Offline"}</div>
		</div>
		<div class="text-sm">${actionsHtml}</div>
	</div>
	`;

	el.innerHTML = `
	<header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
    	<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        	<a href="/home" class="flex items-center gap-2">
        		<div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
        		<span class="font-semibold">ft_transcendence</span>
        	</a>
        	<div class="flex items-center gap-3">
        		<div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-xs backdrop-blur">
            		<button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
            		<span class="mx-1 text-white/40">|</span>
            		<button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
            		<span class="mx-1 text-white/40">|</span>
            		<button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
        		</div>
        		<button id="logoutBtn"
            		class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg text-xs"
            		data-translate="home.logout">
            		${t("home.logout") || "Cerrar sesión"}
        		</button>
        	</div>
    	</div>
    </header>

    <main class="flex-1 flex items-center justify-center bg-black text-white min-h-[calc(100vh-56px)]">
    	<div class="bg-zinc-900/60 border border-white/10 backdrop-blur p-6 rounded-2xl shadow w-[min(92vw,520px)]">
    		<h1 class="text-2xl font-bold mb-4" data-translate="Friends.title">${t("friends.title") || "Amigos"}</h1>

        <!-- Buscar -->
        	<div class="space-y-3 mb-4">
          		<input id="search" class="w-full p-2 rounded bg-zinc-800 text-white outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-indigo-500"
            	placeholder="${t("friends.search_placeholder") || "Buscar por nombre o email…"}"/>
          		<div id="results" class="space-y-2 text-sm"></div>
        	</div>

        <!-- Pendientes -->
        	<h2 class="text-lg font-semibold mt-6">${t("friends.pending") || "Solicitudes pendientes"}</h2>
        	<div id="pending" class="space-y-2 text-sm">—</div>

        <!-- Amigos -->
        	<h2 class="text-lg font-semibold mt-6">${t("friends.your_friends") || "Tus amigos"}</h2>
        	<div id="list" class="space-y-2 text-sm">${t("loading") || "Cargando..."}</div>
        	<div id="err" class="text-red-400 text-sm min-h-[1.25rem] mt-2"></div>

        <!-- Nav -->
        	<div class="flex justify-between mt-6">
        		<a class="underline opacity-80 hover:opacity-100" href="/profile">${t("profile.title") || "Perfil"}</a>
        		<a class="underline opacity-80 hover:opacity-100" href="/home">${t("home") || "Inicio"}</a>
        	</div>
    	</div>
    </main>
	`;

	async function loadFriends() {
		const listEl = $("#list");
		if (!listEl)
			throw new Error("Could not find user list");
		const errBox = $("#err");
		if (!errBox)
			throw new Error("Could not find errBox");
		listEl!.innerHTML = `<div class="text-white/60 text-center py-2">${t("loading") || "Cargando..."}</div>`;
		errBox!.textContent = "";

		try {
			const resp = await ctx.api("/api/friends") as { friends: UserLite[] };
			const { friends } = resp;
			
			if (!friends?.length) {
				listEl.innerHTML = `<div class="text-white/60 text-center py-8">
					<div class="text-4xl mb-3">👥</div>
					<div class="text-lg mb-2">${t("friends.none") || "Todavía no tienes amigos"}</div>
					<div class="text-sm opacity-60">Busca usuarios arriba para añadir amigos</div>
				</div>`;
				return;
			}
			
			listEl.innerHTML = friends.map(u => 
				userRow(u, `<a href="/profile?user=${u.id}" class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-sm transition-colors">
					👤 Ver Perfil
				</a>`)
			).join("");
		} catch (err: any) {
			if (String(err?.message) === '401') ctx.navigate("/login", { replace: true });
			listEl.innerHTML = `<div class="text-red-400 text-center py-4">
				<div class="text-2xl mb-2">❌</div>
				<div>${t("friends.load_error") || "Error cargando amigos"}</div>
			</div>`;
			errBox.textContent = "";
		}
	}

	async function loadPending() {
		const box = $("#pending")!;
		try {
			const resp = await ctx.api("/api/friends/pending") as { incoming: UserLite[];outgoing: UserLite[]};
			const { incoming = [], outgoing = [] } = resp;
			
			if (!incoming.length && !outgoing.length) {
				box.innerHTML = `<div class="text-white/60 text-center py-4">
					<div class="text-2xl mb-2">📭</div>
					<div>${t("friends.no_pending") || "No hay solicitudes pendientes"}</div>
				</div>`;
				return;
			}
			
			let html = "";
			
			if (incoming.length) {
				html += `<div class="mb-4">
					<h3 class="text-sm font-semibold text-green-400 mb-2">
						📥 ${t("friends.incoming") || "Solicitudes recibidas"} (${incoming.length})
					</h3>
					<div class="space-y-2">
						${incoming.map(u =>
							userRow(u, `<div class="flex gap-2">
								<button class="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm" data-accept="${u.id}">
									✓ ${t("friends.accept") || "Aceptar"}
								</button>
								<button class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm" data-reject="${u.id}">
									✗ ${t("friends.reject") || "Rechazar"}
								</button>
							</div>`)
						).join("")}
					</div>
				</div>`;
			}
			
			if (outgoing.length) {
				html += `<div>
					<h3 class="text-sm font-semibold text-yellow-400 mb-2">
						📤 ${t("friends.outgoing") || "Solicitudes enviadas"} (${outgoing.length})
					</h3>
					<div class="space-y-2">
						${outgoing.map(u => 
							userRow(u, `<span class="px-3 py-1 rounded bg-yellow-600/20 text-yellow-400 text-sm">
								⏳ ${t("friends.requested") || "Pendiente"}
							</span>`)
						).join("")}
					</div>
				</div>`;
			}
			
			box.innerHTML = html;
		} catch {
			box.innerHTML = `<div class="text-white/60 text-center py-4">
				<div class="text-2xl mb-2">❌</div>
				<div>Error cargando solicitudes</div>
			</div>`;
		}
	}

	async function doSearch(q: string) {
		const results = $("#results")!;
		if (!q) { results.innerHTML = ""; return; }
		
		// Mostrar loading
		results.innerHTML = `<div class="text-white/60 text-center py-2">${t("loading") || "Buscando..."}</div>`;
		
		try {
			const resp = await ctx.api(`/api/users/search?q=${encodeURIComponent(q)}`) as { users: UserLite[] };
			const { users } = resp;
			
			if (!users?.length) {
				results.innerHTML = `<div class="text-white/60 text-center py-4">
					<div class="text-2xl mb-2">🔍</div>
					<div>${t("friends.no_results") || "Sin resultados."}</div>
					<div class="text-xs opacity-60 mt-1">Prueba con otro término de búsqueda</div>
				</div>`;
				return;
			}
			
			// Obtener estado de amistad para cada usuario
			const friendsResp = await ctx.api("/api/friends") as { friends: UserLite[] };
			const pendingResp = await ctx.api("/api/friends/pending") as { incoming: UserLite[], outgoing: UserLite[] };
			
			const friendIds = new Set(friendsResp.friends?.map(f => f.id) || []);
			const pendingOutIds = new Set(pendingResp.outgoing?.map(f => f.id) || []);
			const pendingInIds = new Set(pendingResp.incoming?.map(f => f.id) || []);
			
			results.innerHTML = users.map(u => {
				let actionHtml = "";
				
				if (friendIds.has(u.id)) {
					actionHtml = `<span class="px-3 py-1 rounded bg-green-600/20 text-green-400 text-sm">
						✓ ${t("friends.already_friends") || "Amigos"}
					</span>`;
				} else if (pendingOutIds.has(u.id)) {
					actionHtml = `<span class="px-3 py-1 rounded bg-yellow-600/20 text-yellow-400 text-sm">
						⏳ ${t("friends.requested") || "Solicitado"}
					</span>`;
				} else if (pendingInIds.has(u.id)) {
					actionHtml = `<button class="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm" data-accept="${u.id}">
						${t("friends.accept") || "Aceptar"}
					</button>`;
				} else {
					actionHtml = `<button class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-sm transition-colors" data-add="${u.id}">
						${t("friends.add") || "Añadir"}
					</button>`;
				}
				
				return userRow(u, actionHtml);
			}).join("");
			
		} catch (err: any) {
			results.innerHTML = `<div class="text-red-400 text-center py-4">
				<div class="text-2xl mb-2">❌</div>
				<div>${t("friends.search_error") || "Error buscando amigos"}</div>
				<div class="text-xs opacity-60 mt-1">${escapeHTML(err?.message || "Error desconocido")}</div>
			</div>`;
		}
	}

	async function sendFriendRequest(userId: number) {
		await ctx.api(`/api/friends/${userId}`, { method: "POST" });
	}

	async function acceptFriendRequest(userId: number) {
		await ctx.api(`/api/friends/${userId}/accept`, { method: "POST"});
	}

	async function rejectFriendRequest(userId: number) {
		await ctx.api(`/api/friends/${userId}/reject`, { method: "POST"});
	}

	const subs = new AbortController();
	const on = <K extends keyof HTMLElementEventMap>(
		node: HTMLElement | Document | Window,
		type: K,
		handler: (ev: any) => void
	) => node.addEventListener(type, handler as any, { signal: subs.signal });

	on(el, "click", async (ev: Event) => {
		const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("#logoutBtn");
		if (!btn) return;
		try {
			await ctx.api("/api/auth/logout", { method: "POST" });
		} finally {
			ctx.navigate("/", { replace: true });
		}
	});

	let searchTimer: number | undefined;
	const search = $("#search") as HTMLInputElement | null;
	if (search) {
		on(search, "input", () => {
			if (searchTimer) window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(() => doSearch(search.value.trim()), 250);
		});
	}

	on(el, "click", async (ev: Event) => {
		const tEl = ev.target as HTMLElement;
		const addBtn = tEl.closest<HTMLButtonElement>("[data-add]");

		if (addBtn) {
			const id = Number(addBtn?.getAttribute("data-add"));
			if (!Number.isFinite(id)) return;
			try {
				addBtn?.setAttribute("disabled", "true");
				await sendFriendRequest(id);
				addBtn.textContent = t("friends.requested") || "Solicitado";
				await loadPending();
			} catch (e: any) {
				alert("❌ " + (e?.message || (t("friends.request_error") || "Error enviando solicitud")));
			} finally {
				addBtn?.removeAttribute("disabled");
			}
			return;
		}

		const accBtn = tEl.closest<HTMLButtonElement>("[data-accept]");
		if (accBtn) {
			const id = Number(accBtn.getAttribute("data-accept"));
			if (!Number.isFinite(id)) return;
			try {
				accBtn.setAttribute("disabled", "true");
				await acceptFriendRequest(id);
				// Recargar las listas para mostrar los cambios
				await Promise.all([loadPending(), loadFriends()]);
			} catch (e: any) {
				// Si el error es 404, probablemente ya se aceptó, así que recargamos igual
				if (String(e?.message) === '404') {
					await Promise.all([loadPending(), loadFriends()]);
				} else {
					alert("❌ " + (e?.message || (t("friends.accept_error") || "Error aceptando solicitud")));
					accBtn.removeAttribute("disabled");
				}
			}
		}

		const rejBtn = tEl.closest<HTMLButtonElement>("[data-reject]");
		if (rejBtn) {
			const id = Number(rejBtn.getAttribute("data-reject"));
			if (!Number.isFinite(id)) return;
			try {
				rejBtn.setAttribute("disabled", "true");
				await rejectFriendRequest(id);
				await loadPending();
			} catch (e: any) {
				alert("❌ " + (e?.message || "Error rechazando solicitud"));
				rejBtn.removeAttribute("disabled");
			}
		}
	});


	await Promise.all([loadFriends(), loadPending()]).catch(() => {});

	(function watchDetach() {
		if (!el.isConnected)  {
			subs.abort();
			if (searchTimer) window.clearTimeout(searchTimer);
			return;
		}
		requestAnimationFrame(watchDetach);
	})();

}
