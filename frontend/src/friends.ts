
import { Ctx } from "./router";

type UserLite = {
  id: number;
  display_name: string;
  avatar_path?: string | null;
  online?: boolean;
};

export async function mount(el: HTMLElement, ctx: Ctx) {
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
		listEl!.textContent = t("loading") || "Cargando...";
		errBox!.textContent = "";

		try {
			const resp = await ctx.api("/api/friends") as { friends: UserLite[] };
			const { friends } = resp;
			listEl.innerHTML = friends?.length
			? friends.map(u => userRow(u)).join("")
			: `<div class="text-white/60">${t("friends.none") || "Todavía no tienes amigos 😢"}</div>`
		} catch (err: any) {
			if (String(err?.message) === '401') ctx.navigate("/login", { replace: true });
			listEl.innerHTML = "";
			errBox.textContent = t("friends.load_error") || "❌ Error cargando amigos";
		}
	}

	async function loadPending() {
		const box = $("#pending")!;
		try {
			const resp = await ctx.api("/api/friends/pending") as { incoming: UserLite[];outgoing: UserLite[]};
			const { incoming = [], outgoing = [] } = resp;
			const incHtml = incoming.map(u =>
				userRow(
					u,
					`<button class="px-2 py-1 rounded bg-green-600 hover:bg-green-700" data-accept="${u.id}">
						${t("friends.accept") || "Aceptar"}
					</button>`
				)
			).join("");
			const outHtml = outgoing.map(u => 
				userRow(
					u,
					`<span class="opacity-70">${t("friends.requested") || "Solicitado"}</span>`
				)
			).join("");

			box.innerHTML = (incoming.length || outgoing.length)
				? (incHtml + (outgoing.length ? `<div class="mt-2 opacity-70">${t("friends.sent") || "Enviadas"}</div>${outHtml}`: ""))
				: `<div class="text-white/60">${t("friends.no_pending") || "No hay solicitudes pendientes."}</div>`;
		} catch {
			box.innerHTML = `<div class="text-white/60">${t("friends.no_pending") || "No hay solicitudes pendientes."}</div>`;
		}
	}

	async function doSearch(q: string) {
		const results = $("#results")!;
		if (!q) { results.innerHTML = ""; return; }
		try {
			const resp = await ctx.api(`/api/users/search?=${encodeURIComponent(q)}`) as { users: UserLite[] };
			const { users } = resp;
			results.innerHTML = users?.length
				? users.map(u => 
					userRow(
						u,
						`<button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500" data-add="${u.id}">
							${t("friends.add") || "Añadir"}
						</button>`
					)
				).join("")
				: `<div class="text-white/60">${t("friends.no_results") || "Sin resultados."}</div>`;
		} catch (err: any) {
			results.innerHTML = `<div class="text-red-400">${t("friends.search_error") || "Error buscando amigos"} : ${escapeHTML(err?.message || "Desconocido")}</div>`;
		}
	}

	async function sendFriendRequest(userId: number) {
		await ctx.api(`/api/friends/${userId}`, { method: "POST" });
	}

	async function acceptFriendRequest(userId: number) {
		await ctx.api(`/api/friends/${userId}/accept`, { method: "POST"});
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
		const accBtn = tEl.closest<HTMLButtonElement>("[data-accept");

		if (addBtn) {
			const id = Number(accBtn?.getAttribute("data-accept"));
			if (!Number.isFinite(id)) return;
			try {
				accBtn?.setAttribute("disabled", "true");
				await acceptFriendRequest(id);
				await Promise.all([loadPending(), loadFriends()]);
			} catch (e: any) {
				alert("❌ " + (e?.message || (t("friends.accept_error") || "Error aceptando solicitud")));
			} finally {
				accBtn?.removeAttribute("disabled");
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

// // --- Utilidades DOM y red de red ---
// const $  = (s: string) => document.querySelector(s) as HTMLElement | null;
// const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];

// function escapeHTML(s: string): string {
//   return (s || "").replace(/[&<>"']/g, c => (
// 	{ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
//   ));
// }

// async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
//   const res = await fetch(url, { credentials: "include", ...init });
//   if (!res.ok) {
// 	let msg = res.statusText;
// 	try {
// 	  const j = await res.json();
// 	  if (j?.error) msg = j.error;
// 	} catch {}
// 	const e = new Error(msg) as any;
// 	(e.status = res.status);
// 	throw e;
//   }
//   return res.json();
// }


// function userRow(u: UserLite, actionsHtml = ""): string {
//   const avatar = u.avatar_path || "/files/default-avatar.png";
//   return `
// 	<div class="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/10">
// 	  <img src="${avatar}" width="36" height="36" class="avatar object-cover" alt="Avatar">
// 	  <div class="flex-1">
// 		<div class="font-semibold">${escapeHTML(u.display_name)}</div>
// 		<div class="opacity-70 text-xs">${u.online ? "🟢 Online" : "⚪ Offline"}</div>
// 	  </div>
// 	  <div class="text-sm">${actionsHtml}</div>
// 	</div>
//   `;
// }

// // --- Cargar amigos aceptados ---
// async function loadFriends() {
//   const listEl = $("#list")!;
//   const errBox = $("#err")!;
//   listEl.textContent = "Cargando...";
//   errBox.textContent = "";

//   try {
// 	const { friends } = await api<{ friends: UserLite[] }>("/api/friends");
// 	listEl.innerHTML = friends?.length
// 	  ? friends.map(u => userRow(u)).join("")
// 	  : `<div class="text-white/60">Todavía no tienes amigos 😢</div>`;
//   } catch (err: any) {
// 	if (err?.status === 401) location.href = "/login.h";
// 	listEl.innerHTML = "";
// 	errBox.textContent = "❌ Error cargando amigos";
//   }
// }

// // --- Cargar solicitudes pendientes (entrantes / enviadas) ---
// async function loadPending() {
//   const box = $("#pending")!;
//   try {
// 	const { incoming = [], outgoing = [] } =
// 	  await api<{ incoming: UserLite[]; outgoing: UserLite[] }>("/api/friends/pending");

// 	const incHtml = incoming.map(u =>
// 	  userRow(u, `<button class="px-2 py-1 rounded bg-green-600 hover:bg-green-700" data-accept="${u.id}">
// 					Aceptar
// 				  </button>`)
// 	).join("");

// 	const outHtml = outgoing.map(u =>
// 	  userRow(u, `<span class="opacity-70">Solicitado</span>`)
// 	).join("");

// 	box.innerHTML = (incoming.length || outgoing.length)
// 	  ? (incHtml + (outgoing.length ? `<div class="mt-2 opacity-70">Enviadas</div>${outHtml}` : ""))
// 	  : `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
//   } catch {
// 	box.innerHTML = `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
//   }
// }

// // --- Búsqueda por nombre o email ---
// let searchTimer: any = null;

// async function doSearch(q: string) {
//   const results = $("#results")!;
//   if (!q) { results.innerHTML = ""; return; }

//   try {
// 	const { users } = await api<{ users: UserLite[] }>(`/api/users/search?q=${encodeURIComponent(q)}`);
// 	results.innerHTML = users?.length
// 	  ? users.map(u =>
// 		  userRow(u, `<button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500" data-add="${u.id}">
// 						Añadir
// 					  </button>`)
// 		).join("")
// 	  : `<div class="text-white/60">Sin resultados.</div>`;
//   } catch (e: any) {
// 	results.innerHTML = `<div class="text-red-400">Error buscando: ${escapeHTML(e?.message || "desconocido")}</div>`;
//   }
// }

// // --- Acciones: enviar/aceptar ---
// async function sendFriendRequest(userId: number) {
//   await api(`/api/friends/${userId}`, { method: "POST" }); // crea 'pending'
// }

// async function acceptFriendRequest(userId: number) {
//   await api(`/api/friends/${userId}/accept`, { method: "POST" });
// }

// // --- Init + Listeners (sin onclick inline) ---
// function init() {
//   // Buscar con debounce
//   const search = $("#search") as HTMLInputElement | null;
//   if (search) {
// 	search.addEventListener("input", () => {
// 	  clearTimeout(searchTimer);
// 	  searchTimer = setTimeout(() => doSearch(search.value.trim()), 250);
// 	});
//   }

//   // Botón "Agregar" por ID (sin inline)
//   const friendIdInput = $("#friendId") as HTMLInputElement | null;
//   if (friendIdInput) {
// 	// Crea el botón por código para evitar inline y lo engancha:
// 	const addBtn = friendIdInput.parentElement?.querySelector("button");
// 	addBtn?.addEventListener("click", async () => {
// 	  const id = parseInt(friendIdInput.value, 10);
// 	  if (!Number.isFinite(id) || id <= 0) {
// 		alert("Introduce un ID válido");
// 		return;
// 	  }
// 	  try {
// 		addBtn.setAttribute("disabled","true");
// 		await sendFriendRequest(id);
// 		alert("✅ Solicitud enviada");
// 		await loadPending();
// 	  } catch (e: any) {
// 		alert("❌ " + (e?.message || "Error enviando solicitud"));
// 	  } finally {
// 		addBtn.removeAttribute("disabled");
// 	  }
// 	});
//   }

//   // Delegación de eventos para botones [data-add] y [data-accept]
//   document.addEventListener("click", async (ev) => {
// 	const t = ev.target as HTMLElement;
// 	if (t?.dataset?.add) {
// 	  const id = Number(t.dataset.add);
// 	  if (!Number.isFinite(id)) return;
// 	  try {
// 		t.setAttribute("disabled","true");
// 		await sendFriendRequest(id);
// 		t.textContent = "Solicitado";
// 		await loadPending();
// 	  } catch (e: any) {
// 		alert("❌ " + (e?.message || "Error enviando solicitud"));
// 	  } finally {
// 		t.removeAttribute("disabled");
// 	  }
// 	}
// 	if (t?.dataset?.accept) {
// 	  const id = Number(t.dataset.accept);
// 	  if (!Number.isFinite(id)) return;
// 	  try {
// 		t.setAttribute("disabled","true");
// 		await acceptFriendRequest(id);
// 		await Promise.all([loadPending(), loadFriends()]);
// 	  } catch (e: any) {
// 		alert("❌ " + (e?.message || "Error aceptando solicitud"));
// 	  } finally {
// 		t.removeAttribute("disabled");
// 	  }
// 	}
//   });

//   // Primera carga
//   await Promise.all([loadFriends(), loadPending()]).catch(()=>{});
// }

// document.addEventListener("DOMContentLoaded", init);
