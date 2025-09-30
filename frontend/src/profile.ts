import type { Ctx } from "./router.js";

export async function mount(el: HTMLElement, ctx: Ctx) {

	document.body.className = "min-h-screen bg-black text-white";

	el.innerHTML = `
	<header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
	<div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
	  <a href="/home" class="flex items-center gap-2">
		<div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
		<span class="font-semibold">ft_transcendence</span>
	  </a>

	  <nav class="hidden sm:flex items-center gap-4 text-sm">
		<a href="/home" class="opacity-80 hover:opacity-100" data-translate="action-back">Volver</a>
		<a href="/friends" class="opacity-80 hover:opacity-100" data-translate="home.cards.friends.title">Amigos</a>
	  </nav>

	  <div class="flex items-center gap-3">
		<!-- Selector idioma -->
		<div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-xs backdrop-blur">
		  <button class="hover:underline" onclick="changeLanguage?.('en')">EN</button>
		  <span class="mx-1 text-white/40">|</span>
		  <button class="hover:underline" onclick="changeLanguage?.('es')">ES</button>
		  <span class="mx-1 text-white/40">|</span>
		  <button class="hover:underline" onclick="changeLanguage?.('fr')">FR</button>
		</div>
		<!-- Logout (lo engancha profile.ts por id) -->
		<button id="btn-logout"
		  class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg text-xs"
		  data-translate="home.logout">
		  Cerrar sesión
		</button>
	  </div>
	</div>
  </header>

  <!-- Glows -->
  <div class="pointer-events-none fixed -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-3xl"></div>
  <div class="pointer-events-none fixed -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl"></div>

  <main class="max-w-6xl mx-auto px-4 py-8">
	<!-- HERO -->
	<section class="relative overflow-hidden rounded-2xl">
	  <div class="h-40 sm:h-52 bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400"></div>
	  <div class="glass rounded-2xl -mt-16 sm:-mt-20 px-4 sm:px-8 pt-20 pb-6">
		<div class="flex flex-col sm:flex-row sm:items-end gap-6">
		  <div class="-mt-24 sm:-mt-28">
			<img id="avatar" class="avatar-xl ring-neon" src="/default-avatar.png" alt="Avatar">
		  </div>
		  <div class="flex-1">
			<h1 id="player-name" class="text-3xl md:text-4xl font-extrabold tracking-tight" data-translate="Profile-text">Mi perfil</h1>
			<p id="player-email" class="opacity-80 mt-1">email@dominio.com</p>
			<div class="mt-3.5 flex flex-wrap items-center gap-3">
			  <span class="badge"><span data-translate="profile.memberSince">Miembro desde</span> <span id="member-since">—</span></span>
			</div>
		  </div>
		  <!-- Compact stats -->
		  <div class="grid grid-cols-3 gap-2 self-start sm:self-auto">
			<div class="glass rounded-2xl text-center stat-card">
			  <div id="stat-wins" class="stat-num">0</div>
			  <div class="stat-lbl" data-translate="profile.wins">Victorias</div>
			</div>
			<div class="glass rounded-2xl text-center stat-card">
			  <div id="stat-draws" class="stat-num">0</div>
			  <div class="stat-lbl" data-translate="profile.draws">Empates</div>
			</div>
			<div class="glass rounded-2xl text-center stat-card">
			  <div id="stat-losses" class="stat-num">0</div>
			  <div class="stat-lbl" data-translate="profile.losses">Derrotas</div>
			</div>
		  </div>
		</div>

		<!-- Quick actions -->
		<div class="mt-5 flex flex-wrap gap-2 justify-end">
		  <a href="/home" class="badge hover:bg-white/10" data-translate="action-back">← Volver</a>
		  <a href="/friends" class="badge hover:bg-white/10">👥 <span data-translate="home.cards.friends.title">Amigos</span></a>
		</div>
	  </div>
	</section>

	<!-- SUMMARY STRIP -->
	<section class="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
	  <div class="glass rounded-2xl p-4 text-center">
		<div class="text-sm opacity-70" data-translate="profile.matches">Partidas</div>
		<div id="stat-total" class="text-2xl font-bold">0</div>
	  </div>
	  <div class="glass rounded-2xl p-4 text-center">
		<div class="text-sm opacity-70" data-translate="profile.winrate">Winrate</div>
		<div id="stat-winrate" class="text-2xl font-bold">0%</div>
	  </div>
	  <div class="glass rounded-2xl p-4 text-center">
		<div class="text-sm opacity-70" data-translate="profile.streak">Racha</div>
		<div id="stat-streak" class="text-2xl font-bold">0</div>
	  </div>
	  <div class="glass rounded-2xl p-4 text-center">
		<div class="text-sm opacity-70" data-translate="profile.timePlayed">Tiempo jugado</div>
		<div id="stat-time" class="text-2xl font-bold">—</div>
	  </div>
	</section>

	<!-- CHARTS -->
	<section class="mt-6 grid-card">
	  <div class="glass rounded-2xl p-5">
		<h2 class="text-lg font-semibold mb-3">Distribución (Pong)</h2>
		<canvas id="chart-pie-pong" height="220"></canvas>
	  </div>
	  <div class="glass rounded-2xl p-5">
		<h2 class="text-lg font-semibold mb-3"> Distribución (Tres en raya)</h2>
		<canvas id="chart-pie-ttt" height="220"></canvas>
	  </div>	
	</section>

	<!-- ACCORDION -->
	<section class="space-y-4 mt-6">
	  <!-- Información personal -->
	  <details class="glass rounded-2xl overflow-hidden">
		<summary class="px-6 py-4 flex items-center justify-between">
		  <div class="text-lg font-semibold" data-translate="profile.personalInfo">Información personal</div>
		  <svg class="chevron size-10 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-6 pb-6 border-t border-white/10">
		  <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
			<div><dt class="opacity-70" data-translate="field-display_name">Nombre público</dt><dd id="ov-display" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="field-email">Email</dt><dd id="ov-email" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="field-first_name">Nombre</dt><dd id="ov-first" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="field-last_name">Apellidos</dt><dd id="ov-last" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="field-birthdate">Fecha de nacimiento</dt><dd id="ov-birth" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="profile.memberSince">Miembro desde</dt><dd id="ov-created" class="font-medium">—</dd></div>
			<div><dt class="opacity-70" data-translate="profile.updated">Actualizado</dt><dd id="ov-updated" class="font-medium">—</dd></div>
		  </dl>
		</div>
	  </details>

	  <!-- Editar perfil -->
	  <details class="glass rounded-2xl overflow-hidden">
		<summary class="px-6 py-4 flex items-center justify-between">
		  <div class="text-lg font-semibold" data-translate="home.editProfile">Editar perfil</div>
		  <svg class="chevron size-10 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-6 pb-6 border-t border-white/10">
		  <form id="form-edit" class="grid md:grid-cols-2 gap-4 max-w-3xl">
			<label class="grid gap-1">
			  <span class="text-sm opacity-80" data-translate="field-display_name">Nombre público</span>
			  <input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
					 name="display_name" required data-translate-placeholder="username-placeholder" placeholder="Tu nick"/>
			</label>
			<label class="grid gap-1">
			  <span class="text-sm opacity-80" data-translate="field-birthdate">Fecha de nacimiento</span>
			  <input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
					 type="date" name="birthdate" data-translate-placeholder="bithdate-placeholder"/>
			</label>
			<label class="grid gap-1">
			  <span class="text-sm opacity-80" data-translate="field-first_name">Nombre</span>
			  <input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
					 name="first_name" data-translate-placeholder="name-placeholder" placeholder="Nombre"/>
			</label>
			<label class="grid gap-1">
			  <span class="text-sm opacity-80" data-translate="field-last_name">Apellidos</span>
			  <input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
					 name="last_name" data-translate-placeholder="last_name-placeholder" placeholder="Apellidos"/>
			</label>
			<div class="md:col-span-2 flex gap-2">
			  <button class="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-5 py-2 rounded-xl font-semibold"
					  data-translate="submit">Guardar cambios</button>
			  <span id="msg-edit" class="text-sm min-h-[1.25rem] self-center"></span>
			</div>
		  </form>
		</div>
	  </details>

	  <!-- Avatar -->
	  <details class="glass rounded-2xl overflow-hidden">
		<summary class="px-6 py-4 flex items-center justify-between">
		  <div class="text-lg font-semibold" data-translate="profile.avatar">Avatar</div>
		  <svg class="chevron size-10 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-6 pb-6 border-t border-white/10">
		  <form id="form-avatar" class="grid gap-4 md:grid-cols-[auto,1fr] items-center max-w-3xl" enctype="multipart/form-data">
			<img id="preview-avatar" class="avatar-xl ring-neon" src="/default-avatar.png" alt="Previsualización">
			<div class="grid gap-3">
			  <input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
					 type="file" name="avatar" accept="image/*" id="avatar-file"/>
			  <div class="flex gap-2">
				<label for="avatar-file" class="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-semibold cursor-pointer"
					   data-translate="profile.chooseFile">Elegir archivo</label>
				<button class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-semibold" type="submit"
						data-translate="upload-avatar">Subir</button>
			  </div>
			  <p id="msg-avatar" class="text-sm min-h-[1.25rem]"></p>
			</div>
		  	</form>
		</div>
	  	</details>

	  <!-- Cuenta -->
	  	<details class="glass rounded-2xl overflow-hidden">
		<summary class="px-6 py-4 flex items-center justify-between">
		  	<div class="text-lg font-semibold" data-translate="profile.account">Cuenta</div>
		  	<svg class="chevron size-10 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  	</svg>
		</summary>
		<div class="px-6 pb-6 border-t border-white/10">
		  	<form id="form-email" class="grid md:grid-cols-[1fr_auto] gap-3 max-w-md">
				<input class="field p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
				   type="email" name="email"
				   data-translate-placeholder="email-placeholder" placeholder="tu@email.com"/>
				<button class="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-semibold"
					data-translate="profile.updateEmail">Actualizar email</button>
				<p id="msg-email" class="text-sm md:col-span-2"></p>
		  	</form>
		  	<div class="mt-4">
				<button id="btn-logout" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-semibold"
					data-translate="home.logout">Cerrar sesión</button>
			</div>
		</div>
	  	</details>
		</section>
  	</main>
  	`;

	const params = new URLSearchParams(location.search);
	const viewedId = Number(params.get("user")) || null;

  	wireAccordion();
	wireUpdateForm(ctx, el);
	wireAvatarForm(ctx, el);
	wireEmailForm(ctx);
	
	el.querySelector<HTMLElement>("#btn-logout")?.addEventListener("click", async (e) => {
		e.preventDefault();
		try {
			await ctx.api("/api/auth/logout", { method: "POST"});
		} finally {
			ctx.navigate("/", { replace : true });
		}
  	});

	await ensureChartsJs();

	const meUser = await me(ctx);
	let viewedUser: Me | null = meUser;

	if (viewedId && (!meUser || viewedId !== meUser.id)) {
		viewedUser = await fetchUserById(ctx, viewedId);
		if (!viewedUser) {
			$("#player-name")!.textContent = ctx.t("User_not_found");
		} else {
			paintUser(viewedUser);
		}
	}

	if (!viewedUser?.id) return;

	const isMe = !!meUser && viewedUser.id === meUser.id;
	if (!isMe) {
		$("#form-edit")?.closest("details")?.setAttribute("hidden", "true");
		$("#form-avatar")?.closest("details")?.setAttribute("hidden", "true");
		$("#form-email")?.closest("details")?.setAttribute("hidden", "true");

		document.querySelectorAll<HTMLElement>("#btn-logout").forEach(b => b.style.display = "none");

		const name = viewedUser.display_name || 'Perfil';
		const h1 = $("#player-name");
		if (h1) h1.textContent = name;
	}

	await loadMatchesAndStats(ctx, viewedUser.id!);
}

