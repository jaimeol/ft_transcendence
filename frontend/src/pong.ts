import { currentTranslations, initializeLanguages } from "./translate.js";
import type { Ctx } from "./router.js";
import { renderGoogleSecondButton } from "./google.js";

type Player = { id: number; displayName?: string; email?: string } | null;

export async function mount(el: HTMLElement, ctx: Ctx) {
    // Inicializar traducciones
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
    
    // Redirigir a pong2v2.ts si es un juego 2v2
    const url = new URL(window.location.href);
    let mode = url.searchParams.get('mode');
    let players = url.searchParams.get('players');
    let pvpPlayers = url.searchParams.get('pvp_players');

    const inviteOpponentId = history.state?.opponent_id;
    const isInvite = !!history.state?.isInvite;

    if ((mode === 'ai' && players === '2') || (mode === 'pvp' && pvpPlayers === '2')) {
        const pong2v2Module = await import('./pong2v2.js');
        return pong2v2Module.mount(el, ctx);
    }

    el.innerHTML = `
    <header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
        <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/home" class="flex items-center gap-2" data-nav>
                <div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
                <span class="font-semibold">ft_transcendence</span>
            </a>

            <div class="flex items-center gap-3">
                <div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-xs backdrop-blur">
                    <button class="hover:underline" data-lang="en">EN</button>
                    <span class="mx-1 text-white/40">|</span>
                    <button class="hover:underline" data-lang="es">ES</button>
                    <span class="mx-1 text-white/40">|</span>
                    <button class="hover:underline" data-lang="fr">FR</button>
                </div>
                <button id="logoutBtn"
          class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg text-xs"
          data-translate="home.logout">
          Cerrar sesión
        </button>
            </div>
        </div>
    </header>

    <!-- Main -->
    <main class="flex-1">
        <div class="max-w-5xl mx-auto px-4 py-8">
            <!-- Cabecera del juego -->
            <div class="mb-6">
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
                <span class="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Ft_Transcendence — Pong
                </span>
            </h1>
            <div id="score" class="mt-2 text-white/70 text-lg font-mono">0 : 0</div>
            </div>

            <!-- Contenedor del canvas -->
            <section class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4">
            <div class="overflow-x-auto">
                <!-- Contenedor relativo para canvas + overlay -->
                <div class="relative w-full max-w-[1200px] mx-auto">
                <canvas
                    id="pong"
                    width="1200"
                    height="800"
                    class="block w-full h-auto bg-gray-900"
                ></canvas>
                <div
                    id="board-blocker"
                    class="absolute inset-0 bg-black z-40 hidden"
                ></div>
                </div>
            </div>
            </section>
        </div>
    </main>

    <div id="players-overlay" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-50">
        <div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl w-[min(92vw,28rem)]">
            <h2 class="text-2xl font-bold mb-6 text-center" data-translate="select_players">Selecciona Jugadores</h2>
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button type="button" class="players-btn bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded font-semibold" data-players="1" data-translate="one_player"> 1 Jugador</button>
                <button type="button" class="players-btn bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded font-semibold" data-players="2" data-translate="two_players"> 2 Jugadores</button>
            </div>
        </div>
    </div>
    <!-- Overlay dificultad -->
    <div id="difficulty-overlay" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-50 animate-fade-in">
        <div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl w-[min(92vw,28rem)]">
            <h2 class="text-2xl font-bold mb-6 text-center" data-translate="select_difficulty">Selecciona dificultad</h2>
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button type="button" class="difficulty-btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" data-translate="easy" data-level="easy">Fácil</button>
                <button type="button" class="difficulty-btn bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded" data-translate="medium" data-level="medium">Media</button>
                <button type="button" class="difficulty-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded" data-translate="hard" data-level="hard">Difícil</button>
            </div>
        </div>
    </div>

    <!-- Overlay login PVP -->
    <div id="pvp-login-overlay" class="fixed inset-0 hidden flex items-center justify-center bg-black/60 z-50">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 class="text-xl font-semibold mb-4" id="pvp-login-heading">${ctx.t("pvp.second_player")}</h2>
            <form id="pvp-login-form" class="flex flex-col gap-3">
            <input id="pvp-email" type="email" placeholder="Email"
                    class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
            <input id="pvp-password" type="password" placeholder="${ctx.t("auth.password") ?? "Contraseña"}"
                    class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
            <button type="submit"
                    class="rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2 font-semibold">
                ${ctx.t("pvp.start_match") ?? "Empezar partida"}
            </button>
            </form>

            <!-- separador -->
            <div class="mt-4 flex items-center gap-2 text-white/40 text-xs">
              <span class="flex-1 h-px bg-white/10"></span>
              <span>o</span>
              <span class="flex-1 h-px bg-white/10"></span>
            </div>

            <!-- botón Google -->
            <div id="pvp-google-host" class="mt-3 flex justify-center"></div>

            <p id="pvp-login-error" class="text-red-400 text-sm mt-3 hidden"></p>
        </div>
    </div>
    `;

    const subs = new AbortController();
    const on = <K extends keyof WindowEventMap>(type: K, handler: (ev: WindowEventMap[K]) => any) =>
        window.addEventListener(type, handler as any, { signal: subs.signal });

    // language buttons
    el.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => (window as any).changeLanguage?.(btn.dataset.lang));
    });

    el.addEventListener("click", (ev) => {
        const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a[data-nav]');
        if (!a) return;
        const href = a.getAttribute("href") || "/";
        ev.preventDefault();
        ctx.navigate(href);
    });

    el.querySelector<HTMLButtonElement>("#logoutBtn")?.addEventListener("click", async () => {
        try { await ctx.api("/api/auth/logout", { method: "POST" }); }
        finally { ctx.navigate("/", { replace: true }); }
    });

    /* -------------------------
       Variables del juego
       ------------------------- */
    const canvas = el.querySelector<HTMLCanvasElement>('#pong')!;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) throw new Error("Could not obtain 2dcontext");

    const paddleWidth = 10, paddleHeight = 120, ballRadius = 10;
    const INITIAL_BALL_SPEED = 5, MAX_BALL_SPEED = 10, paddleSpeed = 6;

    const keys: Record<string, boolean> = {};

    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;

    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 0, ballSpeedY = 0;

    let leftScore = 0, rightScore = 0;

    let gameRunning = false, gameOver = false;
    let savedThisGame = false;
    let gameStartTs = performance.now();

    let secondPlayer: Player = null;
    let pvpReady = false;

    let difficulty = url.searchParams.get('level');

    const isAI = mode === 'ai';
    const isPVP = mode === 'pvp';

    if (isAI && !players) {
        const playersOverlay = $('#players-overlay');
        if (playersOverlay) {
            playersOverlay.classList.remove('hidden');
            playersOverlay.classList.add('flex');
            playersOverlay.querySelectorAll<HTMLButtonElement>('.players-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = btn.getAttribute('data-players')!;
                    url.searchParams.set('players', p);
                    window.location.replace(`${window.location.pathname}?${url.searchParams.toString()}`);
                });
            });
        }
        return;
    }

    console.log('Mode:', { isAI, isPVP, players, difficulty });

    function replaceQueryParam(k: string, v: string) {
        const u = new URL(window.location.href);
        u.searchParams.set(k, v);
        history.replaceState({}, "", u.toString());
    }

    function $(sel: string) { return el.querySelector(sel) as HTMLElement | null; }

    /* -------------------------
       Guardado de partidas
       ------------------------- */
    async function saveMatchIfNeeded() {
        try {
            if (savedThisGame) return;
            const duration = Math.max(0, Math.floor(performance.now() - gameStartTs));

            const post = async (body: any) => {
                await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            };

            if (isAI) {
                // simple 1v1 AI
                const body = {
                    mode: 'ai',
                    game: 'pong',
                    level: difficulty || null,
                    score_user: leftScore,
                    score_ai: rightScore,
                    score_left: leftScore,
                    score_right: rightScore,
                    duration_ms: duration
                };
                await post(body);
            } else if (isPVP && secondPlayer) {
                const body = {
                    mode: 'pvp',
                    game: 'pong',
                    opponent_id: secondPlayer.id,
                    score_left: leftScore,
                    score_right: rightScore,
                    score_user: leftScore,
                    score_opponent: rightScore,
                    duration_ms: duration
                };
                await post(body);
            }
            savedThisGame = true;
        } catch (e) {
            console.warn('No se pudo guardar el match:', e);
        }
    }

    /* -------------------------
       Overlays & blockers
       ------------------------- */
    const diffOverlay = $('#difficulty-overlay');
    const blocker = $('#board-blocker');

    // Inicial: si es AI sin nivel -> mostrar overlay
    if (isAI) {
        if (!difficulty) {
            diffOverlay?.classList.remove('hidden'); diffOverlay?.classList.add('flex');
            el.querySelectorAll<HTMLButtonElement>('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.getAttribute('data-level')!;
                    difficulty = level;
                    replaceQueryParam('level', level);
                    diffOverlay?.classList.add('hidden');
                    blocker?.classList.add('hidden');
                });
            });
            blocker?.classList.remove('hidden');
        } else {
            diffOverlay?.classList.add('hidden');
            blocker?.classList.add('hidden');
        }
    }

    /* -------------------------
       PVP flow
       ------------------------- */
    if (isPVP && !pvpPlayers) {
        // Si no han elegido pvp_players en query, mostramos opciones
        const pvpModeOverlay = document.createElement('div');
        pvpModeOverlay.className = 'fixed inset-0 flex items-center justify-center bg-black/80 z-50';
        pvpModeOverlay.innerHTML = `
            <div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl w-[min(92vw,28rem)]">
                <h2 class="text-2xl font-bold mb-6 text-center">Selecciona modo</h2>
                <div class="flex flex-col sm:flex-row gap-3 items-center justify-center">
                    <button type="button" class="pvp-mode-btn bg-white/20 hover:bg-white/30 transition rounded px-4 py-2 font-semibold" data-pvp-players="1">1 vs 1</button>
                    <button type="button" class="pvp-mode-btn bg-white/20 hover:bg-white/30 transition rounded px-4 py-2 font-semibold" data-pvp-players="2">2 vs 2</button>
                </div>
            </div>
        `;
        document.body.appendChild(pvpModeOverlay);

        pvpModeOverlay.querySelectorAll<HTMLButtonElement>('.pvp-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = btn.getAttribute('data-pvp-players')!;
                url.searchParams.set('pvp_players', p);
                window.location.replace(`${window.location.pathname}?${url.searchParams.toString()}`);
            });
        });
        return; // salimos: el reload/replace cargará la misma ruta pero con pvp_players
    }

    if (isInvite && inviteOpponentId && isPVP && pvpPlayers === '1') {
        blocker?.classList.remove('hidden');
        try {
            const { user } = await ctx.api(`/api/users/${inviteOpponentId}`);
            if (!user) throw new Error(`Opponent id with ${inviteOpponentId} not found`);

            secondPlayer = {
                id: user.id,
                displayName: user.display_name,
                email: user.email
            };
            pvpReady = true;
            blocker?.classList.add('hidden');

            history.replaceState({}, "", url.toString());
        } catch (e) {
            console.error("Failed to load opponent from invite:", e);
            blocker?.classList.remove('hidden');
            const pvpOverlay = $('#pvp-login-overlay')!;
            pvpOverlay.classList.remove('hidden');
            const errorEl = $('pvp-login-error')!;
            errorEl.textContent = "Error al cargar el oponente. Inicia sesión manualmente.";
            history.replaceState({}, "", url.toString());
        }
    }

    // Si es PVP 1v1 mostramos overlay de login / blocker
    if (isPVP && pvpPlayers === '1') {
        blocker?.classList.remove('hidden');
        const pvpOverlay = $('#pvp-login-overlay')!;
        pvpOverlay.classList.remove('hidden');

        const form = el.querySelector<HTMLFormElement>('#pvp-login-form')!;
        const errorEl = $('#pvp-login-error')!;
        const heading = $('#pvp-login-heading')!;
        
        heading.textContent = ctx.t("pvp.second_player");

        // login manual
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const email = (el.querySelector<HTMLInputElement>('#pvp-email')!).value;
            const password = (el.querySelector<HTMLInputElement>('#pvp-password')!).value;
            try {
                const res = await fetch('/api/auth/login-second', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                secondPlayer = data;
                pvpReady = true;
                pvpOverlay.classList.add('hidden');
                blocker?.classList.add('hidden');
                errorEl.classList.add('hidden');
            } catch {
                errorEl.textContent = ctx.t("pvp_invalid_credentials") ?? "Credenciales inválidas";
                errorEl.classList.remove('hidden');
            }
        });

        // botón Google (segundo jugador)
        const host = el.querySelector<HTMLDivElement>('#pvp-google-host');
        if (host) {
          void renderGoogleSecondButton(
            host,
            (player) => {
              secondPlayer = player;
              pvpReady = true;
              pvpOverlay.classList.add('hidden');
              blocker?.classList.add('hidden');
              errorEl?.classList.add('hidden');
              host.innerHTML = "";
              document.body.focus?.();
            },
            (msg) => {
              if (errorEl) {
                errorEl.textContent = msg || 'Error al autenticar con Google';
                errorEl.classList.remove('hidden');
              }
            }
          );
        }
    } else {
        // no pvp -> ocultar blocker
        blocker?.classList.add('hidden');
    }

    /* -------------------------
       Teclas
       ------------------------- */
    const keyLeftUp = 'w';
    const keyLeftDown = 's';
    const keyRightUp = 'ArrowUp';
    const keyRightDown = 'ArrowDown';

    /* -------------------------
       Handlers de teclado
       ------------------------- */
    const onKeyDown = (e: KeyboardEvent) => {
        // si AI y key Arrow -> ignorar eventos sinteticos del sistema si esTrusted
        if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
        keys[e.key] = true;

        if (e.key === ' ') {
            // space: iniciar / reiniciar
            if (isAI && !difficulty) {
                diffOverlay?.classList.remove('hidden');
                blocker?.classList.remove('hidden');
                return;
            }
            if (!gameRunning && !gameOver) {
                if (isPVP && !pvpReady) {
                    const pvpOverlay = $('#pvp-login-overlay');
                    if (pvpOverlay) { pvpOverlay.classList.remove('hidden'); pvpOverlay.classList.add('flex'); }
                    return;
                }
                gameRunning = true;
                resetBall(1);
                if (isAI) aiImmediateTick = true; // <- tick IA inmediato al empezar
                gameStartTs = performance.now();
            } else if (gameOver) {
                // reiniciar todo
                leftScore = rightScore = 0;
                savedThisGame = false;
                gameOver = false;
                gameRunning = false;
                gameStartTs = performance.now();
                resetBall();
                resetPaddles();
                updateScore();
            }
        }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
        if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
        keys[e.key] = false;
    };

    on('keydown', onKeyDown);
    on('keyup', onKeyUp);
    on('beforeunload', () => { if (gameOver) saveMatchIfNeeded(); });

    /* -------------------------
       IA (para modo AI) - Implementación mejorada
       ------------------------- */
    // Eliminamos timers y decidimos desde el RAF cada 1000 ms
    // Simular pulsaciones y actualizar keys a la vez
    type AIDir = 'up' | 'down' | 'none';
    let aiDir: AIDir = 'none';
    let aiImmediateTick = false; // <- primera decisión inmediata tras start/reset
    let aiTargetY: number | null = null; // <- objetivo persistente entre ticks de 1s
    let aiDeadZoneCurrent = 20;          // <- zona muerta usada hasta el próximo tick
    let prevGoingRight = ballSpeedX > 0; // <- recordar dirección horizontal para detectar cambios

    const synthKey = (key: string, type: 'keydown' | 'keyup') => {
        const evt = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
        window.dispatchEvent(evt);
    };
    const press = (key: string, down: boolean) => {
        keys[key] = down;                 // asegurar que update() lo lea
        synthKey(key, down ? 'keydown' : 'keyup'); // imitar teclado
    };

    const setAIDirection = (dir: AIDir) => {
        if (aiDir === dir) return;
        // Soltar la tecla anterior
        if (aiDir === 'up') press(keyRightUp, false);
        if (aiDir === 'down') press(keyRightDown, false);

        aiDir = dir;

        // Pulsar la nueva
        if (aiDir === 'up') press(keyRightUp, true);
        if (aiDir === 'down') press(keyRightDown, true);
    };

    // Guiado continuo hacia el objetivo sin “ver” nueva info
    const steerAIToTarget = () => {
        if (!gameRunning || gameOver || aiTargetY == null) {
            setAIDirection('none');
            return;
        }
        const paddleCenter = rightPaddleY + paddleHeight / 2;
        const diff = aiTargetY - paddleCenter;

        // Zona muerta dinámica: si la bola está muy cerca y viene hacia la derecha,
        // reducimos a 0 para asegurar el “empuje” final.
        let localDead = aiDeadZoneCurrent;
        const targetX = canvas.width - 20 - ballRadius;
        const distX = targetX - ballX;

        if (ballSpeedX > 0) {
            if (distX < 160) localDead = Math.min(localDead, 1);
            if (distX < 90)  localDead = 0;
        }

        if (Math.abs(diff) <= localDead) {
            setAIDirection('none'); // llegó -> soltar
        } else {
            setAIDirection(diff < 0 ? 'up' : 'down');
        }
    };

    // Predice la Y de la bola al llegar cerca de la pala derecha
    const predictBallYAtX = (): number => {
        // Si la bola va hacia la izquierda, devolver centro
        if (ballSpeedX <= 0) {
            return canvas.height / 2;
        }

        // Simulación con rebotes en techo/suelo
        let simX = ballX;
        let simY = ballY;
        let vx = ballSpeedX;
        let vy = ballSpeedY;

        const targetX = canvas.width - 20 - ballRadius; // cara izquierda de la pala derecha
        const maxIterations = 4000;
        let it = 0;

        while (simX < targetX && it++ < maxIterations) {
            simX += vx;
            simY += vy;

            if (simY <= ballRadius) {
                simY = ballRadius;
                vy = Math.abs(vy);
            } else if (simY >= canvas.height - ballRadius) {
                simY = canvas.height - ballRadius;
                vy = -Math.abs(vy);
            }
        }

        let predicted = (it >= maxIterations) ? canvas.height / 2 : simY;

        // Ruido según dificultad para humanizar
        let errorRange = 0;
        if (difficulty === 'easy') errorRange = canvas.height * 0.18;
        else if (difficulty === 'medium') errorRange = canvas.height * 0.08;
        else errorRange = canvas.height * 0.02;

        if (Math.abs(vy) < 1.0) errorRange *= 0.5;

        predicted += (Math.random() * 2 - 1) * errorRange;

        // Mantener margen y objetivo dentro de la pista
        const margin = 8;
        const minY = paddleHeight / 2 + margin;
        const maxY = canvas.height - paddleHeight / 2 - margin;
        return Math.max(minY, Math.min(maxY, predicted));
    };

    const updateAI = () => {
        if (!gameRunning || gameOver) {
            aiTargetY = null;
            setAIDirection('none');
            return;
        }

        const goingRight = ballSpeedX > 0;

        // Dead zone más pequeña (para que reaccione más)
        if (difficulty === 'easy') aiDeadZoneCurrent = 18;
        else if (difficulty === 'medium') aiDeadZoneCurrent = 12;
        else aiDeadZoneCurrent = 6;

        if (goingRight) {
            // Si viene hacia mí, predecir impacto
            aiTargetY = predictBallYAtX();
        } else {
            // Si se aleja, NO volver al centro: mantener objetivo previo.
            // Si aún no hay objetivo (inicio), fijar el actual centro de la pala.
            if (aiTargetY == null) {
                aiTargetY = rightPaddleY + paddleHeight / 2;
            }
        }

        // Ajuste inicial inmediato hacia el objetivo actual
        steerAIToTarget();
    };

    // Decisión cada 1000 ms desde el bucle (primer tick inmediato tras empezar)
    let lastAIDecision = 0;

    /* -------------------------
       DIBUJADO
       ------------------------- */
    function drawRect(x: number, y: number, w: number, h: number, color: string) {
        ctx2d!.fillStyle = color; ctx2d!.fillRect(x, y, w, h);
    }
    function drawCircle(x: number, y: number, r: number, color: string) {
        ctx2d!.fillStyle = color; ctx2d!.beginPath(); ctx2d!.arc(x, y, r, 0, Math.PI * 2); ctx2d!.closePath(); ctx2d!.fill();
    }

    function draw() {
        drawRect(0, 0, canvas.width, canvas.height, 'black');
        // vertical paddles
        drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white');
        drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white');
        drawCircle(ballX, ballY, ballRadius, 'white');

        ctx2d!.fillStyle = 'white'; ctx2d!.textAlign = 'center';
        if (gameOver) {
            ctx2d!.font = '40px Arial';
            ctx2d!.fillText(currentTranslations['game_over'], canvas.width / 2, canvas.height / 2 - 100);
            ctx2d!.font = '20px Arial';
            ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
        } else if (!gameRunning) {
            ctx2d!.font = '40px Arial';
            ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
        }
    }

    /* -------------------------
       LÓGICA: reset y colisiones
       ------------------------- */
    function resetBall(flag: number = 1) {
        ballX = canvas.width / 2; ballY = canvas.height / 2;
        ballSpeedX = flag ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED; ballSpeedY = 0;
        if (isAI) { aiImmediateTick = true; aiTargetY = null; }
        prevGoingRight = ballSpeedX > 0; // <- reiniciar estado de dirección
    }
    
    function resetPaddles() {
        leftPaddleY = (canvas.height - paddleHeight) / 2;
        rightPaddleY = (canvas.height - paddleHeight) / 2;
    }

    function checkGameOver() {
        if (leftScore >= 5 || rightScore >= 5) {
            gameOver = true; 
            gameRunning = false;
            saveMatchIfNeeded();
        }
    }

    function updateScore() {
        const scoreEl = $('#score');
        if (!scoreEl) return;
        scoreEl.textContent = `${leftScore} : ${rightScore}`;
    }

    /* -------------------------
       UPDATE
       ------------------------- */
    function update() {
        if (!gameRunning || gameOver) return;
        // movimientos verticales normales (left/right)
        if (keys[keyLeftUp] && leftPaddleY > 0) leftPaddleY -= paddleSpeed;
        if (keys[keyLeftDown] && leftPaddleY + paddleHeight < canvas.height) leftPaddleY += paddleSpeed;
        if (keys[keyRightUp] && rightPaddleY > 0) rightPaddleY -= paddleSpeed;
        if (keys[keyRightDown] && rightPaddleY + paddleHeight < canvas.height) rightPaddleY += paddleSpeed;

        ballX += ballSpeedX; ballY += ballSpeedY;

        if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) ballSpeedY = -ballSpeedY;

        // colisiones con paddles verticales
        if (ballX - ballRadius < 20 && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
            const relativeIntersectY = (leftPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.hypot(ballSpeedX, ballSpeedY);
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = speed * Math.cos(bounceAngle);
            ballSpeedY = -speed * Math.sin(bounceAngle);
        }
        if (ballX + ballRadius > canvas.width - 20 && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
            const relativeIntersectY = (rightPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.hypot(ballSpeedX, ballSpeedY);
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = -speed * Math.cos(bounceAngle);
            ballSpeedY = -speed * Math.sin(bounceAngle);
        }

        // Detectar cambio de dirección hacia la pala derecha -> tick IA inmediato
        if (isAI) {
            const goingRightNow = ballSpeedX > 0;
            if (!prevGoingRight && goingRightNow) {
                aiImmediateTick = true; // re-evaluar objetivo YA
            }
            prevGoingRight = goingRightNow;
        }

        // puntuaciones
        if (ballX + ballRadius < 0) {
            rightScore++; updateScore(); checkGameOver(); resetBall(0); resetPaddles();
        }
        if (ballX - ballRadius > canvas.width) {
            leftScore++; updateScore(); checkGameOver(); resetBall(1); resetPaddles();
        }
    }

    /* -------------------------
       LOOP (limpieza y requestAnimationFrame)
       ------------------------- */
    (function loop() {
        if (!el.isConnected) {
            // soltar teclas virtuales
            synthKey(keyRightUp, 'keyup');
            synthKey(keyRightDown, 'keyup');

            subs.abort();
            return;
        }

        // Tick IA: cada 1000 ms
        if (isAI) {
            const now = performance.now();
            if (!gameRunning || gameOver) {
                if (aiDir !== 'none') setAIDirection('none');
                aiTargetY = null;
            } else if (aiImmediateTick) {
                updateAI();
                lastAIDecision = now;      // fijar fase a partir de este instante
                aiImmediateTick = false;
            } else if (now - lastAIDecision >= 1000) {
                updateAI();
                lastAIDecision = now;
            }

            // Guiado continuo: soltar/pulsar en cuanto llegue al objetivo
            if (gameRunning && aiTargetY != null) {
                steerAIToTarget();
            }
        }

        if (gameRunning) {
            update();
        }
        draw();
        requestAnimationFrame(loop);
    })();

    // antes de salir de la página, guardar si corresponde
    window.addEventListener('beforeunload', () => { if (gameOver) saveMatchIfNeeded(); });
}
