// ==== Helper fecha ====
const fmtDateTime = (s) => (!s ? "—" : new Date(s).toLocaleString());
// ==== Componente de página ====
export async function mount(el, ctx) {
    // -------- Markup (adaptado de tu home.html; rutas SPA sin .html) --------
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
					${ctx.t("home.logout") ?? "Cerrar sesión"}
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-5xl mx-auto px-4 py-8 space-y-8">
		<!-- User card -->
		<section class="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
			<div class="flex items-center gap-4">
				<img id="userAvatar" src="/uploads/default-avatar.png" alt="Avatar" class="w-14 h-14 rounded-full object-cover"/>
				<div class="flex-1">
					<div id="userName" class="text-lg font-semibold">—</div>
					<div id="userEmail" class="text-sm text-white/60">—</div>
				</div>
				<a href="/profile"
					 class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
					 data-translate="home.editProfile">
					${ctx.t("home.editProfile") ?? "Editar perfil"}
				</a>
			</div>
		</section>

		<!-- Quick actions -->
		<section>
			<h2 class="text-sm uppercase tracking-widest text-white/60 mb-3" data-translate="home.quickActions">
				${ctx.t("home.quickActions") ?? "Acciones rápidas"}
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

				<a href="/friends"
					 class="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5 flex flex-col gap-2">
					<div class="text-2xl">👥</div>
					<div class="font-semibold" data-translate="home.cards.friends.title">${ctx.t("home.cards.friends.title") ?? "Amigos"}</div>
					<div class="text-sm text-white/60" data-translate="home.cards.friends.desc">${ctx.t("home.cards.friends.desc") ?? "Solicitudes y lista"}</div>
					<span id="friendsCount" class="mt-1 inline-flex w-fit text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">—</span>
				</a>

				<a href="/tictactoe"
					class="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5 flex flex-col gap-2">
					<div class="text-2xl">❌⭘</div>
					<div class="font-semibold" data-translate="play_ttt">${ctx.t("play_ttt") ?? "Jugar tres en raya"}</div>
					<div class="text-sm text-white/60">${ctx.t("home.cards.pvp.desc") ?? "Local en el navegador"}</div>
				</a>

				<a id="playAI" href="/pong?mode=ai"
					class="group game-link rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5 flex flex-col gap-2">
					<div class="text-2xl">🤖</div>
					<div class="font-semibold" data-translate="play_ai">${ctx.t("play_ai") ?? "Jugar vs IA"}</div>
					<div class="text-sm text-white/60" data-translate="select_difficulty">${ctx.t("select_difficulty") ?? "Elige dificultad"}</div>
				</a>

				<a id="playPvp" href="/pong?mode=pvp"
					class="group game-link rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5 flex flex-col gap-2">
					<div class="text-2xl">🎮</div>
					<div class="font-semibold" data-translate="play_1v1">${ctx.t("play_1v1") ?? "Jugar 1v1"}</div>
					<div class="text-sm text-white/60" data-translate="home.cards.pvp.desc">${ctx.t("home.cards.pvp.desc") ?? "Local en el navegador"}</div>
				</a>
			</div>
		</section>

		<!-- Recent matches -->
		<section class="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-lg font-semibold" data-translate="home.recentMatches">${ctx.t("home.recentMatches") ?? "Últimos partidos"}</h2>
				<a href="/matches" class="text-sm text-indigo-300 hover:text-indigo-200 underline" data-translate="home.viewAll">
					${ctx.t("home.viewAll") ?? "Ver todos"}
				</a>
			</div>
			<div id="matches" class="text-sm text-white/60">—</div>
		</section>
	</main>
	`;
    // ---- Helpers locales (scoped al contenedor de la página) ----
    const $ = (sel) => el.querySelector(sel);
    async function apiFetch(url, init) {
        // Usa el api del contexto (ya mete credentials y parsea JSON en tu main)
        const data = await ctx.api(url, init);
        return data;
    }
    function escapeHtml(s = "") {
        return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    async function loadUser() {
        try {
            const j = await apiFetch("/api/auth/me");
            const u = j.user || {};
            const avatar = u.avatar_path || "/uploads/default-avatar.png";
            $("#userAvatar")?.setAttribute("src", avatar);
            $("#userName").textContent = u.display_name || "-";
            $("#userEmail").textContent = u.email || "-";
        }
        catch {
            ctx.navigate("/login", { replace: true });
        }
    }
    async function loadFriendsCount() {
        try {
            const { friends } = await apiFetch("/api/friends");
            const count = Array.isArray(friends) ? friends.length : 0;
            const badge = $("#friendsCount");
            const word = count === 1 ? ctx.t("friends.badge.one") : ctx.t("friends.badge.other");
            if (badge)
                badge.textContent = `${count} ${word}`;
        }
        catch { }
    }
    // ---- Recent matches (adaptado de tu código) ----
    function safeDetails(m) {
        try {
            return m.details ? JSON.parse(m.details) : null;
        }
        catch {
            return null;
        }
    }
    function is_draw(m) {
        const d = safeDetails(m);
        return m.winner_id == null || d?.is_draw === true;
    }
    function resultFor(meId, m) {
        if (is_draw(m))
            return "D";
        return m.winner_id === meId ? "W" : "L";
    }
    function perspectiveScore(m, myId) {
        const d = safeDetails(m);
        if (!d?.score && !Number.isFinite(d?.score_user))
            return null;
        if (Number.isFinite(d?.score_left) && Number.isFinite(d?.score_right)) {
            const leftId = d?.players?.left_id;
            if (leftId === myId)
                return { you: d.score_left, rival: d.score_right };
            if (leftId != null)
                return { you: d.score_right, rival: d.score_left };
        }
        if (Number.isFinite(d?.score_user) && Number.isFinite(d?.score_ai)) {
            return { you: d.score_user, rival: d.score_ai };
        }
        return null;
    }
    async function getUserName(userId) {
        if (!userId || userId <= 0)
            return ctx.t("AI");
        try {
            const { user } = await apiFetch(`/api/users/${userId}`);
            return user?.display_name || `Usuario #${userId}`;
        }
        catch {
            return `Usuario #${userId}`;
        }
    }
    async function loadRecentMatches(limit = 5) {
        const box = $("#matches");
        if (!box)
            return;
        box.textContent = "Cargando…";
        try {
            const me = await apiFetch("/api/auth/me");
            const myId = me.user.id;
            const r = await apiFetch("/api/users/me/matches");
            const list = (r.matches || []).slice(0, limit);
            if (list.length === 0) {
                box.innerHTML = `<div class="text-white/50">Aún no hay partidas</div>`;
                return;
            }
            const namesCache = new Map();
            async function opponentName(m) {
                const opp = m.player1_id === myId ? m.player2_id : m.player1_id;
                if (namesCache.has(opp))
                    return namesCache.get(opp);
                const name = await getUserName(opp);
                namesCache.set(opp, name);
                return name;
            }
            const rows = await Promise.all(list.map(async (m) => {
                const res = resultFor(myId, m);
                const opp = await opponentName(m);
                const sc = perspectiveScore(m, myId);
                const score = sc ? ` · ${sc.you} - ${sc.rival}` : "";
                const when = fmtDateTime(m.played_at);
                const badgeClass = res === "W" ? "bg-emerald-600/70" :
                    res === "L" ? "bg-rose-600/70" :
                        "bg-zinc-600/70";
                const label = res === "W" ? ctx.t("win") :
                    res === "L" ? ctx.t("lose") :
                        ctx.t("draw");
                return `
						<li class="flex items-center justify-between py-1.5">
							<div class="min-w-0">
								<div class="text-white truncate">${opp}<span class="opacity-60">${score}</span></div>
								<div class="text-xs text-white/50">${when}</div>
							</div>
							<span class="ml-3 inline-flex text-xs px-2 py-0.5 rounded ${badgeClass}">${label}</span>
						</li>`;
            }));
            box.innerHTML = `<ul class="divide-y divide-white/10">${rows.join("")}</ul>`;
        }
        catch {
            box.innerHTML = `<div class="text-rose-400 text-sm">No se pudieron cargar las partidas.</div>`;
        }
    }
    // ---- Logout ----
    $("#logoutBtn")?.addEventListener("click", async () => {
        try {
            await ctx.api("/api/auth/logout", { method: "POST" });
        }
        finally {
            ctx.navigate("/");
        }
    });
    // ---- Carga inicial ----
    await loadUser();
    await loadFriendsCount();
    await loadRecentMatches();
}