async function ensureChartsJs() {
	if ((window as any).Chart) return;
	await new Promise<void>((resolve, reject) => {
		const s = document.createElement("script");
		s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.4";
		s.async = true;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error("No se pudo cargar chart.js"));
		document.head.appendChild(s);
	});
}

// ========= Utilidades =========
const $ = <T extends HTMLElement = HTMLElement>(s: string, p: Document | HTMLElement = document) =>
	p.querySelector(s) as T | null;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, p: Document | HTMLElement = document) =>
	Array.from(p.querySelectorAll(s)) as T[];

function escapeHTML(s: string = ""): string {
	return s.replace(/[&<>"']/g, c =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c as "&" | "<" | ">" | '"' | "'"]!)
	);
}
const fmtDate = (s?: string | null) => (!s ? "—" : new Date(s).toLocaleString());

function normalizePath(p?: string | null) {
	const clean = (p ?? "").replace(/["']/g, "").trim();
	// Mantengo tu default; cambia si usas otra ruta.
	return clean || "/files/default-avatar.png";
}

// ========= Tipos =========
interface Me {
	id: number | null;
	display_name?: string;
	email?: string;
	avatar_path?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	first_name?: string;
	last_name?: string;
	birthdate?: string;
}
interface Match { winner_id?: number | null; is_draw?: boolean; played_at?: string; game?: string; details?: string | null }

// ========= Estado =========
const state: { me: Me; matches: Match[] } = {
	me: { id: null },
	matches: []
};

// ========= Charts (CDN) =========
declare const Chart: any;
let piePong: any, pieTTT: any;

function renderCharts({ pong, ttt }: {
	pong: { wins: number; draws: number; losses: number };
	ttt: { wins: number; draws: number; losses: number };
}) {
	const ctxPiePong = document.getElementById("chart-pie-pong") as HTMLCanvasElement | null;
	const ctxPieTTT = document.getElementById("chart-pie-ttt") as HTMLCanvasElement | null;
	if (!ctxPiePong || !ctxPieTTT || typeof Chart === "undefined") return;

	piePong?.destroy();
	pieTTT?.destroy();

	const commonOpts = { plugins: { legend: { labels: { colors: "#D4D4D8" } } }, cutout: "60%" };
	const commonData = (w: number, d: number, l: number) => ({
		labels: ["Victorias", "Empates", "Derrotas"],
		datasets: [{ data: [w, d, l], backgrounColor: ["#6071d0ff", "#e38f11ff", "#ef4444"], borderWith: 0 }]
	});
	
	piePong = new Chart(ctxPiePong, { type: "doughnut", data: commonData(pong.wins, pong.draws, pong.losses), options: commonOpts });
	pieTTT = new Chart(ctxPieTTT, { type: "doughnut", data: commonData(ttt.wins, ttt.draws, ttt.losses), options: commonOpts});
}

// ========= Pintado UI (soporta tus ids y los nuevos) =========
function paintUser(u: Me) {
	// TU BLOQUE ANTIGUO (si existe #info)
	const info = $("#info");
	if (info) {
		const avatar = normalizePath(u?.avatar_path);
		info.innerHTML = `
			<img class="avatar" src="${avatar}" width="72" height="72" alt="Avatar"
				onerror="this.onerror=null; this.src='/default-avatar.png'">
			<div>
				<div class="font-bold">${escapeHTML(u.display_name || "")}</div>
				<div class="opacity-80 text-sm">${escapeHTML(u.email || "")}</div>
			</div>`;
	}

	// NUEVOS IDS (si existen)
	const avUrl = normalizePath(u?.avatar_path);
	const avatarImg = $("#avatar") as HTMLImageElement | null;
	const prevImg = $("#preview-avatar") as HTMLImageElement | null;
	if (avatarImg) {
		avatarImg.src = avUrl;
		avatarImg.onerror = () => ((avatarImg.onerror as any) = null, (avatarImg.src = "/default-avatar.png"));
	}
	if (prevImg) prevImg.src = avUrl;

	$("#player-name") && ($("#player-name")!.textContent = escapeHTML(u.display_name ?? "Jugador"));
	$("#player-email") && ($("#player-email")!.textContent = escapeHTML(u.email ?? "email@dominio.com"));
	$("#member-since") && ($("#member-since")!.textContent = fmtDate(u.created_at));

	$("#ov-display") && ($("#ov-display")!.textContent = u.display_name || "—");
	$("#ov-email") && ($("#ov-email")!.textContent = u.email || "—");
	$("#ov-first") && ($("#ov-first")!.textContent = u.first_name || "—");
	$("#ov-last") && ($("#ov-last")!.textContent = u.last_name || "—");
	$("#ov-birth") && ($("#ov-birth")!.textContent = u.birthdate || "—");
	$("#ov-created") && ($("#ov-created")!.textContent = fmtDate(u.created_at));
	$("#ov-updated") && ($("#ov-updated")!.textContent = fmtDate(u.updated_at));
}


function safeDetailsProfile(m: { details?: string | null }): any | null {
	try { return m.details ? JSON.parse(m.details) : null; } catch { return null; }
}

function isDrawProfile(m: { winner_id?: number | null; details?: string | null }): boolean {
	const d = safeDetailsProfile(m);
	return m.winner_id == null || d?.is_draw === true;
}

function gameOfProfile(m: { game?: string; details?: string | null }): "pong" | "tictactoe" | "unknown" {
	// Prefer explicit column, fallback to details JSON
	let raw = (m.game || "").toString().toLowerCase();
	if (!raw) {
		const d = safeDetailsProfile(m);
		raw = (d?.game || "").toString().toLowerCase();
	}
	if (raw.includes("tictactoe") || raw === "ttt") return "tictactoe";
	if (raw.includes("pong") || raw === "pong") return "pong";
	return "unknown";
}

// ========= Data =========
async function me(ctx: Ctx): Promise<Me | null> {
	try {
		const r = await ctx.api("/api/auth/me");
		const u: Me = (r && (r.user ?? r)) || null;
		state.me = u!;
		paintUser(u!);
		return u;
	} catch {
		ctx.navigate("/login", { replace: true});
		return null;
	}
}

async function fetchUserById(ctx: Ctx, id: number): Promise<Me | null> {
	try {
		const r = await ctx.api(`/api/users/${id}`);
		return (r && (r.user ?? r)) || null;
	} catch {
		return null;
	}
}

async function loadMatchesAndStats(ctx: Ctx, userId: number) {
  try {
    const r = await ctx.api(`/api/users/${userId}/matches`);
    state.matches = r?.matches ?? [];
  } catch {
    state.matches = [];
  }

  const myId = userId;
  type M = { winner_id?: number | null; played_at?: string | null; details?: string | null };
  const all: M[] = state.matches;

  // ---- GLOBAL ----
  let wins = 0, draws = 0, losses = 0;
  let totalMs = 0;

  // ---- POR JUEGO ----
  let winsPong = 0, drawsPong = 0, lossesPong = 0;
  let winsTTT  = 0, drawsTTT  = 0, lossesTTT  = 0;

	let unknownGames = 0;
	for (const m of all) {
    const d = safeDetailsProfile(m);
    const g = gameOfProfile(m);              // <- usa tu helper que ya tienes
    const isDraw = isDrawProfile(m);
    const iWon   = !isDraw && m.winner_id === myId;

    // global
    if (isDraw) draws++; else if (iWon) wins++; else losses++;
    totalMs += Number(d?.duration_ms) || 0;

    // por juego
		if (g === "pong") {
      if (isDraw) drawsPong++; else if (iWon) winsPong++; else lossesPong++;
    } else if (g === "tictactoe") {
      if (isDraw) drawsTTT++; else if (iWon) winsTTT++; else lossesTTT++;
		} else {
			unknownGames++;
    }
  }

  // métricas globales
  const total = wins + draws + losses;
  const winrate = total ? Math.round((wins / total) * 100) : 0;

  // racha global (ordenado por fecha desc)
  const byDateDesc = [...all].sort((a, b) => {
    const ta = a.played_at ? Date.parse(a.played_at) : 0;
    const tb = b.played_at ? Date.parse(b.played_at) : 0;
    return tb - ta;
  });
  let streak = 0;
  for (const m of byDateDesc) {
    if (!isDrawProfile(m) && m.winner_id === myId) streak++;
    else break;
  }

  // pintar tarjetas
  $("#stat-wins")!.textContent    = String(wins);
  $("#stat-draws")!.textContent   = String(draws);
  $("#stat-losses")!.textContent  = String(losses);
  $("#stat-total")!.textContent   = String(total);
  $("#stat-winrate")!.textContent = `${winrate}%`;
  $("#stat-streak")!.textContent  = String(streak);

  const mins = totalMs ? Math.max(1, Math.round(totalMs / 60000)) : 0;
  $("#stat-time")!.textContent = total ? (mins ? `${mins} min` : `${total * 5} min`) : "-";

  // donuts por juego
	renderCharts({
    pong: { wins: winsPong, draws: drawsPong, losses: lossesPong },
    ttt:  { wins: winsTTT,  draws: drawsTTT,  losses: lossesTTT  }
  });

	// Debug visible en consola si hay partidas sin clasificar
	if (unknownGames) {
		console.warn(`[profile] Partidas sin juego reconocido: ${unknownGames}`);
	}
}


// ========= Formularios/acciones =========
function wireUpdateForm(ctx: Ctx, el: HTMLElement) {
	const form = el.querySelector<HTMLFormElement>("#form-edit");
	form?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const raw = Object.fromEntries(new FormData(form).entries());

		const data = Object.fromEntries(
			Object.entries(raw).filter(([, v]) => String(v ?? "").trim() !== "")
		);
		const msg = el.querySelector("#msg-edit");
		try {
			await ctx.api("/api/users/me", {
				method: "PUT",
				body: JSON.stringify(data),
				headers: { "Content-Type": "application/json"}
			});
			if (msg) msg.textContent = "✅ Perfil actualizado";
			await me(ctx);
		} catch (err: any) {
			if (msg) msg.textContent = `❌ ${err?.message || "Error actualizando perfil"}`;
		}
	});
}

function wireAvatarForm(ctx: Ctx, el: HTMLElement) {
	const form = el.querySelector<HTMLFormElement>("#form-avatar");
	form?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const fd = new FormData(form);
		const msg = el.querySelector("#msg-avatar");
		try {
			const res = await fetch("/api/users/me/avatar", {
				method: "POST",
				body: fd,
				credentials: "include"
			});
			if (!res.ok) throw 0;
			if (msg) msg.textContent = "✅ Avatar actualizado";
			await me(ctx);
		} catch {
			if (msg) msg.textContent = "❌ Error subiendo avatar";
		}
	});
	el.addEventListener("change", (ev) => {
		const t = ev.target as HTMLInputElement | null;
		if (t?.id === "avatar-file" && t.files?.[0]) {
			const prev = el.querySelector<HTMLImageElement>("#preview-avatar");
			if (prev) prev.src = URL.createObjectURL(t.files[0]);
		}
	});
}

function wireEmailForm(ctx: Ctx) {
	const form = document.querySelector<HTMLFormElement>("#form-email");
	form?.addEventListener("submit", async e => {
		e.preventDefault();
		const raw = Object.fromEntries(new FormData(form).entries());
		const data = Object.fromEntries(
			Object.entries(raw).filter(([, v]) => String(v ?? "").trim() !== "")
		);
		const msg = document.querySelector("#msg-email");
		try {
			await ctx.api("/api/users/me", {
				method: "PUT",
				body: JSON.stringify(data),
				headers: { "Content-Type": "application/json"}
			});
			if (msg) msg.textContent = "✅ Email actualizado";
			await me(ctx);
		} catch (err: any) {
			if (msg) msg.textContent = `❌ ${err?.message || "Error actualizando email"}`;
		}
	});
}
// ========= Acordeón (uno abierto) =========
function wireAccordion() {
	$$<HTMLDetailsElement>(".glass[open], details.glass").forEach(d => {
		d.addEventListener("toggle", () => {
			if (d.open) $$<HTMLDetailsElement>(".glass[open], details.glass").forEach(o => { if (o !== d && o.open) o.open = false; });
		});
	});
}

export {};
