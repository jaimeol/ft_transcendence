import { currentTranslations, initializeLanguages } from "./translate.js";
import type { Ctx } from "./router.js";

type Player = { id: number; displayName?: string; email?: string } | null;

export async function mount(el: HTMLElement, ctx: Ctx) {
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

	<!-- Overlay login PVP (reutilizado para 1v1 y pasos 2v2) -->
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
	`;

	const subs = new AbortController();
	const on = <K extends keyof WindowEventMap>(type: K, handler: (ev: WindowEventMap[K]) => any) =>
		window.addEventListener(type, handler as any, { signal: subs.signal });

	await initializeLanguages();
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

	/* -------------------------
	   Variables del juego (comunes)
	   ------------------------- */
	const canvas = el.querySelector<HTMLCanvasElement>('#pong')!;
	const ctx2d = canvas.getContext('2d');
	if (!ctx2d) throw new Error("Could not obtain 2dcontext");

	const paddleWidth = 10, paddleHeight = 120, ballRadius = 10;
	const hPaddleWidth = 120, hPaddleHeight = 10; // horizontal paddles (para la segunda partida en duoAI / 2v2)
	const INITIAL_BALL_SPEED = 10, MAX_BALL_SPEED = 20, paddleSpeed = 8, hPaddleSpeed = 6;

	const keys: Record<string, boolean> = {};

	let leftPaddleY = (canvas.height - paddleHeight) / 2;
	let rightPaddleY = (canvas.height - paddleHeight) / 2;
	let topPaddleX = (canvas.width - hPaddleWidth) / 2;
	let bottomPaddleX = (canvas.width - hPaddleWidth) / 2;

	let ballX = canvas.width / 2, ballY = canvas.height / 2;
	let ballSpeedX = 0, ballSpeedY = 0;

	// segundo (vertical/horizontal) juego
	let ball2X = canvas.width / 2, ball2Y = canvas.height / 2;
	let ball2SpeedX = 0, ball2SpeedY = 0;

	let leftScore = 0, rightScore = 0;
	let topScore = 0, bottomScore = 0;

	let gameRunning = false, gameOver = false;
	let gameOver1 = false, gameOver2 = false; // para duoAI (dos subpartidas)
	let savedThisGame = false;
	let gameStartTs = performance.now();

	let secondPlayer: Player = null, thirdPlayer: Player = null, fourthPlayer: Player = null;
	let pvpReady = false;

	/* --- LECTURA DE QUERY PARAMS (mode, players, pvp_players, level) --- */
	const url = new URL(window.location.href);
	let mode = url.searchParams.get('mode');
	let players = url.searchParams.get('players'); // para isAI duo
	let pvpPlayers = url.searchParams.get('pvp_players'); // para pvp 2
	let difficulty = url.searchParams.get('level');

	const isAI = mode === 'ai';
	const isPVP = mode === 'pvp';
	const isPVP2v2 = isPVP && pvpPlayers === '2';
	const duoAI = (isAI && players === '2') || isPVP2v2;

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

	console.log('Mode:', { isAI, isPVP, duoAI, isPVP2v2, players, pvpPlayers, difficulty });

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

			// duoAI: guardar las dos subpartidas (horizontal + vertical)
			if (duoAI && secondPlayer) {
				// Partida horizontal (jugador "principal" vs IA)
				const bodyH = {
					mode: isPVP ? 'pvp' : 'ai',
					game: 'pong',
					level: difficulty || null,
					opponent_id: secondPlayer?.id ?? undefined,
					score_left: leftScore,
					score_right: rightScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(bodyH)
				});

				// Partida vertical (segundo jugador contra IA / otra pareja)
				const bodyV = {
					mode: isPVP ? 'pvp' : 'ai',
					game: 'pong',
					level: difficulty || null,
					user_id: secondPlayer?.id ?? undefined,
					score_left: bottomScore,
					score_right: topScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(bodyV)
				});
			} else if (isAI) {
				// simple 1v1 AI
				const body = {
					mode: 'ai',
					game: 'pong',
					level: difficulty || null,
					score_user: leftScore,
					score_ai: rightScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(body)
				});
			} else if (isPVP2v2 && pvpReady && secondPlayer && thirdPlayer && fourthPlayer) {
				// PVP 2v2 -> guardar 2 matches: (left vs right) y (bottom vs top)
				const bodyH = {
					mode: 'pvp',
					game: 'pong',
					opponent_id: secondPlayer.id,
					score_left: leftScore,
					score_right: rightScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(bodyH)
				});

				const bodyV = {
					mode: 'pvp',
					game: 'pong',
					user_id: thirdPlayer.id,
					opponent_id: fourthPlayer.id,
					score_left: bottomScore,
					score_right: topScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(bodyV)
				});
			} else if (isPVP && secondPlayer) {
				const body = {
					mode: 'pvp',
					game: 'pong',
					opponent_id: secondPlayer.id,
					score_left: leftScore,
					score_right: rightScore,
					duration_ms: duration
				};
				await fetch('/api/matches', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(body)
				});
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
	   PVP flow (1v1 y 2v2)
	   ------------------------- */
	if (isPVP && !pvpPlayers) {
		// si no han elegido pvp_players en query, pedimos modo (este bloque asumía HTML en la página original).
		// Para migración rápida, forzamos mostrar el overlay pvp-mode (si prefieres, puedes redirigir)
		// Aquí mostramos directamente el pvp-login overlay pidiendo 'pvp_players' mediante botones en la URL.
		// Para mantenerlo compacto: si no existe pvp_players, abrimos la overlay y al seleccionar reemplazamos URL.
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

	// Si es PVP o duoAI mostramos overlay de login / blocker
	if (isPVP || duoAI) {
		blocker?.classList.remove('hidden');
		const pvpOverlay = $('#pvp-login-overlay')!;
		pvpOverlay.classList.remove('hidden');

		const form = el.querySelector<HTMLFormElement>('#pvp-login-form')!;
		const errorEl = $('#pvp-login-error')!;
		const heading = $('#pvp-login-heading')!;
		if (isPVP && pvpPlayers === '1') {
			heading.textContent = ctx.t("pvp.second_player");
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
				} catch {
					errorEl.textContent = ctx.t("pvp_invalid_credentials") ?? "Credenciales inválidas";
					errorEl.classList.remove('hidden');
				}
			});
		} else if (isPVP && pvpPlayers === '2') {
			// multi-step: 2 -> 3 -> 4
			let step = 2;
			heading.textContent = ctx.t("pvp.second_player");
			form.addEventListener('submit', async (ev) => {
				ev.preventDefault();
				const emailEl = el.querySelector<HTMLInputElement>('#pvp-email')!;
				const passwordEl = el.querySelector<HTMLInputElement>('#pvp-password')!;
				const email = emailEl.value;
				const password = passwordEl.value;
				try {
					const res = await fetch('/api/auth/login-second', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ email, password }),
					});
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const data = await res.json();
					// evitar usuarios repetidos
					if ((secondPlayer && data.id === secondPlayer.id) || (thirdPlayer && data.id === thirdPlayer.id) || (fourthPlayer && data.id === fourthPlayer.id)) {
						throw new Error('Jugador ya usado');
					}
					if (step === 2) {
						secondPlayer = data;
						step = 3;
						heading.textContent = ctx.t("pvp.third_player") ?? "Tercer jugador";
						emailEl.value = ''; passwordEl.value = '';
						return;
					} else if (step === 3) {
						thirdPlayer = data;
						step = 4;
						heading.textContent = ctx.t("pvp.fourth_player") ?? "Cuarto jugador";
						emailEl.value = ''; passwordEl.value = '';
						return;
					} else if (step === 4) {
						fourthPlayer = data;
						pvpReady = true;
						pvpOverlay.classList.add('hidden');
						blocker?.classList.add('hidden');
						return;
					}
				} catch (err: unknown) {
					if (err instanceof Error) {
						errorEl.textContent = err.message || (ctx.t("pvp_invalid_credentials") ?? "Credenciales inválidas");
					} else {
						errorEl.textContent = ctx.t("pvp_invalid_credentials") ?? "Credenciales inválidas";
					}
					errorEl.classList.remove('hidden');
				}
			});
		} else if (duoAI) {
			// duoAI: pedimos login para el segundo jugador (que será "usuario 2")
			heading.textContent = ctx.t("pvp.second_player");
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
					($('#pvp-login-overlay')!).classList.add('hidden');
					blocker?.classList.add('hidden');
				} catch {
					errorEl.textContent = ctx.t("pvp_invalid_credentials") ?? "Credenciales inválidas";
					errorEl.classList.remove('hidden');
				}
			});
		}
	} else {
		// no pvp ni duoAI -> ocultar blocker
		blocker?.classList.add('hidden');
	}

	/* -------------------------
	   TECLAS (2v2 keys)
	   ------------------------- */
	// asignaciones especial para 2v2 local (si es PVP 2v2)
	const keyLeftUp = 'w';
	const keyLeftDown = 's';
	const keyRightUp = isPVP2v2 ? 't' : 'ArrowUp';
	const keyRightDown = isPVP2v2 ? 'g' : 'ArrowDown';
	// para la partida vertical (top/bottom) en 2v2 local
	const keyTopLeft = isPVP2v2 ? 'ArrowLeft' : 'a';
	const keyTopRight = isPVP2v2 ? 'ArrowRight' : 'd';
	const keyBottomLeft = isPVP2v2 ? 'k' : 'ArrowLeft';
	const keyBottomRight = isPVP2v2 ? 'l' : 'ArrowRight';

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
				if ((isPVP || duoAI) && !pvpReady) {
					const pvpOverlay = $('#pvp-login-overlay');
					if (pvpOverlay) { pvpOverlay.classList.remove('hidden'); pvpOverlay.classList.add('flex'); }
					return;
				}
				gameRunning = true;
				resetBall(1);
				if (duoAI) { resetBall2(1); resetHPaddles(); }
			} else if (gameOver) {
				// reiniciar todo
				leftScore = rightScore = topScore = bottomScore = 0;
				savedThisGame = false;
				gameOver = false; gameOver1 = false; gameOver2 = false;
				gameRunning = false;
				gameStartTs = performance.now();
				resetBall();
				resetPaddles();
				if (duoAI) { resetBall2(); resetHPaddles(); }
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
	   IA (para isAI y duoAI)
	   ------------------------- */
	let aiTimer1: number | null = null;
	let aiTimer2: number | null = null;

	if (isAI) {
		// prevenir que flechas queden indefinidas
		keys['ArrowUp'] = false; keys['ArrowDown'] = false;

		let aiPressedKey: string | null = null;
		let ai2PressedKey: string | null = null;

		const simulateKeyPress = (key: string) => {
			if (!keys[key]) window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		};
		const simulateKeyRelease = (key: string) => {
			if (keys[key]) window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
		};

		const predictballY = (): number => {
			let x = ballX, y = ballY, dx = ballSpeedX, dy = ballSpeedY;
			if (dx <= 0) return rightPaddleY + paddleHeight / 2;
			while (x < canvas.width - 20) {
				x += dx; y += dy;
				if (y - ballRadius < 0 || y + ballRadius > canvas.height) {
					dy *= -1;
					y = Math.max(ballRadius, Math.min(canvas.height - ballRadius, y));
				}
			}
			return y;
		};

		const updateAI = () => {
			if (!gameRunning || gameOver1) return;
			if (ballSpeedX <= 0) {
				if (aiPressedKey) { simulateKeyRelease(aiPressedKey); aiPressedKey = null; }
				return;
			}
			const predictedY = predictballY();
			const paddleCenter = rightPaddleY + paddleHeight / 2;
			const diff = predictedY - paddleCenter;
			let DEAD_ZONE = 60;
			if (difficulty === 'easy') DEAD_ZONE = 110;
			else if (difficulty === 'medium') DEAD_ZONE = 75;
			else if (difficulty === 'hard') DEAD_ZONE = 60;
			let keyToPress: string | null = null;
			if (diff < -DEAD_ZONE && rightPaddleY > 0) keyToPress = 'ArrowUp';
			else if (diff > DEAD_ZONE && rightPaddleY + paddleHeight < canvas.height) keyToPress = 'ArrowDown';
			if (keyToPress !== aiPressedKey) {
				if (aiPressedKey) simulateKeyRelease(aiPressedKey);
				if (keyToPress) simulateKeyPress(keyToPress);
				aiPressedKey = keyToPress;
			}
		};

		aiTimer1 = window.setInterval(updateAI, 100);

		// IA para la segunda partida (vertical/horizontal) si duoAI
		const predictball2X = (): number => {
			let x = ball2X, y = ball2Y, dx = ball2SpeedX, dy = ball2SpeedY;
			if (dy >= 0) return topPaddleX + hPaddleWidth / 2;
			while (y > 20) {
				x += dx; y += dy;
				if (x - ballRadius < 0 || x + ballRadius > canvas.width) {
					dx *= -1;
					x = Math.max(ballRadius, Math.min(canvas.width - ballRadius, x));
				}
			}
			return x;
		};
		const updateAIHorizontal = () => {
			if (!gameRunning || gameOver2) return;
			if (ball2SpeedY >= 0) {
				if (ai2PressedKey) { simulateKeyRelease(ai2PressedKey); ai2PressedKey = null; }
				return;
			}
			const predictedX = predictball2X();
			const paddleCenter = topPaddleX + hPaddleWidth / 2;
			const diff = predictedX - paddleCenter;
			let DEAD_ZONE_H = 60;
			if (difficulty === 'easy') DEAD_ZONE_H = 110;
			else if (difficulty === 'medium') DEAD_ZONE_H = 75;
			else if (difficulty === 'hard') DEAD_ZONE_H = 60;
			let keyToPress: string | null = null;
			if (diff < -DEAD_ZONE_H && topPaddleX > 0) keyToPress = 'a';
			else if (diff > DEAD_ZONE_H && topPaddleX + hPaddleWidth < canvas.width) keyToPress = 'd';
			if (keyToPress !== ai2PressedKey) {
				if (ai2PressedKey) simulateKeyRelease(ai2PressedKey);
				if (keyToPress) simulateKeyPress(keyToPress);
				ai2PressedKey = keyToPress;
			}
		};
		aiTimer2 = window.setInterval(updateAIHorizontal, 100);
	}

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

		// si duoAI (o pvp 2v2 local), dibujar el segundo juego (horizontal paddles)
		if (duoAI) {
			drawRect(topPaddleX, 10, hPaddleWidth, hPaddleHeight, 'white');
			drawRect(bottomPaddleX, canvas.height - 20, hPaddleWidth, hPaddleHeight, 'white');
			drawCircle(ball2X, ball2Y, ballRadius, 'white');
		}

		ctx2d!.fillStyle = 'white'; ctx2d!.textAlign = 'center';
		if (gameOver) {
			ctx2d!.font = '40px Arial';
			ctx2d!.fillText(currentTranslations['game_over'], canvas.width / 2, canvas.height / 2 - 100);
			ctx2d!.font = '20px Arial';
			ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
		} else if (!gameRunning) {
			ctx2d!.font = '40px Arial';
			ctx2d!.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
		} else if (duoAI && gameOver1 && !gameOver2) {
			ctx2d!.font = '20px Arial';
			ctx2d!.fillText('Partida 1 terminada', canvas.width / 2, canvas.height / 2 - 60);
		} else if (duoAI && !gameOver1 && gameOver2) {
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
	}
	function resetBall2(dir: number = 1) {
		ball2X = canvas.width / 2; ball2Y = canvas.height / 2;
		ball2SpeedX = 0; ball2SpeedY = dir * INITIAL_BALL_SPEED;
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
		// comportamientos distintos según duoAI o no
		if (duoAI) {
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
		} else {
			if (leftScore >= 5 || rightScore >= 5) {
				gameOver = true; gameRunning = false;
				saveMatchIfNeeded();
			}
		}
	}

	function updateScore() {
		const scoreEl = $('#score');
		if (!scoreEl) return;
		if (duoAI) {
			scoreEl.textContent = `P1 ${leftScore}-${rightScore} | P2 ${bottomScore}-${topScore}`;
		} else {
			scoreEl.textContent = `${leftScore} : ${rightScore}`;
		}
	}

	/* -------------------------
	   UPDATE HORIZONTAL (P1)
	   ------------------------- */
	function update() {
		if (!gameRunning || gameOver1) return;
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
			// limpieza timers IA
			if (aiTimer1) clearInterval(aiTimer1);
			if (aiTimer2) clearInterval(aiTimer2);
			subs.abort();
			return;
		}
		if (gameRunning) {
			update();
			if (duoAI) updateVertical();
		}
		draw();
		requestAnimationFrame(loop);
	})();

	// antes de salir de la página, guardar si corresponde
	window.addEventListener('beforeunload', () => { if (gameOver) saveMatchIfNeeded(); });
}
