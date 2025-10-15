import { initializeLanguages } from "./translate.js";
export async function mount(el, ctx) {
    // Inicializar el sistema de traducción primero
    await initializeLanguages();
    let isAuthed = false;
    try {
        const response = await ctx.api("/api/auth/me");
        isAuthed = !!(response && response.user);
    }
    catch (error) {
        isAuthed = false;
    }
    if (!isAuthed) {
        ctx.navigate("/login", { replace: true });
        return;
    }
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
		  <button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
		  <span class="mx-1 text-white/40">|</span>
		  <button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
		  <span class="mx-1 text-white/40">|</span>
		  <button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
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

  <main class="max-w-4xl mx-auto px-4 py-6">
	<!-- PROFILE HEADER -->
	<div class="glass rounded-2xl p-6 mb-6">
	  <div class="flex flex-col sm:flex-row items-center gap-6">
		<div class="relative flex-shrink-0">
		  <img id="avatar" class="w-20 h-20 rounded-full object-cover border-2 border-white/20" src="/default-avatar.png" alt="Avatar">
		  <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900"></div>
		</div>
		
		<div class="flex-1 text-center sm:text-left">
		  <h1 id="player-name" class="text-2xl font-bold mb-1">Mi perfil</h1>
		  <p id="player-email" class="text-white/60 text-sm mb-2">email@dominio.com</p>
		  <div class="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-white/50">
			<span>📅 Miembro desde <span id="member-since" class="text-white/70">—</span></span>
			<span>🎮 Nivel <span id="player-level" class="text-white/70">1</span></span>
		  </div>
		</div>
		
		<div class="flex gap-2">
		  <a href="/friends" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
			👥 Amigos
		  </a>
		  <a href="/chat" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors">
			💬 Chat
		  </a>
		</div>
	  </div>
	</div>

	<!-- QUICK STATS -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
	  <div class="glass rounded-lg p-3 text-center">
		<div class="text-xl font-bold text-blue-400" id="stat-total">0</div>
		<div class="text-xs text-white/60">Partidas</div>
	  </div>
	  <div class="glass rounded-lg p-3 text-center">
		<div class="text-xl font-bold text-green-400" id="stat-winrate">0%</div>
		<div class="text-xs text-white/60">Tasa Victoria</div>
	  </div>
	  <div class="glass rounded-lg p-3 text-center">
		<div class="text-xl font-bold text-yellow-400" id="stat-streak">0</div>
		<div class="text-xs text-white/60">Racha</div>
	  </div>
	  <div class="glass rounded-lg p-3 text-center">
		<div class="text-xl font-bold text-purple-400" id="stat-time">0 min</div>
		<div class="text-xs text-white/60">Tiempo</div>
	  </div>
	</div>

	<!-- DETAILED STATS -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
	  <div class="glass rounded-lg p-4">
		<h3 class="font-medium mb-3 text-center">📊 Estadísticas Generales</h3>
		<div class="space-y-2">
		  <div class="flex justify-between items-center py-1 border-b border-white/10">
			<span class="text-white/70 text-sm">Victorias</span>
			<span id="stat-wins" class="text-green-400 font-medium">0</span>
		  </div>
		  <div class="flex justify-between items-center py-1 border-b border-white/10">
			<span class="text-white/70 text-sm">Empates</span>
			<span id="stat-draws" class="text-yellow-400 font-medium">0</span>
		  </div>
		  <div class="flex justify-between items-center py-1 border-b border-white/10">
			<span class="text-white/70 text-sm">Derrotas</span>
			<span id="stat-losses" class="text-red-400 font-medium">0</span>
		  </div>
		  <div class="flex justify-between items-center py-1">
			<span class="text-white/70 text-sm">Ranking</span>
			<span id="player-rank" class="text-indigo-400 font-medium">#—</span>
		  </div>
		</div>
	  </div>
	  
	  <div class="glass rounded-lg p-4">
		<h3 class="font-medium mb-3 text-center">🎯 Por Juego</h3>
		<div class="grid grid-cols-2 gap-3">
		  <div class="text-center">
			<h4 class="text-blue-400 font-medium mb-2 text-sm">🏓 Pong</h4>
			<div class="space-y-1 text-xs">
			  <div class="flex justify-between">
				<span class="text-white/60">V:</span>
				<span id="pong-wins" class="text-green-400">0</span>
			  </div>
			  <div class="flex justify-between">
				<span class="text-white/60">E:</span>
				<span id="pong-draws" class="text-yellow-400">0</span>
			  </div>
			  <div class="flex justify-between">
				<span class="text-white/60">D:</span>
				<span id="pong-losses" class="text-red-400">0</span>
			  </div>
			</div>
		  </div>
		  
		  <div class="text-center">
			<h4 class="text-emerald-400 font-medium mb-2 text-sm">⭕ Tres en Raya</h4>
			<div class="space-y-1 text-xs">
			  <div class="flex justify-between">
				<span class="text-white/60">V:</span>
				<span id="ttt-wins" class="text-green-400">0</span>
			  </div>
			  <div class="flex justify-between">
				<span class="text-white/60">E:</span>
				<span id="ttt-draws" class="text-yellow-400">0</span>
			  </div>
			  <div class="flex justify-between">
				<span class="text-white/60">D:</span>
				<span id="ttt-losses" class="text-red-400">0</span>
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	</div>

	<!-- SETTINGS -->
	<div class="space-y-3">
	  <!-- Información personal -->
	  <details class="glass rounded-xl overflow-hidden">
		<summary class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
		  <div class="font-medium">📋 Información personal</div>
		  <svg class="chevron w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-4 pb-4 border-t border-white/10">
		  <div class="grid sm:grid-cols-2 gap-3 text-sm mt-3">
			<div class="flex justify-between"><span class="text-white/60">Nombre:</span><span id="ov-display" class="text-white/90">—</span></div>
			<div class="flex justify-between"><span class="text-white/60">Email:</span><span id="ov-email" class="text-white/90">—</span></div>
			<div class="flex justify-between"><span class="text-white/60">Nombre:</span><span id="ov-first" class="text-white/90">—</span></div>
			<div class="flex justify-between"><span class="text-white/60">Apellidos:</span><span id="ov-last" class="text-white/90">—</span></div>
			<div class="flex justify-between"><span class="text-white/60">Nacimiento:</span><span id="ov-birth" class="text-white/90">—</span></div>
			<div class="flex justify-between"><span class="text-white/60">Registro:</span><span id="ov-created" class="text-white/90">—</span></div>
		  </div>
		</div>
	  </details>

	  <!-- Editar perfil -->
	  <details class="glass rounded-xl overflow-hidden">
		<summary class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
		  <div class="font-medium">✏️ Editar perfil</div>
		  <svg class="chevron w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-4 pb-4 border-t border-white/10">
		  <form id="form-edit" class="grid sm:grid-cols-2 gap-3 mt-3">
			<input class="field p-2 rounded-lg text-sm" name="display_name" placeholder="Nombre público" />
			<input class="field p-2 rounded-lg text-sm" type="date" name="birthdate" />
			<input class="field p-2 rounded-lg text-sm" name="first_name" placeholder="Nombre" />
			<input class="field p-2 rounded-lg text-sm" name="last_name" placeholder="Apellidos" />
			<div class="sm:col-span-2 flex gap-2 items-center">
			  <button class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium">
				Guardar cambios
			  </button>
			  <span id="msg-edit" class="text-sm"></span>
			</div>
		  </form>
		</div>
	  </details>

	  <!-- Avatar -->
	  <details class="glass rounded-xl overflow-hidden">
		<summary class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
		  <div class="font-medium">🖼️ Cambiar avatar</div>
		  <svg class="chevron w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-4 pb-4 border-t border-white/10">
		  <form id="form-avatar" class="flex items-center gap-4 mt-3" enctype="multipart/form-data">
			<img id="preview-avatar" class="w-16 h-16 rounded-full object-cover border-2 border-white/20" src="/default-avatar.png" alt="Preview">
			<div class="flex-1">
			  <input class="field p-2 rounded-lg text-sm w-full mb-2" type="file" name="avatar" accept="image/*" id="avatar-file"/>
			  <div class="flex gap-2">
				<button class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm" type="submit">
				  Subir
				</button>
				<span id="msg-avatar" class="text-sm self-center"></span>
			  </div>
			</div>
		  </form>
		</div>
	  </details>

	  <!-- Cuenta -->
	  <details class="glass rounded-xl overflow-hidden">
		<summary class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5">
		  <div class="font-medium">⚙️ Configuración de cuenta</div>
		  <svg class="chevron w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
		  </svg>
		</summary>
		<div class="px-4 pb-4 border-t border-white/10">
		  <form id="form-email" class="flex gap-2 mt-3">
			<input class="field p-2 rounded-lg text-sm flex-1" type="email" name="email" placeholder="nuevo@email.com"/>
			<button class="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm">
			  Actualizar
			</button>
		  </form>
		  <p id="msg-email" class="text-sm mt-2"></p>
		  <div class="mt-4 pt-3 border-t border-white/10">
			<button id="btn-logout" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium">
			  🚪 Cerrar sesión
			</button>
		  </div>
		</div>
	  </details>
	</div>
  	</main>
  	`;
    const params = new URLSearchParams(location.search);
    const viewedId = Number(params.get("user")) || null;
    wireAccordion();
    wireUpdateForm(ctx, el);
    wireAvatarForm(ctx, el);
    wireEmailForm(ctx);
    el.querySelector("#btn-logout")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await ctx.api("/api/auth/logout", { method: "POST" });
        }
        finally {
            ctx.navigate("/", { replace: true });
        }
    });
    const meUser = await me(ctx);
    let viewedUser = meUser;
    if (viewedId && (!meUser || viewedId !== meUser.id)) {
        viewedUser = await fetchUserById(ctx, viewedId);
        if (!viewedUser) {
            $("#player-name").textContent = ctx.t("User_not_found");
        }
        else {
            paintUser(viewedUser);
        }
    }
    if (!viewedUser?.id)
        return;
    const isMe = !!meUser && viewedUser.id === meUser.id;
    if (!isMe) {
        $("#form-edit")?.closest("details")?.setAttribute("hidden", "true");
        $("#form-avatar")?.closest("details")?.setAttribute("hidden", "true");
        $("#form-email")?.closest("details")?.setAttribute("hidden", "true");
        document.querySelectorAll("#btn-logout").forEach(b => b.style.display = "none");
        const name = viewedUser.display_name || 'Perfil';
        const h1 = $("#player-name");
        if (h1)
            h1.textContent = name;
    }
    await loadMatchesAndStats(ctx, viewedUser.id);
    // Inicializar el sistema de traducción
    await initializeLanguages();
}
// ========= Utilidades =========
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
function escapeHTML(s = "") {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const fmtDate = (s) => (!s ? "—" : new Date(s).toLocaleString());
function normalizePath(p) {
    const clean = (p ?? "").replace(/["']/g, "").trim();
    // Mantengo tu default; cambia si usas otra ruta.
    return clean || "/files/default-avatar.png";
}
// ========= Estado =========
const state = {
    me: { id: null },
    matches: []
};
// ========= Charts eliminados =========
// ========= Pintado UI (soporta tus ids y los nuevos) =========
function paintUser(u) {
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
    const avatarImg = $("#avatar");
    const prevImg = $("#preview-avatar");
    if (avatarImg) {
        avatarImg.src = avUrl;
        avatarImg.onerror = () => (avatarImg.onerror = null, (avatarImg.src = "/default-avatar.png"));
    }
    if (prevImg)
        prevImg.src = avUrl;
    $("#player-name") && ($("#player-name").textContent = escapeHTML(u.display_name ?? "Jugador"));
    $("#player-email") && ($("#player-email").textContent = escapeHTML(u.email ?? "email@dominio.com"));
    $("#member-since") && ($("#member-since").textContent = fmtDate(u.created_at));
    $("#ov-display") && ($("#ov-display").textContent = u.display_name || "—");
    $("#ov-email") && ($("#ov-email").textContent = u.email || "—");
    $("#ov-first") && ($("#ov-first").textContent = u.first_name || "—");
    $("#ov-last") && ($("#ov-last").textContent = u.last_name || "—");
    $("#ov-birth") && ($("#ov-birth").textContent = u.birthdate || "—");
    $("#ov-created") && ($("#ov-created").textContent = fmtDate(u.created_at));
    $("#ov-updated") && ($("#ov-updated").textContent = fmtDate(u.updated_at));
}
function safeDetailsProfile(m) {
    try {
        return m.details ? JSON.parse(m.details) : null;
    }
    catch {
        return null;
    }
}
function isDrawProfile(m) {
    const d = safeDetailsProfile(m);
    return m.winner_id == null || d?.is_draw === true;
}
function gameOfProfile(m) {
    // Prefer explicit column, fallback to details JSON
    let raw = (m.game || "").toString().toLowerCase();
    if (!raw) {
        const d = safeDetailsProfile(m);
        raw = (d?.game || "").toString().toLowerCase();
    }
    if (raw.includes("tictactoe") || raw === "ttt")
        return "tictactoe";
    if (raw.includes("pong") || raw === "pong")
        return "pong";
    return "unknown";
}
// ========= Data =========
async function me(ctx) {
    try {
        const r = await ctx.api("/api/auth/me");
        const u = (r && (r.user ?? r)) || null;
        state.me = u;
        paintUser(u);
        return u;
    }
    catch {
        ctx.navigate("/login", { replace: true });
        return null;
    }
}
async function fetchUserById(ctx, id) {
    try {
        const r = await ctx.api(`/api/users/${id}`);
        return (r && (r.user ?? r)) || null;
    }
    catch {
        return null;
    }
}
async function loadMatchesAndStats(ctx, userId) {
    try {
        const r = await ctx.api(`/api/users/${userId}/matches`);
        state.matches = r?.matches ?? [];
    }
    catch {
        state.matches = [];
    }
    const myId = userId;
    const all = state.matches;
    // ---- GLOBAL ----
    let wins = 0, draws = 0, losses = 0;
    let totalMs = 0;
    // ---- POR JUEGO ----
    let winsPong = 0, drawsPong = 0, lossesPong = 0;
    let winsTTT = 0, drawsTTT = 0, lossesTTT = 0;
    let unknownGames = 0;
    for (const m of all) {
        const d = safeDetailsProfile(m);
        const g = gameOfProfile(m); // <- usa tu helper que ya tienes
        const isDraw = isDrawProfile(m);
        const iWon = !isDraw && m.winner_id === myId;
        // global
        if (isDraw)
            draws++;
        else if (iWon)
            wins++;
        else
            losses++;
        totalMs += Number(d?.duration_ms) || 0;
        // por juego
        if (g === "pong") {
            if (isDraw)
                drawsPong++;
            else if (iWon)
                winsPong++;
            else
                lossesPong++;
        }
        else if (g === "tictactoe") {
            if (isDraw)
                drawsTTT++;
            else if (iWon)
                winsTTT++;
            else
                lossesTTT++;
        }
        else {
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
        if (!isDrawProfile(m) && m.winner_id === myId)
            streak++;
        else
            break;
    }
    // pintar tarjetas principales
    $("#stat-wins").textContent = String(wins);
    $("#stat-draws").textContent = String(draws);
    $("#stat-losses").textContent = String(losses);
    $("#stat-total").textContent = String(total);
    $("#stat-winrate").textContent = `${winrate}%`;
    $("#stat-streak").textContent = String(streak);
    const mins = totalMs ? Math.max(1, Math.round(totalMs / 60000)) : 0;
    $("#stat-time").textContent = total ? (mins ? `${mins} min` : `${total * 5} min`) : "0 min";
    // pintar estadísticas por juego
    $("#pong-wins").textContent = String(winsPong);
    $("#pong-draws").textContent = String(drawsPong);
    $("#pong-losses").textContent = String(lossesPong);
    $("#ttt-wins").textContent = String(winsTTT);
    $("#ttt-draws").textContent = String(drawsTTT);
    $("#ttt-losses").textContent = String(lossesTTT);
    // calcular nivel basado en partidas jugadas
    const level = Math.floor(total / 10) + 1;
    $("#player-level").textContent = String(level);
    // calcular ranking aproximado (simulado)
    const rank = Math.max(1, 1000 - (wins * 10) - (total * 2));
    $("#player-rank").textContent = `#${rank}`;
    // Los gráficos han sido eliminados del diseño
    // Debug info for development only
    // if (unknownGames && process.env.NODE_ENV === 'development') {
    // 	console.warn(`[profile] Partidas sin juego reconocido: ${unknownGames}`);
    // }
}
// ========= Formularios/acciones =========
function wireUpdateForm(ctx, el) {
    const form = el.querySelector("#form-edit");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(form).entries());
        const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => String(v ?? "").trim() !== ""));
        const msg = el.querySelector("#msg-edit");
        try {
            await ctx.api("/api/users/me", {
                method: "PUT",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" }
            });
            if (msg)
                msg.textContent = "✅ Perfil actualizado";
            await me(ctx);
        }
        catch (err) {
            if (msg)
                msg.textContent = `❌ ${err?.message || "Error actualizando perfil"}`;
        }
    });
}
function wireAvatarForm(ctx, el) {
    const form = el.querySelector("#form-avatar");
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
            if (!res.ok)
                throw 0;
            if (msg)
                msg.textContent = "✅ Avatar actualizado";
            await me(ctx);
        }
        catch {
            if (msg)
                msg.textContent = "❌ Error subiendo avatar";
        }
    });
    el.addEventListener("change", (ev) => {
        const t = ev.target;
        if (t?.id === "avatar-file" && t.files?.[0]) {
            const prev = el.querySelector("#preview-avatar");
            if (prev)
                prev.src = URL.createObjectURL(t.files[0]);
        }
    });
}
function wireEmailForm(ctx) {
    const form = document.querySelector("#form-email");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(form).entries());
        const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => String(v ?? "").trim() !== ""));
        const msg = document.querySelector("#msg-email");
        try {
            await ctx.api("/api/users/me", {
                method: "PUT",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" }
            });
            if (msg)
                msg.textContent = "✅ Email actualizado";
            await me(ctx);
        }
        catch (err) {
            if (msg)
                msg.textContent = `❌ ${err?.message || "Error actualizando email"}`;
        }
    });
}
// ========= Acordeón (uno abierto) =========
function wireAccordion() {
    $$(".glass[open], details.glass").forEach(d => {
        d.addEventListener("toggle", () => {
            if (d.open)
                $$(".glass[open], details.glass").forEach(o => { if (o !== d && o.open)
                    o.open = false; });
        });
    });
}
