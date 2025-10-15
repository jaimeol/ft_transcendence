import { initializeLanguages } from "./translate.js";
export async function mount(el, ctx) {
    await initializeLanguages();
    // Auth
    let meUser = null;
    try {
        const r = await ctx.api("/api/auth/me");
        meUser = r?.user ?? r ?? null;
    }
    catch { }
    if (!meUser?.id) {
        ctx.navigate("/login", { replace: true });
        return;
    }
    document.body.className = "min-h-screen bg-black text-white";
    el.innerHTML = `
<header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
  <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
    <a href="/home" class="flex items-center gap-2" data-nav>
      <div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
      <span class="font-semibold">ft_transcendence</span>
    </a>
    <nav class="hidden sm:flex items-center gap-4 text-sm">
      <a href="/profile" class="opacity-80 hover:opacity-100" data-translate="profile.title">Perfil</a>
      <a href="/home" class="opacity-80 hover:opacity-100" data-translate="home">Inicio</a>
    </nav>
    <div class="flex items-center gap-3 text-xs">
      <div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full backdrop-blur">
        <button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
        <span class="mx-1 text-white/40">|</span>
        <button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
        <span class="mx-1 text-white/40">|</span>
        <button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
      </div>
      <button id="btn-logout"
        class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg"
        data-translate="home.logout">
        Cerrar sesión
      </button>
    </div>
  </div>
</header>

<!-- Glows -->
<div class="pointer-events-none fixed -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-indigo-600/20 blur-3xl"></div>
<div class="pointer-events-none fixed -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl"></div>

<main class="max-w-6xl mx-auto px-4 py-6 space-y-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold">📈 <span data-translate="profile.title">Estadísticas</span></h1>
      <p class="text-white/60 text-sm" data-translate="profile.resultDistribution">Resumen por juego con gráficos</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <select id="filter-game" class="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm">
        <option value="all" class="text-black" data-translate="all">Todos los juegos</option>
        <option value="pong" class="text-black" data-translate="pong">Pong</option>
        <option value="tictactoe" class="text-black" data-translate="ttt">Tres en Raya</option>
      </select>
      <select id="filter-range" class="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm">
        <option value="30d" class="text-black" data-translate="stats.30days">30 días</option>
        <option value="90d" class="text-black" data-translate="stats.90days">90 días</option>
        <option value="365d" class="text-black" data-translate="stats.1year">1 año</option>
        <option value="all" class="text-black" data-translate="all">Todo</option>
      </select>
    </div>
  </div>

  <!-- KPIs -->
  <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="glass rounded-lg p-3 text-center">
      <div class="text-xl font-bold text-blue-400" id="kpi-total">0</div>
      <div class="text-xs text-white/60" data-translate="profile.matches">Partidas</div>
    </div>
    <div class="glass rounded-lg p-3 text-center">
      <div class="text-xl font-bold text-green-400" id="kpi-winrate">0%</div>
      <div class="text-xs text-white/60" data-translate="profile.winrate">Winrate</div>
    </div>
    <div class="glass rounded-lg p-3 text-center">
      <div class="text-xl font-bold text-emerald-400" id="kpi-gf">0</div>
      <div class="text-xs text-white/60" data-translate="stats.goalsFor">Goles a favor</div>
    </div>
    <div class="glass rounded-lg p-3 text-center">
      <div class="text-xl font-bold text-red-400" id="kpi-ga">0</div>
      <div class="text-xs text-white/60" data-translate="stats.goalsAgainst">Goles en contra</div>
    </div>
  </section>

  <!-- Charts -->
  <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="glass rounded-xl p-4">
      <h3 class="font-medium mb-3" data-translate="profile.resultDistribution">Resultados (W/D/L)</h3>
      <canvas id="chart-wdl" height="220"></canvas>
    </div>
    <div class="glass rounded-xl p-4">
      <h3 class="font-medium mb-3" data-translate="stats.goalsComparison">Goles a favor vs en contra</h3>
      <canvas id="chart-goals" height="220"></canvas>
      <p class="text-xs text-white/50 mt-2" id="note-goals" data-translate="stats.onlyPong">Solo para Pong</p>
    </div>
    <div class="glass rounded-xl p-4">
      <h3 class="font-medium mb-3" data-translate="stats.resultsTimeline">Resultados en el tiempo</h3>
      <canvas id="chart-timeline" height="220"></canvas>
    </div>
  </section>

  <!-- Tabla simple -->
  <section class="glass rounded-xl p-4">
    <h3 class="font-medium mb-3" data-translate="profile.lastMatches">Últimas partidas</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-white/60">
          <tr>
            <th class="text-left py-2" data-translate="stats.date">Fecha</th>
            <th class="text-left py-2" data-translate="stats.game">Juego</th>
            <th class="text-left py-2" data-translate="stats.result">Resultado</th>
            <th class="text-left py-2" data-translate="stats.score">Marcador</th>
          </tr>
        </thead>
        <tbody id="tbl-body"></tbody>
      </table>
    </div>
  </section>
</main>
`.trim();
    // Utils
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    // Event listeners
    el.addEventListener("click", (ev) => {
        const a = ev.target.closest('a[data-nav]');
        if (!a)
            return;
        ev.preventDefault();
        const href = a.getAttribute("href") || "/";
        ctx.navigate(href);
    });
    $("#btn-logout")?.addEventListener("click", async () => {
        try {
            await ctx.api("/api/auth/logout", { method: "POST" });
        }
        finally {
            ctx.navigate("/", { replace: true });
        }
    });
    // Cargar Chart.js dinámicamente
    await ensureChartsJs();
    // Fetch matches
    const viewedIdParam = Number(new URLSearchParams(location.search).get("user")) || meUser.id;
    let matches = [];
    try {
        const r = await ctx.api(`/api/users/${viewedIdParam}/matches`);
        matches = r?.matches ?? [];
    }
    catch {
        matches = [];
    }
    // Filters
    const filterGameSel = $("#filter-game");
    const filterRangeSel = $("#filter-range");
    // Charts instances
    let chartWDL = null;
    let chartGoals = null;
    let chartTimeline = null;
    function safeDetails(m) {
        try {
            return m.details ? JSON.parse(m.details) : null;
        }
        catch {
            return null;
        }
    }
    function gameKey(m) {
        let g = (m.game || "").toLowerCase();
        if (!g) {
            const d = safeDetails(m);
            g = (d?.game || "").toLowerCase();
        }
        // Quitar la diferenciación de pong2v2, ahora todo es "pong"
        if (g === "pong" || g.includes("pong"))
            return "pong";
        if (g.includes("tictactoe") || g === "ttt")
            return "tictactoe";
        return "unknown";
    }
    function inRange(m, range) {
        if (range === "all")
            return true;
        const now = Date.now();
        const ms = range === "30d" ? 30 : range === "90d" ? 90 : 365;
        const from = now - ms * 86400000;
        const t = m.played_at ? Date.parse(m.played_at) : 0;
        return t >= from;
    }
    function resultOf(m) {
        const d = safeDetails(m);
        if (m.is_draw || d?.is_draw)
            return "draw";
        if (m.winner_id === meUser.id)
            return "win";
        return "loss";
    }
    // Goals extraction for pong-like
    function extractGoals(m) {
        const d = safeDetails(m);
        if (!d)
            return null;
        // NUEVO: Buscar en d.score (como hace matches.ts)
        const s = d.score;
        if (s && typeof s === "object") {
            // Partida contra IA
            if (typeof s.user === "number" && typeof s.ai === "number") {
                return { for: s.user, against: s.ai };
            }
            // Partida PvP con left/right
            if (typeof s.left === "number" && typeof s.right === "number") {
                const leftId = d.players?.left_id;
                if (typeof leftId === "number") {
                    return leftId === meUser.id
                        ? { for: s.left, against: s.right }
                        : { for: s.right, against: s.left };
                }
                // Sin left_id, intentar deducir por el ganador
                if (m.winner_id === meUser.id) {
                    if (s.left > s.right)
                        return { for: s.left, against: s.right };
                    if (s.right > s.left)
                        return { for: s.right, against: s.left };
                }
                else {
                    if (s.left > s.right)
                        return { for: s.right, against: s.left };
                    if (s.right > s.left)
                        return { for: s.left, against: s.right };
                }
            }
        }
        // MANTENER EL CÓDIGO ORIGINAL COMO FALLBACK
        if (typeof d.score_user === "number" && typeof d.score_ai === "number") {
            return { for: d.score_user, against: d.score_ai };
        }
        if (typeof d.score_left === "number" && typeof d.score_right === "number") {
            const myLeft = d.score_user_role === "left" ||
                d.user_role === "left" ||
                d.user_side === "left" ||
                d.left_player_id === meUser.id ||
                (Array.isArray(d.team1_player_ids) && d.team1_player_ids.includes(meUser.id)) ||
                d.team1_player1_id === meUser.id ||
                d.team1_player2_id === meUser.id;
            if (myLeft === true)
                return { for: d.score_left, against: d.score_right };
            if (myLeft === false)
                return { for: d.score_right, against: d.score_left };
            // Fallback con ganador
            if (m.winner_id === meUser.id) {
                if (d.score_left > d.score_right)
                    return { for: d.score_left, against: d.score_right };
                if (d.score_right > d.score_left)
                    return { for: d.score_right, against: d.score_left };
            }
            else {
                if (d.score_left > d.score_right)
                    return { for: d.score_right, against: d.score_left };
                if (d.score_right > d.score_left)
                    return { for: d.score_left, against: d.score_right };
            }
        }
        return null;
    }
    function formatDateShort(s) {
        if (!s)
            return "";
        const d = new Date(s);
        return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
    }
    function computeStats(gameFilter, rangeFilter) {
        const rows = matches.filter(m => {
            const g = gameKey(m);
            const okGame = gameFilter === "all" ? g !== "unknown" : g === gameFilter;
            return okGame && inRange(m, rangeFilter);
        });
        let wins = 0, draws = 0, losses = 0;
        let gf = 0, ga = 0;
        const timeSeries = [];
        // Build time series over time: 1 win, 0 draw, -1 loss (cumulative)
        const sorted = [...rows].sort((a, b) => (Date.parse(a.played_at || "") || 0) - (Date.parse(b.played_at || "") || 0));
        let acc = 0;
        for (const m of sorted) {
            const res = resultOf(m);
            if (res === "win") {
                wins++;
                acc += 1;
            }
            else if (res === "draw") {
                draws++;
            }
            else {
                losses++;
                acc -= 1;
            }
            timeSeries.push({ label: formatDateShort(m.played_at), val: acc });
            // Goals (only pong)
            const g = gameKey(m);
            if (g === "pong") {
                const scor = extractGoals(m);
                if (scor) {
                    gf += scor.for;
                    ga += scor.against;
                }
            }
        }
        const total = wins + draws + losses;
        const winrate = total ? Math.round((wins / total) * 100) : 0;
        return { rows, wins, draws, losses, total, winrate, gf, ga, timeSeries };
    }
    function updateKPIs(s, gameFilter) {
        $("#kpi-total").textContent = String(s.total);
        $("#kpi-winrate").textContent = `${s.winrate}%`;
        const isGoalsGame = gameFilter === "pong" || gameFilter === "all";
        $("#kpi-gf").textContent = isGoalsGame ? String(s.gf) : "—";
        $("#kpi-ga").textContent = isGoalsGame ? String(s.ga) : "—";
        $("#note-goals").style.display = isGoalsGame ? "block" : "none";
    }
    function drawCharts(s, gameFilter) {
        // Destroy existing
        chartWDL?.destroy();
        chartGoals?.destroy();
        chartTimeline?.destroy();
        // WDL doughnut
        chartWDL = new Chart($("#chart-wdl"), {
            type: "doughnut",
            data: {
                labels: [ctx.t("profile.wins"), ctx.t("profile.draws"), ctx.t("profile.losses")],
                datasets: [{
                        data: [s.wins, s.draws, s.losses],
                        backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
                        borderWidth: 0
                    }]
            },
            options: {
                plugins: {
                    legend: { labels: { color: "#e5e7eb" } },
                    tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw}` } }
                }
            }
        });
        // Goals bar (show only if applicable)
        const goalsCanvas = $("#chart-goals");
        if (gameFilter === "pong" || gameFilter === "all") {
            chartGoals = new Chart(goalsCanvas, {
                type: "bar",
                data: {
                    labels: [ctx.t("stats.goals") || "Goles"],
                    datasets: [
                        { label: ctx.t("stats.goalsFor") || "A favor", data: [s.gf], backgroundColor: "#34d399" },
                        { label: ctx.t("stats.goalsAgainst") || "En contra", data: [s.ga], backgroundColor: "#f87171" }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: "#e5e7eb" } } },
                    scales: {
                        x: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.05)" } },
                        y: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true }
                    }
                }
            });
            goalsCanvas.parentElement?.classList.remove("opacity-50");
        }
        else {
            // Clear/ghost it for non-goals games
            goalsCanvas.getContext("2d")?.clearRect(0, 0, goalsCanvas.width, goalsCanvas.height);
            goalsCanvas.parentElement?.classList.add("opacity-50");
        }
        // Timeline line
        chartTimeline = new Chart($("#chart-timeline"), {
            type: "line",
            data: {
                labels: s.timeSeries.map(p => p.label),
                datasets: [{
                        label: ctx.t("stats.momentum") || "Momentum (acumulado)",
                        data: s.timeSeries.map(p => p.val),
                        borderColor: "#60a5fa",
                        backgroundColor: "rgba(96,165,250,0.25)",
                        fill: true,
                        tension: 0.25,
                        pointRadius: 2
                    }]
            },
            options: {
                plugins: { legend: { labels: { color: "#e5e7eb" } } },
                scales: {
                    x: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.05)" } }
                }
            }
        });
    }
    function renderTable(rows, gameFilter) {
        const tb = $("#tbl-body");
        const max = 15;
        const lines = rows
            .sort((a, b) => (Date.parse(b.played_at || "") || 0) - (Date.parse(a.played_at || "") || 0))
            .slice(0, max)
            .map(m => {
            const g = gameKey(m);
            const d = safeDetails(m);
            const r = resultOf(m);
            let score = "—";
            // show score if pong-like
            if (g === "pong") {
                const sc = extractGoals(m);
                if (sc)
                    score = `${sc.for} - ${sc.against}`;
                else if (typeof d?.score_left === "number" && typeof d?.score_right === "number")
                    score = `${d.score_left} - ${d.score_right}`;
            }
            const dd = m.played_at ? new Date(m.played_at).toLocaleString() : "—";
            // Usar ctx.t en tiempo real
            const gameLabel = g === "pong" ? ctx.t("pong") : g === "tictactoe" ? ctx.t("ttt") : "—";
            // Usar ctx.t para las etiquetas de resultado
            const badge = r === "win" ? `<span class="text-green-400">${ctx.t("win")}</span>` :
                r === "draw" ? `<span class="text-yellow-400">${ctx.t("draw")}</span>` :
                    `<span class="text-red-400">${ctx.t("lose")}</span>`;
            return `<tr class="border-t border-white/10">
          <td class="py-2">${dd}</td>
          <td class="py-2">${gameLabel}</td>
          <td class="py-2">${badge}</td>
          <td class="py-2">${score}</td>
        </tr>`;
        })
            .join("");
        tb.innerHTML = lines || `<tr><td colspan="4" class="py-4 text-center text-white/60">${ctx.t("tournament.noMatches")}</td></tr>`;
    }
    function updateAll() {
        const gameFilter = filterGameSel.value;
        const rangeFilter = filterRangeSel.value;
        const stats = computeStats(gameFilter, rangeFilter);
        updateKPIs(stats, gameFilter);
        drawCharts(stats, gameFilter);
        renderTable(stats.rows, gameFilter);
    }
    filterGameSel.addEventListener("change", updateAll);
    filterRangeSel.addEventListener("change", updateAll);
    // Añadir listener para cambios de idioma
    window.addEventListener("languageChanged", () => {
        // Actualizar PRIMERO todas las traducciones estáticas
        document.querySelectorAll("[data-translate]").forEach(el => {
            const key = el.getAttribute("data-translate");
            if (key)
                el.textContent = ctx.t(key);
        });
        // Luego actualizar gráficos y tabla dinámica
        updateAll();
    });
    updateAll();
    // Traducir textos estáticos después de cargar
    document.querySelectorAll("[data-translate]").forEach(el => {
        const key = el.getAttribute("data-translate");
        if (key)
            el.textContent = ctx.t(key);
    });
    // Cleanup on unmount
    const obs = new MutationObserver(() => {
        if (!el.isConnected) {
            chartWDL?.destroy();
            chartGoals?.destroy();
            chartTimeline?.destroy();
            obs.disconnect();
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
}
// Función para cargar Chart.js dinámicamente
async function ensureChartsJs() {
    if (window.Chart)
        return;
    await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.4";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("No se pudo cargar chart.js"));
        document.head.appendChild(s);
    });
}
