import { Ctx } from "./router.js";
import { initializeLanguages } from "./translate.js";

type Match = {
	id: number;
	game?: "pong" | "tictactoe" | string;
	player1_id: number;
	player2_id: number;
	winner_id: number | null;
	played_at?: string | null;
	details?: string | null;
};

export async function mount(el: HTMLElement, ctx: Ctx) {
    // Inicializar el sistema de traducción primero
    await initializeLanguages();
    
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
                      <a href="/logout" class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg text-xs">
                        ${ctx.t("logout") ?? "Logout"}
                      </a>
                </div>
              </div>
        </header>

        <main class="max-w-5xl mx-auto px-4 py-8">
            <h1 class="text-2xl font-bold mb-4" data-translate="home.recentMatches">${ctx.t("home.recentMatches") ?? "Partidos"}</h1>

            <!-- Controles -->
              <div class="flex flex-wrap items-center gap-2 mb-4">
                <select id="filter-game" class="bg-black border border-white/10 rounded-lg px-3 py-2 text-white/80 [color-scheme:dark]">
                      <option value="all">${ctx.t("all") ?? "Todos"}</option>
                      <option value="pong">${ctx.t("pong") ?? "🏓 Pong"}</option>
                      <option value="tictactoe">${ctx.t("ttt") ?? "❌⭘ Tic-Tac-Toe"}</option>
                </select>
                <select id="filter-result" class="bg-black border border-white/10 rounded-lg px-3 py-2 text-white/80 ">
                    <option value="all">${ctx.t("all") ?? "Todos"}</option>
                    <option value="W">${ctx.t("win") ?? "Victoria"}</option>
                    <option value="D">${ctx.t("draw") ?? "Empate"}</option>
                    <option value="L">${ctx.t("lose") ?? "Derrota"}</option>
                </select>
            </div>

            <!-- Lista -->
            <section class="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                <div id="list" class="text-sm text-white/80 space-y-2">—</div>
                <div class="mt-4 flex justify-center">
                    <button id="btn-more" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hidden">
                        ${ctx.t("load_more") ?? "Mostrar más"}
                    </button>
                </div>
            </section>
        </main>
    `;

    const $ = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector(s) as T | null;
    const listEl = $("#list")!;
    const filterGame = $("#filter-game") as HTMLSelectElement;
    const filterResult = $("#filter-result") as HTMLSelectElement;
    const btnMore = $("#btn-more") as HTMLButtonElement;

    const fmtDateTime = (s?: string | null) => (!s ? "-" : new Date(s).toLocaleString());
    const safeDetails = (m: Match) => { try { return m.details ? JSON.parse(m.details) : null; } catch { return null; } };
    const gameOf = (m: Match) => m.game ?? safeDetails(m)?.game ?? "pong";
    const isDraw = (m: Match) => {
        const d = safeDetails(m);
        return m.winner_id == null || d?.is_draw === true;
    };

    const gameIcon = (g?:string) => g === "tictactoe" ? "❌⭘" : "🏓";

    const prettyDuration = (ms?: number | null) => {
        if (!ms || ms < 1000) return null;
        const s = Math.round(ms / 1000);
        const m = Math.floor(s / 60);
        const r = s % 60;
        return m ? `${m}m ${r}s` : `${r}s`;
    };

    // Definir estas funciones dentro del scope para que puedan acceder a ctx.t() actualizado
    let gamePill: (g: string) => string;
    let resultPill: (res: "W" | "L" | "D") => string;

    function updateTranslationFunctions() {
        gamePill = (g: string) => 
            g === "tictactoe"
                ? `<span class="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">❌⭘ TTT</span>`
                : `<span class="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10">🏓 Pong</span>`;

        resultPill = (res: "W" | "L" | "D") => {
            const cls =
                res === "W" ? "bg-emerald-600/80" :
                res === "L" ? "bg-rose-600/80" :
                    "bg-zinc-600/80";
            
            const txt =
                res === "W" ? (ctx.t("win") ?? "Victoria") :
                res === "L" ? (ctx.t("lose") ?? "Derrota") :
                    (ctx.t("draw") ?? "Empate");
            return `<span class="text-xs px-2 py-0.5 rounded ${cls}">${txt}</span>`;
        };
    }

    // Inicializar las funciones de traducción
    updateTranslationFunctions();

    const resultFor = (meId: number, m: Match): "W" | "L" | "D" => {
        if (isDraw(m)) return "D";
        return m.winner_id === meId ? "W" : "L";
    };

    const perspectiveScore = (m: Match, myId: number): { you: number; rival: number } | null => {
        const d = safeDetails(m);
        const s = d?.score;
        if (!s || typeof s !== "object") return null;
        
        if (typeof s.left === "number" && typeof s.right === "number") {
            const leftId = d?.players?.left_id;
            if (typeof leftId === "number") {
                return leftId === myId
                    ? { you: s.left, rival: s.right }
                    : { you: s.right, rival: s.left };
            }
            return { you: s.left, rival: s.right };
        }

        if (typeof s.user === "number" && typeof s.ai === "number") {
            return { you: s.user, rival: s.ai};
        }

        return null;
    };

    const nameCache = new Map<number, string>();
    async function getUserName(id: number): Promise<string> {
        if (!id || id <= 0) return ctx.t("AI") ?? "IA";
        if (nameCache.has(id)) return nameCache.get(id)!;
        try {
            const { user } = await ctx.api(`/api/users/${id}`);
            const name = user?.display_name || user?.displayName || `Usuario ${id}`;
            nameCache.set(id, name);
            return name;
        } catch {
            return `Usuario #${id}`;
        }
    }

    listEl.innerHTML = `
        <div class="flex items-center gap-2 text-white/60">
            <span class="inline-block w-3 h-3 rounded-full animate-pulse bg-white/30"></span>
            ${ctx.t("loading") ?? "Cargando..."}
        </div>
    `;

    let meId = 0;
    let all: Match[] = [];
    try {
        const me = await ctx.api("/api/auth/me");
        meId = me?.user?.id ?? me?.id ?? 0;
        const r = await ctx.api("/api/users/me/matches") as { matches: Match[] };
        all = r.matches || [];
    } catch (e) {
        listEl.innerHTML = `<div class="text-rose-400">${ctx.t("error_loading") ?? "No se pudieron cargar los partidos."}</div>`;
        return;
    }

    const PAGE = 20;
    let shown = 0;

    function rowHTML(m: Match, res: "W" | "L" | "D", oppName: string) {
        const d = safeDetails(m) || {};
        const when = fmtDateTime(m.played_at);
        const g = gameOf(m);
        const dur = prettyDuration(d?.duration_ms);
        const icon = gameIcon(g);

        const meta = `
            <div class="flex item-center gap-2 text-xs text-white/60 mt-0.5">
                ${gamePill(g)}
                <span>•</span>
                <span>${when}</span>
                ${dur ? `<span>•</span><span>${dur}</span>` : ""}
            </div>
        `;

        const toneCls =
            res === "W" ? "text-emerald-300" :
            res === "L" ? "text-rose-300" : 
                "text-zinc-300";
        
        if (g === "pong") {
            const sc = perspectiveScore(m, meId);
            const scoreHTML  = sc
                ? `<div class="text-2xl font-extrabold tabular-nums ${toneCls}">${sc.you}&nbsp;–&nbsp;${sc.rival}</div>`
                : `<div class="text-sm opacity-70">${ctx.t("no_score") ?? "Sin marcador"}</div>`;

            return `
                  <li class="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-lg">
                            ${icon}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                                <div class="text-white truncate">vs ${oppName}</div>
                                  ${resultPill(res)}
                            </div>
                            ${meta}
                        </div>
                        <div class="text-right">
                            ${scoreHTML}
                          </div>
                    </div>
                </li>`;
        }
        
        return `
            <li class="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-lg">
                        ${icon}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <div class="text-white truncate">vs ${oppName}</div>
                                ${resultPill(res)}
                        </div>
                        ${meta}
                    </div>
                </div>
            </li>`;
    }

    function applyFilters(list: Match[]) {
        const g = filterGame?.value || "all";
        const r = filterResult?.value || "all";
        return list.filter(m => {
            const okGame = g === "all" || gameOf(m) === g;
            const res = resultFor(meId, m);
            const okRes = r === "all" || r === res;
            return okGame && okRes;
        });
    }

    async function render(reset = false) {
        const filtered = applyFilters(all);
        if (reset) shown = 0;
        
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="text-white/60">${ctx.t("no_matches") ?? "Aún no hay partidas"}</div>`;
            btnMore.classList.add("hidden");
            return;
        }

        const slice = filtered.slice(shown, shown + PAGE);
        const rows = await Promise.all(slice.map(async (m) => {
            const oppId = m.player1_id === meId ? m.player2_id : m.player1_id;
            const opp = await getUserName(oppId);
            const res = resultFor(meId, m);
            return rowHTML(m, res, opp);
        }));

        if (reset) {
            listEl.innerHTML = `<ul>${rows.join("")}</ul>`;
        } else {
            const ul = listEl.querySelector("ul");
            if (ul) ul.insertAdjacentHTML("beforeend", rows.join(""));
            else listEl.innerHTML = `<ul>${rows.join("")}</ul>`;
        }

        shown += slice.length;
        if (shown < filtered.length) btnMore.classList.remove("hidden");
        else btnMore.classList.add("hidden");
    }

    function updateStaticTexts() {
        // Actualizar título
        const title = el.querySelector('h1');
        if (title) title.textContent = ctx.t("home.recentMatches") ?? "Partidos";
        
        // Actualizar botón logout
        const logoutBtn = el.querySelector('a[href="/logout"]');
        if (logoutBtn) logoutBtn.textContent = ctx.t("logout") ?? "Logout";
        
        // Actualizar opciones del select de juegos
        const gameSelect = $("#filter-game") as HTMLSelectElement;
        if (gameSelect) {
            const currentValue = gameSelect.value;
            gameSelect.innerHTML = `
                <option value="all">${ctx.t("all") ?? "Todos"}</option>
                <option value="pong">${ctx.t("pong") ?? "🏓 Pong"}</option>
                <option value="tictactoe">${ctx.t("ttt") ?? "❌⭘ Tic-Tac-Toe"}</option>
            `;
            gameSelect.value = currentValue;
        }
        
        // Actualizar opciones del select de resultados
        const resultSelect = $("#filter-result") as HTMLSelectElement;
        if (resultSelect) {
            const currentValue = resultSelect.value;
            resultSelect.innerHTML = `
                <option value="all">${ctx.t("all") ?? "Todos"}</option>
                <option value="W">${ctx.t("win") ?? "Victoria"}</option>
                <option value="D">${ctx.t("draw") ?? "Empate"}</option>
                <option value="L">${ctx.t("lose") ?? "Derrota"}</option>
            `;
            resultSelect.value = currentValue;
        }
        
        // Actualizar botón "Mostrar más"
        const moreBtn = $("#btn-more") as HTMLButtonElement;
        if (moreBtn) {
            moreBtn.textContent = ctx.t("load_more") ?? "Mostrar más";
        }
    }

    filterGame?.addEventListener("change", () => render(true));
    filterResult?.addEventListener("change", () => render(true));
    btnMore?.addEventListener("click", () => render(false));

    await render(true);

    // Agregar listener para cambios de idioma
    window.addEventListener('languageChanged', async () => {
        // Actualizar las funciones de traducción con los nuevos valores
        updateTranslationFunctions();
        
        // Limpiar cache de nombres para que se actualicen con el nuevo idioma
        nameCache.clear();
        
        // Actualizar textos estáticos
        updateStaticTexts();
        
        // Re-renderizar toda la página con las nuevas traducciones
        await render(true);
    });
}