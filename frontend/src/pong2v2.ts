import { currentTranslations, initializeLanguages } from "./translate.js";
import type { Ctx } from "./router.js";

type Player = { id: number; displayName?: string; email?: string } | null;

export async function mount(el: HTMLElement, ctx: Ctx) {
	// Inicializar traducciones y configuración
	await initializeLanguages();
	
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
				Ft_Transcendence — Pong 2v2
				</span>
			</h1>
			<div id="score" class="mt-2 text-white/70 text-lg font-mono">P1 0-0 | P2 0-0</div>
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

	<!-- Selector de modo (nuevo) -->
	<div id="mode-overlay" class="fixed inset-0 bg-black/80 hidden items-center justify-center z-50">
		<div class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl w-[min(92vw,28rem)]">
			<h2 class="text-2xl font-bold mb-6 text-center">Selecciona Modo</h2>
			<div class="flex flex-col gap-3 items-center justify-center">
				<button type="button" class="mode-btn bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded font-semibold w-full" data-mode="ai">2 Jugadores vs IA</button>
				<button type="button" class="mode-btn bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded font-semibold w-full" data-mode="pvp">2 Jugadores vs 2 Jugadores</button>
			</div>
		</div>
	</div>

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

	<!-- Overlay login para el segundo jugador -->
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
			<p id="pvp-login-error" class="text-red-400 text-sm mt-3 hidden"></p>
		</div>
	</div>

	<!-- Login para el tercer jugador (nuevo) -->
	<div id="pvp-login-overlay3" class="fixed inset-0 hidden flex items-center justify-center bg-black/60 z-50">
		<div class="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 w-full max-w-md">
			<h2 class="text-xl font-semibold mb-4">Jugador 3 (Equipo Rival)</h2>
			<form id="pvp-login-form3" class="flex flex-col gap-3">
				<input id="pvp-email3" type="email" placeholder="Email"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
				<input id="pvp-password3" type="password" placeholder="Contraseña"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
				<button type="submit" class="rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2 font-semibold">
					Continuar
				</button>
			</form>
			<p id="pvp-login-error3" class="text-red-400 text-sm mt-3 hidden"></p>
		</div>
	</div>

	<!-- Login para el cuarto jugador (nuevo) -->
	<div id="pvp-login-overlay4" class="fixed inset-0 hidden flex items-center justify-center bg-black/60 z-50">
		<div class="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 w-full max-w-md">
			<h2 class="text-xl font-semibold mb-4">Jugador 4 (Equipo Rival)</h2>
			<form id="pvp-login-form4" class="flex flex-col gap-3">
				<input id="pvp-email4" type="email" placeholder="Email"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
				<input id="pvp-password4" type="password" placeholder="Contraseña"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
				<button type="submit" class="rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2 font-semibold">
					Iniciar Partida
				</button>
			</form>
			<p id="pvp-login-error4" class="text-red-400 text-sm mt-3 hidden"></p>
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

	// SPA nav binding for header link(s)
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

	const diffOverlay = $('#difficulty-overlay');
	const blocker = $('#board-blocker');

	/* -------------------------
	   Variables del juego
	   ------------------------- */
	const canvas = el.querySelector<HTMLCanvasElement>('#pong')!;
	const ctx2d = canvas.getContext('2d');
	if (!ctx2d) throw new Error("Could not obtain 2dcontext");

	const paddleWidth = 10, paddleHeight = 120, ballRadius = 10;
	const hPaddleWidth = 120, hPaddleHeight = 10; // horizontal paddles
	const INITIAL_BALL_SPEED = 10, MAX_BALL_SPEED = 20, paddleSpeed = 8, hPaddleSpeed = 6;

	const keys: Record<string, boolean> = {};

	let leftPaddleY = (canvas.height - paddleHeight) / 2;
	let rightPaddleY = (canvas.height - paddleHeight) / 2;
	let topPaddleX = (canvas.width - hPaddleWidth) / 2;
	let bottomPaddleX = (canvas.width - hPaddleWidth) / 2;

	let ballX = canvas.width / 2, ballY = canvas.height / 2;
	let ballSpeedX = 0, ballSpeedY = 0;

	// segundo juego (vertical/horizontal)
	let ball2X = canvas.width / 2, ball2Y = canvas.height / 2;
	let ball2SpeedX = 0, ball2SpeedY = 0;

	let leftScore = 0, rightScore = 0;
	let topScore = 0, bottomScore = 0;

	let gameRunning = false, gameOver = false;
	let gameOver1 = false, gameOver2 = false; // para las dos subpartidas
	let savedThisGame = false;
	let gameStartTs = performance.now();

	let secondPlayer: Player = null;
	let thirdPlayer: Player = null;
	let fourthPlayer: Player = null;
	let pvpReady = false;
	let pvpReady3 = false;
	let pvpReady4 = false;

	/* --- Leer query params --- */
	const url = new URL(window.location.href);
	let players = url.searchParams.get('players') || "1"; // número de jugadores por equipo
	let difficulty = url.searchParams.get('level');
	let mode = url.searchParams.get('mode') || ""; // "ai" o "pvp"

	// Mostrar selector de modo si no está especificado
	if (!mode) {
		const modeOverlay = $('#mode-overlay');
		if (modeOverlay) {
			modeOverlay.classList.remove('hidden');
			modeOverlay.classList.add('flex');
			modeOverlay.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(btn => {
				btn.addEventListener('click', () => {
					const m = btn.getAttribute('data-mode')!;
					url.searchParams.set('mode', m);
					if (m === 'ai') {
						// Para modo AI, pedir selección de dificultad
						diffOverlay?.classList.remove('hidden');
						diffOverlay?.classList.add('flex');
					} else {
						// Para modo PVP, no necesitamos dificultad
						window.location.replace(`${window.location.pathname}?${url.searchParams.toString()}`);
					}
					modeOverlay.classList.add('hidden');
				});
			});
		}
		blocker?.classList.remove('hidden');
		return;
	}

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
                const res = await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    console.error('POST /api/matches failed', res.status, res.statusText, body, txt);
                    throw new Error(`POST /api/matches ${res.status}`);
                }
            };

			// Export AI 1v1 (según backend: score_user/score_ai)
            const exportAI = async (opts: {
                score_user: number; score_ai: number;
                level?: string | null;
                as_user_id?: number;
                subgame: 'vertical' | 'horizontal';
            }) => {
                const body: any = {
                    game: 'pong',
                    mode: 'ai',
                    score_user: opts.score_user,
                    score_ai: opts.score_ai,
                    level: opts.level ?? null,
                    duration_ms: duration,
                    from: 'pong2v2',
                    subgame: opts.subgame,
                };
                if (opts.as_user_id) body.as_user_id = opts.as_user_id;
                await post(body);
            };

            // Export PVP 1v1 (según backend: opponent_id + score_left/right)
            const exportPVP = async (opts: {
                score_left: number; score_right: number;
                opponent_id: number;
                as_user_id?: number;
                subgame: 'vertical' | 'horizontal';
            }) => {
                const body: any = {
                    game: 'pong',
                    mode: 'pvp',
                    score_left: opts.score_left,
                    score_right: opts.score_right,
                    opponent_id: opts.opponent_id,
                    duration_ms: duration,
                    from: 'pong2v2',
                    subgame: opts.subgame,
                };
                if (opts.as_user_id) body.as_user_id = opts.as_user_id;
                await post(body);
            };

            if (mode === 'ai' && secondPlayer) {
                // Vertical: usuario (izquierda) vs IA
                await exportAI({
                    score_user: leftScore,
                    score_ai: rightScore,
                    level: difficulty || null,
                    subgame: 'vertical',
                });
                // Horizontal: segundo jugador (abajo->left) vs IA
                await exportAI({
                    score_user: bottomScore,
                    score_ai: topScore,
                    level: difficulty || null,
                    as_user_id: secondPlayer?.id,
                    subgame: 'horizontal',
                });
            } else if (mode === 'pvp' && secondPlayer && thirdPlayer && fourthPlayer) {
                // Vertical: usuario (izquierda) vs jugador 3 (derecha)
                await exportPVP({
                    score_left: leftScore,
                    score_right: rightScore,
                    opponent_id: thirdPlayer!.id,
                    subgame: 'vertical',
                });
                // Horizontal: jugador 2 (abajo->left) vs jugador 4 (arriba->right)
                await exportPVP({
                    score_left: bottomScore,
                    score_right: topScore,
                    opponent_id: fourthPlayer!.id,
                    as_user_id: secondPlayer!.id,
                    subgame: 'horizontal',
                });
            }

            savedThisGame = true;
        } catch (e) {
            console.warn('No se pudo guardar el/los match(es):', e);
        }
    }

	// Inicial: mostrar overlay de dificultad si no está especificada
	if (mode === 'ai') {
		if (!difficulty) {
			diffOverlay?.classList.remove('hidden');
			diffOverlay?.classList.add('flex');
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
	} else {
		// En PVP nunca mostrar selector de dificultad
		diffOverlay?.classList.add('hidden');
	}

	/* -------------------------
	   Login para el segundo jugador
	   ------------------------- */
	blocker?.classList.remove('hidden');
	const pvpOverlay = $('#pvp-login-overlay')!;
	pvpOverlay.classList.remove('hidden');

	// Función genérica para manejar login
	async function handlePlayerLogin(
		email: string,
		password: string,
		successCallback: (player: Player) => void,
		errorElement: HTMLElement
	) {
		try {
			const res = await fetch('/api/auth/login-second', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password }),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			successCallback(data);
		} catch {
			errorElement.textContent = "Credenciales inválidas";
			errorElement.classList.remove('hidden');
		}
	}

	// Configurar login para el segundo jugador
	const form = el.querySelector<HTMLFormElement>('#pvp-login-form')!;
	const errorEl = $('#pvp-login-error')!;
	
	form.addEventListener('submit', async (ev) => {
		ev.preventDefault();
		const email = (el.querySelector<HTMLInputElement>('#pvp-email')!).value;
		const password = (el.querySelector<HTMLInputElement>('#pvp-password')!).value;
		
		await handlePlayerLogin(email, password, (player) => {
			secondPlayer = player;
			pvpReady = true;
			pvpOverlay.classList.add('hidden');
			
			// Si es modo pvp, mostrar login para jugador 3
			if (mode === 'pvp') {
				const pvpOverlay3 = $('#pvp-login-overlay3')!;
				pvpOverlay3.classList.remove('hidden');
			} else {
				// Modo AI, ya podemos empezar
				blocker?.classList.add('hidden');
			}
		}, errorEl);
	});

	// Configurar login para el tercer jugador (solo en modo pvp)
	if (mode === 'pvp') {
		const form3 = el.querySelector<HTMLFormElement>('#pvp-login-form3')!;
		const errorEl3 = $('#pvp-login-error3')!;
		
		form3.addEventListener('submit', async (ev) => {
			ev.preventDefault();
			const email = (el.querySelector<HTMLInputElement>('#pvp-email3')!).value;
			const password = (el.querySelector<HTMLInputElement>('#pvp-password3')!).value;
			
			await handlePlayerLogin(email, password, (player) => {
				thirdPlayer = player;
				pvpReady3 = true;
				
				// Ocultar este overlay y mostrar el del jugador 4
				$('#pvp-login-overlay3')!.classList.add('hidden');
				$('#pvp-login-overlay4')!.classList.remove('hidden');
			}, errorEl3);
		});

		// Configurar login para el cuarto jugador
		const form4 = el.querySelector<HTMLFormElement>('#pvp-login-form4')!;
		const errorEl4 = $('#pvp-login-error4')!;
		
		form4.addEventListener('submit', async (ev) => {
			ev.preventDefault();
			const email = (el.querySelector<HTMLInputElement>('#pvp-email4')!).value;
			const password = (el.querySelector<HTMLInputElement>('#pvp-password4')!).value;
			
			await handlePlayerLogin(email, password, (player) => {
				fourthPlayer = player;
				pvpReady4 = true;
				
				// Todos los jugadores listos, ocultar overlay y desbloquear juego
				$('#pvp-login-overlay4')!.classList.add('hidden');
				blocker?.classList.add('hidden');
			}, errorEl4);
		});
	}

	/* -------------------------
	   TECLAS (asignación según modo)
	   ------------------------- */
	// Controles para paddle vertical izquierdo (jugador 1)
	const keyLeftUp = 'w';
	const keyLeftDown = 's';
	
	// Controles para paddle vertical derecho (jugador 3 en modo pvp, IA en modo ai)
	const keyRightUp = mode === 'pvp' ? 'i' : 'ArrowUp';
	const keyRightDown = mode === 'pvp' ? 'k' : 'ArrowDown';
	
	// Controles para paddle horizontal superior (jugador 4 en modo pvp, IA en modo ai)
	const keyTopLeft = mode === 'pvp' ? 'z' : 'a';
	const keyTopRight = mode === 'pvp' ? 'x' : 'd';
	
	// Controles para paddle horizontal inferior (jugador 2)
	const keyBottomLeft = 'ArrowLeft';
	const keyBottomRight = 'ArrowRight';

	/* -------------------------
	   Handlers de teclado
	   ------------------------- */
	const onKeyDown = (e: KeyboardEvent) => {
		// Bloquear teclas controladas por la IA en modo 'ai'
		if (mode === 'ai' && e.isTrusted && (
			e.key === keyRightUp || e.key === keyRightDown ||
			e.key === keyTopLeft || e.key === keyTopRight
		)) return;

		keys[e.key] = true;

		if (e.key === ' ') {
			// space: iniciar / reiniciar
			if (!difficulty && mode === 'ai') {
				diffOverlay?.classList.remove('hidden');
				blocker?.classList.remove('hidden');
				return;
			}
			if (!gameRunning && !gameOver) {
				// Verificar que todos los jugadores estén listos
				if (!pvpReady) {
					$('#pvp-login-overlay')!.classList.remove('hidden');
					return;
				}
				
				// En modo pvp, verificar los jugadores adicionales
				if (mode === 'pvp' && (!pvpReady3 || !pvpReady4)) {
					if (!pvpReady3) {
						$('#pvp-login-overlay3')!.classList.remove('hidden');
					} else {
						$('#pvp-login-overlay4')!.classList.remove('hidden');
					}
					return;
				}
				
				gameRunning = true;
				resetBall(1);
				resetBall2(1); 
				resetHPaddles();
				gameStartTs = performance.now();
			} else if (gameOver) {
				// reiniciar todo
				leftScore = rightScore = topScore = bottomScore = 0;
				savedThisGame = false;
				gameOver = false; 
				gameOver1 = false; 
				gameOver2 = false;
				gameRunning = false;
				gameStartTs = performance.now();
				resetBall();
				resetPaddles();
				resetBall2(); 
				resetHPaddles();
				updateScore();
			}
		}
	};
	
	const onKeyUp = (e: KeyboardEvent) => {
		if (mode === 'ai' && e.isTrusted && (
			e.key === keyRightUp || e.key === keyRightDown ||
			e.key === keyTopLeft || e.key === keyTopRight
		)) return;

		keys[e.key] = false;
	};

	on('keydown', onKeyDown);
	on('keyup', onKeyUp);
	on('beforeunload', () => { if (gameOver) saveMatchIfNeeded(); });

	/* -------------------------
	   IA para los paddles (solo en modo ai)
	   ------------------------- */
	// Reemplaza la IA anterior (timers) por "visión cada 1000ms + guiado continuo"
	// Simulación de teclado: actualizar keys[] y despachar eventos
	let aiVDir: 'up' | 'down' | 'none' = 'none';
	let aiHDir: 'left' | 'right' | 'none' = 'none';

	let aiVImmediateTick = false;
	let aiHImmediateTick = false;

	let aiVTargetY: number | null = null;
	let aiHTargetX: number | null = null;

	let aiVDeadZone = 12; // se ajusta por dificultad en cada tick
	let aiHDeadZone = 24;

	let prevGoingRight = false; // para la bola vertical (partida 1)
	let prevGoingUp = false;    // para la bola horizontal (partida 2)

	let lastAIVDecision = 0;
	let lastAIHDecision = 0;

	const synthKey = (key: string, type: 'keydown' | 'keyup') => {
		const evt = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
		window.dispatchEvent(evt);
	};
	const press = (key: string, down: boolean) => {
		keys[key] = down;
		synthKey(key, down ? 'keydown' : 'keyup');
	};

	const setAIVDirection = (dir: 'up' | 'down' | 'none') => {
		if (aiVDir === dir) return;
		if (aiVDir === 'up') press(keyRightUp, false);
		if (aiVDir === 'down') press(keyRightDown, false);
		aiVDir = dir;
		if (aiVDir === 'up') press(keyRightUp, true);
		if (aiVDir === 'down') press(keyRightDown, true);
	};

	const setAIHDirection = (dir: 'left' | 'right' | 'none') => {
		if (aiHDir === dir) return;
		if (aiHDir === 'left') press(keyTopLeft, false);
		if (aiHDir === 'right') press(keyTopRight, false);
		aiHDir = dir;
		if (aiHDir === 'left') press(keyTopLeft, true);
		if (aiHDir === 'right') press(keyTopRight, true);
	};

	// Predicción vertical (bola hacia pala derecha)
	const predictBallYAtRight = (): number => {
		if (ballSpeedX <= 0) {
			// No recoloques: si no hay objetivo, usa el centro actual de la pala
			return (aiVTargetY ?? (rightPaddleY + paddleHeight / 2));
		}
		let simX = ballX, simY = ballY;
		let vx = ballSpeedX, vy = ballSpeedY;
		const targetX = canvas.width - 20 - ballRadius;
		let it = 0;
		const maxIt = 4000;
		while (simX < targetX && it++ < maxIt) {
			simX += vx; simY += vy;
			if (simY <= ballRadius) { simY = ballRadius; vy = Math.abs(vy); }
			else if (simY >= canvas.height - ballRadius) { simY = canvas.height - ballRadius; vy = -Math.abs(vy); }
		}
		let predicted = (it >= maxIt) ? (rightPaddleY + paddleHeight / 2) : simY;

		// Ruido según dificultad
		let err = 0;
		if (difficulty === 'easy') err = canvas.height * 0.14;
		else if (difficulty === 'medium') err = canvas.height * 0.06;
		else err = canvas.height * 0.02;
		if (Math.abs(vy) < 1) err *= 0.5;
		predicted += (Math.random() * 2 - 1) * err;

		const margin = 8;
		const minY = paddleHeight / 2 + margin;
		const maxY = canvas.height - paddleHeight / 2 - margin;
		return Math.max(minY, Math.min(maxY, predicted));
	};

	// Predicción horizontal (bola hacia pala superior)
	const predictBall2XAtTop = (): number => {
		if (ball2SpeedY >= 0) {
			return (aiHTargetX ?? (topPaddleX + hPaddleWidth / 2));
		}
		let simX = ball2X, simY = ball2Y;
		let vx = ball2SpeedX, vy = ball2SpeedY;
		const targetY = 20 + ballRadius; // cara inferior de la pala superior
		let it = 0;
		const maxIt = 4000;
		while (simY > targetY && it++ < maxIt) {
			simX += vx; simY += vy;
			if (simX <= ballRadius) { simX = ballRadius; vx = Math.abs(vx); }
			else if (simX >= canvas.width - ballRadius) { simX = canvas.width - ballRadius; vx = -Math.abs(vx); }
		}
		let predicted = (it >= maxIt) ? (topPaddleX + hPaddleWidth / 2) : simX;

		// Ruido según dificultad
		let err = 0;
		if (difficulty === 'easy') err = canvas.width * 0.14;
		else if (difficulty === 'medium') err = canvas.width * 0.06;
		else err = canvas.width * 0.02;
		if (Math.abs(vx) < 1) err *= 0.5;
		predicted += (Math.random() * 2 - 1) * err;

		const margin = 8;
		const minX = hPaddleWidth / 2 + margin;
		const maxX = canvas.width - hPaddleWidth / 2 - margin;
		return Math.max(minX, Math.min(maxX, predicted));
	};

	// Guiado continuo
	const steerVertical = () => {
		if (!gameRunning || gameOver1 || aiVTargetY == null) { setAIVDirection('none'); return; }
		const center = rightPaddleY + paddleHeight / 2;
		let diff = aiVTargetY - center;

		// zona muerta dinámica al acercarse al impacto
		let localDead = aiVDeadZone;
		const targetX = canvas.width - 20 - ballRadius;
		const distX = targetX - ballX;
		if (ballSpeedX > 0) {
			if (distX < 160) localDead = Math.min(localDead, 1);
			if (distX < 90) localDead = 0;
		}

		if (Math.abs(diff) <= localDead) setAIVDirection('none');
		else setAIVDirection(diff < 0 ? 'up' : 'down');
	};

	const steerHorizontal = () => {
		if (!gameRunning || gameOver2 || aiHTargetX == null) { setAIHDirection('none'); return; }
		const center = topPaddleX + hPaddleWidth / 2;
		let diff = aiHTargetX - center;

		// zona muerta dinámica al acercarse al impacto
		let localDead = aiHDeadZone;
		const targetY = 20 + ballRadius;
		const distY = ball2Y - targetY;
		if (ball2SpeedY < 0) {
			if (distY < 160) localDead = Math.min(localDead, 2);
			if (distY < 90) localDead = 0;
		}

		if (Math.abs(diff) <= localDead) setAIHDirection('none');
		else setAIHDirection(diff < 0 ? 'left' : 'right');
	};

	const updateAIV = () => {
		if (!gameRunning || gameOver1) { aiVTargetY = null; setAIVDirection('none'); return; }
		// dead zone por dificultad
		if (difficulty === 'easy') aiVDeadZone = 18;
		else if (difficulty === 'medium') aiVDeadZone = 12;
		else aiVDeadZone = 6;

		if (ballSpeedX > 0) {
			aiVTargetY = predictBallYAtRight();
		} else {
			if (aiVTargetY == null) aiVTargetY = rightPaddleY + paddleHeight / 2;
		}
		steerVertical();
	};

	const updateAIH = () => {
		if (!gameRunning || gameOver2) { aiHTargetX = null; setAIHDirection('none'); return; }
		// dead zone por dificultad (un poco mayor en horizontal)
		if (difficulty === 'easy') aiHDeadZone = 24;
		else if (difficulty === 'medium') aiHDeadZone = 16;
		else aiHDeadZone = 8;

		if (ball2SpeedY < 0) {
			aiHTargetX = predictBall2XAtTop();
		} else {
			if (aiHTargetX == null) aiHTargetX = topPaddleX + hPaddleWidth / 2;
		}
		steerHorizontal();
	};

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
		
		// vertical paddles (partida 1)
		drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white');
		drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white');
		drawCircle(ballX, ballY, ballRadius, 'white');

		// horizontal paddles (partida 2)
		drawRect(topPaddleX, 10, hPaddleWidth, hPaddleHeight, 'white');
		drawRect(bottomPaddleX, canvas.height - 20, hPaddleWidth, hPaddleHeight, 'white');
		drawCircle(ball2X, ball2Y, ballRadius, 'white');

		ctx2d!.fillStyle = 'white'; ctx2d!.textAlign = 'center';
		if (gameOver) {
			ctx2d!.font = '40px Arial';
			ctx2d!.fillText(currentTranslations['game_over'], canvas.width / 2, canvas.height / 2 - 100);
			ctx2d!.font = '20px Arial';
			ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
		} else if (!gameRunning) {
			ctx2d!.font = '40px Arial';
			ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
		} else if (gameOver1 && !gameOver2) {
			ctx2d!.font = '20px Arial';
			ctx2d!.fillText('Partida 1 terminada', canvas.width / 2, canvas.height / 2 - 60);
		} else if (!gameOver1 && gameOver2) {
			ctx2d!.font = '20px Arial';
			ctx2d!.fillText('Partida 2 terminada', canvas.width / 2, canvas.height / 2 - 60);
		}
	}

	/* -------------------------
	   LÓGICA: reset y colisiones
	   ------------------------- */
	function resetBall(flag: number = 1) {
		ballX = canvas.width / 2; ballY = canvas.height / 2;
		ballSpeedX = flag ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED; ballSpeedY = 0;
		// IA: tick inmediato y estado de dirección
		if (mode === 'ai') { aiVImmediateTick = true; aiVTargetY = null; }
		prevGoingRight = ballSpeedX > 0;
	}
	
	function resetBall2(dir: number = 1) {
		ball2X = canvas.width / 2; ball2Y = canvas.height / 2;
		ball2SpeedX = 0; ball2SpeedY = dir * INITIAL_BALL_SPEED;
		// IA: tick inmediato y estado de dirección
		if (mode === 'ai') { aiHImmediateTick = true; aiHTargetX = null; }
		prevGoingUp = ball2SpeedY < 0;
	}
	
	function resetPaddles() {
		leftPaddleY = (canvas.height - paddleHeight) / 2;
		rightPaddleY = (canvas.height - paddleHeight) / 2;
	}
	
	function resetHPaddles() {
		topPaddleX = (canvas.width - hPaddleWidth) / 2;
		bottomPaddleX = (canvas.width - hPaddleWidth) / 2;
	}

	function checkGameOver() {
		if (leftScore >= 5 || rightScore >= 5) {
			gameOver1 = true;
		}
		if (topScore >= 5 || bottomScore >= 5) {
			gameOver2 = true;
		}
		if (gameOver1 && gameOver2) {
			gameOver = true; gameRunning = false;
			saveMatchIfNeeded();
		}
	}

	function updateScore() {
		const scoreEl = $('#score');
		if (!scoreEl) return;
		scoreEl.textContent = `P1 ${leftScore}-${rightScore} | P2 ${bottomScore}-${topScore}`;
	}

	/* -------------------------
	   UPDATE HORIZONTAL (P1)
	   ------------------------- */
	function update() {
		if (!gameRunning || gameOver1) return;
		
		// movimientos verticales (left/right)
		if (keys[keyLeftUp] && leftPaddleY > 0) leftPaddleY -= paddleSpeed;
		if (keys[keyLeftDown] && leftPaddleY + paddleHeight < canvas.height) leftPaddleY += paddleSpeed;
		
		// Actualizar paddle derecho (controlado por IA o jugador 3)
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

		// Detectar cambio a "viene hacia la derecha" -> tick IA inmediato
		if (mode === 'ai') {
			const goingRightNow = ballSpeedX > 0;
			if (!prevGoingRight && goingRightNow) aiVImmediateTick = true;
			prevGoingRight = goingRightNow;
		}

		// puntuaciones horizontales
		if (ballX + ballRadius < 0) {
			rightScore++; updateScore(); checkGameOver(); resetBall(0); resetPaddles();
		}
		if (ballX - ballRadius > canvas.width) {
			leftScore++; updateScore(); checkGameOver(); resetBall(1); resetPaddles();
		}
	}

	/* -------------------------
	   UPDATE VERTICAL / HORIZONTAL (segundo juego)
	   ------------------------- */
	function updateVertical() {
		if (!gameRunning || gameOver2) return;

		// controles para top/bottom (horizontal paddles)
		if (keys[keyBottomLeft] && bottomPaddleX > 0) bottomPaddleX -= hPaddleSpeed;
		if (keys[keyBottomRight] && bottomPaddleX + hPaddleWidth < canvas.width) bottomPaddleX += hPaddleSpeed;
		if (keys[keyTopLeft] && topPaddleX > 0) topPaddleX -= hPaddleSpeed;
		if (keys[keyTopRight] && topPaddleX + hPaddleWidth < canvas.width) topPaddleX += hPaddleSpeed;

		ball2X += ball2SpeedX; ball2Y += ball2SpeedY;

		// rebotar en paredes laterales
		if (ball2X - ballRadius < 0 || ball2X + ballRadius > canvas.width) ball2SpeedX = -ball2SpeedX;

		// colisiones con paddles horizontales
		if (ball2Y - ballRadius < 20 && ball2X > topPaddleX && ball2X < topPaddleX + hPaddleWidth) {
			const relativeIntersectX = (topPaddleX + hPaddleWidth / 2) - ball2X;
			const normalized = relativeIntersectX / (hPaddleWidth / 2);
			const bounceAngle = normalized * (Math.PI / 4);
			const currentSpeed = Math.hypot(ball2SpeedX, ball2SpeedY);
			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
			ball2SpeedY = speed * Math.cos(bounceAngle);
			ball2SpeedX = -speed * Math.sin(bounceAngle);
		}
		
		if (ball2Y + ballRadius > canvas.height - 20 && ball2X > bottomPaddleX && ball2X < bottomPaddleX + hPaddleWidth) {
			const relativeIntersectX = (bottomPaddleX + hPaddleWidth / 2) - ball2X;
			const normalized = relativeIntersectX / (hPaddleWidth / 2);
			const bounceAngle = normalized * (Math.PI / 4);
			const currentSpeed = Math.hypot(ball2SpeedX, ball2SpeedY);
			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
			ball2SpeedY = -speed * Math.cos(bounceAngle);
			ball2SpeedX = -speed * Math.sin(bounceAngle);
		}

		// Detectar cambio a "sube hacia la pala superior" -> tick IA inmediato
		if (mode === 'ai') {
			const goingUpNow = ball2SpeedY < 0;
			if (!prevGoingUp && goingUpNow) aiHImmediateTick = true;
			prevGoingUp = goingUpNow;
		}

		// puntuaciones verticales
		if (ball2Y - ballRadius < 0) {
			bottomScore++; updateScore(); checkGameOver(); resetBall2(1); resetHPaddles();
		} else if (ball2Y + ballRadius > canvas.height) {
			topScore++; updateScore(); checkGameOver(); resetBall2(-1); resetHPaddles();
		}
	}

	/* -------------------------
	   LOOP (limpieza y requestAnimationFrame)
	   ------------------------- */
	(function loop() {
		if (!el.isConnected) {
			if (mode === 'ai') {
				synthKey(keyRightUp, 'keyup');
				synthKey(keyRightDown, 'keyup');
				synthKey(keyTopLeft, 'keyup');
				synthKey(keyTopRight, 'keyup');
			}
			subs.abort();
			return;
		}

		// Ticks IA cada 1000 ms con primer tick inmediato
		if (mode === 'ai') {
			const now = performance.now();

			// Vertical (pala derecha)
			if (!gameRunning || gameOver1) {
				if (aiVDir !== 'none') setAIVDirection('none');
				aiVTargetY = null;
			} else if (aiVImmediateTick) {
				updateAIV();
				lastAIVDecision = now;
				aiVImmediateTick = false;
			} else if (now - lastAIVDecision >= 1000) {
				updateAIV();
				lastAIVDecision = now;
			}
			if (gameRunning && aiVTargetY != null) steerVertical();

			// Horizontal (pala superior)
			if (!gameRunning || gameOver2) {
				if (aiHDir !== 'none') setAIHDirection('none');
				aiHTargetX = null;
			} else if (aiHImmediateTick) {
				updateAIH();
				lastAIHDecision = now;
				aiHImmediateTick = false;
			} else if (now - lastAIHDecision >= 1000) {
				updateAIH();
				lastAIHDecision = now;
			}
			if (gameRunning && aiHTargetX != null) steerHorizontal();
		}

		if (gameRunning) {
			update();
			updateVertical();
		}
		draw();
		requestAnimationFrame(loop);
	})();
}