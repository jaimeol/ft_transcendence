import { currentTranslations, initializeLanguages } from "./translate.js";
export async function mount(el, ctx) {
    el.innerHTML = `
	<header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
		<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/home" class="flex items-center gap-2">
				<div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
				<span class="font-semibold">ft_transcendence</span>
			</a>

			<div class="flex items-center gap-3">
				<div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-xs backdrop-blur">
					<button class="hover:underline" onclick="changeLanguage?.('en')">EN</button>
					<span class="mx-1 text-white/40">|</span>
					<button class="hover:underline" onclick="changeLanguage?.('es')">ES</button>
					<span class="mx-1 text-white/40">|</span>
					<button class="hover:underline" onclick="changeLanguage?.('fr')">FR</button>
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
					class="absolute inset-0 bg-black z-40"
				></div>
				</div>
			</div>
			</section>
		</div>
	</main>

	<!-- Overlay de dificultad -->
	<div id="difficulty-overlay" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
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
			<h2 class="text-xl font-semibold mb-4">Segundo jugador</h2>
			<form id="pvp-login-form" class="flex flex-col gap-3">
			<input id="pvp-email" type="email" placeholder="Email"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
			<input id="pvp-password" type="password" placeholder="Contraseña"
					class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
			<button type="submit"
					class="rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2 font-semibold">
				Empezar partida
			</button>
			</form>
			<p id="pvp-login-error" class="text-red-400 text-sm mt-3 hidden"></p>
		</div>
	</div>
	`;
    await initializeLanguages();
    el.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => window.changeLanguage?.(btn.dataset.lang));
    });
    el.addEventListener("click", (ev) => {
        const a = ev.target.closest('a[data-nav]');
        if (!a)
            return;
        const href = a.getAttribute("href") || "/";
        ev.preventDefault();
        ctx.navigate(href);
    });
    el.querySelector("#logoutBtn")?.addEventListener("click", async () => {
        try {
            await ctx.api("/api/auth/logout", { method: "POST" });
        }
        finally {
            ctx.navigate("/", { replace: true });
        }
    });
    const canvas = el.querySelector('#pong');
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d)
        throw new Error("Could not obtain 2dcontext");
    const paddleWidth = 10, paddleHeight = 120, ballRadius = 10;
    const INITIAL_BALL_SPEED = 10, MAX_BALL_SPEED = 20, paddleSpeed = 5;
    const keys = {};
    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;
    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 12, ballSpeedY = 12;
    let leftScore = 0, rightScore = 0;
    let gameRunning = false, gameOver = false;
    let savedThisGame = false;
    let secondPlayer = null;
    let gameStartTs = performance.now();
    let pvpReady = false;
    const url = new URL(window.location.href);
    let mode = url.searchParams.get('mode');
    let difficulty = url.searchParams.get('level');
    const isAI = mode === 'ai';
    const isPVP = mode === 'pvp';
    function replaceQueryParam(k, v) {
        const u = new URL(window.location.href);
        u.searchParams.set(k, v);
        history.replaceState({}, "", u.toString());
    }
    function $(s) { return el.querySelector(s); }
    function updateScore() {
        const scoreEl = $('#score');
        if (scoreEl)
            scoreEl.textContent = `${leftScore} : ${rightScore}`;
    }
    async function saveMatchIfNeeded() {
        try {
            if (savedThisGame)
                return;
            const duration = Math.max(0, Math.floor(performance.now() - gameStartTs));
            if (isAI) {
                const body = {
                    mode: 'ai',
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
            }
            else if (isPVP && secondPlayer) {
                const body = {
                    mode: 'pvp',
                    opponent_id: secondPlayer.id,
                    score_left: leftScore,
                    score_right: rightScore,
                    duration_ms: duration
                };
                await fetch("/api/matches", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            }
            savedThisGame = true;
        }
        catch (e) {
            console.warn('No se pudo guardar el match:', e);
        }
    }
    window.addEventListener('keydown', (e) => {
        if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted)
            return;
        keys[e.key] = true;
        if (e.key === ' ') {
            if (!gameRunning && !gameOver) {
                if (isPVP && !pvpReady) {
                    const pvpOverlay = document.getElementById('pvp-login-overlay');
                    if (pvpOverlay) {
                        pvpOverlay.classList.remove('hidden');
                        pvpOverlay.classList.add('flex'); // por si acaso
                    }
                    return; // NO empezar hasta validar al segundo jugador
                }
                gameRunning = true;
                resetBall();
            }
            else if (gameOver) {
                leftScore = 0;
                rightScore = 0;
                savedThisGame = false;
                gameOver = false;
                gameRunning = false;
                gameStartTs = performance.now();
                resetBall();
                updateScore();
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted)
            return;
        keys[e.key] = false;
    });
    const diffOverlay = $('#difficulty-overlay');
    const blocker = $('#board-blocker');
    if (isAI) {
        if (!difficulty) {
            diffOverlay?.classList.remove('hidden');
            diffOverlay?.classList.add('flex');
            el.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.getAttribute('data-level');
                    difficulty = level;
                    replaceQueryParam('level', level);
                    diffOverlay?.classList.add('hidden');
                    blocker?.classList.add('hidden');
                });
            });
            blocker?.classList.remove('hidden');
        }
        else {
            diffOverlay?.classList.add('hidden');
            blocker?.classList.add('hidden');
        }
    }
    if (isPVP) {
        blocker?.classList.remove('hidden');
        const pvpOverlay = $('#pvp-login-overlay');
        pvpOverlay.classList.remove('hidden');
        const form = el.querySelector('#pvp-login-form');
        const errorEl = $('#pvp-login-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (el.querySelector('#pvp-email')).value;
            const password = (el.querySelector('#pvp-password')).value;
            try {
                const res = await fetch('/api/auth/login-second', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                secondPlayer = data;
                pvpReady = true;
                pvpOverlay.classList.add('hidden');
                blocker?.classList.add('hidden');
            }
            catch {
                errorEl.textContent = 'Credenciales invalidas o jugador no válido';
                errorEl.classList.remove('hidden');
            }
        });
    }
    else {
        blocker?.classList.add('hidden');
    }
    if (isAI) {
        let aiPressedKey = null;
        const simulateKeyPress = (key) => {
            if (!keys[key])
                window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        };
        const simulateKeyRelease = (key) => {
            if (keys[key])
                window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
        };
        const predictballY = () => {
            let x = ballX, y = ballY, dx = ballSpeedX, dy = ballSpeedY;
            if (dx <= 0)
                return rightPaddleY + paddleHeight / 2;
            while (x < canvas.width - 20) {
                x += dx;
                y += dy;
                if (y - ballRadius < 0 || y + ballRadius > canvas.height) {
                    dy *= -1;
                    y = Math.max(ballRadius, Math.min(canvas.height - ballRadius, y));
                }
            }
            return y;
        };
        const updateAI = () => {
            if (!gameRunning)
                return;
            if (ballSpeedX <= 0) {
                if (aiPressedKey) {
                    simulateKeyRelease(aiPressedKey);
                    aiPressedKey = null;
                }
                return;
            }
            const predictedY = predictballY();
            const paddleCenter = rightPaddleY + paddleHeight / 2;
            const diff = predictedY - paddleCenter;
            let DEAD_ZONE = 60;
            if (difficulty === 'easy')
                DEAD_ZONE = 110;
            else if (difficulty === 'medium')
                DEAD_ZONE = 75;
            else if (difficulty === 'hard')
                DEAD_ZONE = 60;
            let keyToPress = null;
            if (diff < -DEAD_ZONE && rightPaddleY > 0)
                keyToPress = 'ArrowUp';
            else if (diff > DEAD_ZONE && rightPaddleY + paddleHeight < canvas.height)
                keyToPress = 'ArrowDown';
            if (keyToPress !== aiPressedKey) {
                if (aiPressedKey)
                    simulateKeyRelease(aiPressedKey);
                if (keyToPress)
                    simulateKeyPress(keyToPress);
                aiPressedKey = keyToPress;
            }
        };
        const aiTimer = setInterval(updateAI, 1000);
        const stopOnDetach = () => { if (!el.isConnected)
            clearInterval(aiTimer);
        else
            requestAnimationFrame(stopOnDetach); };
        requestAnimationFrame(stopOnDetach);
    }
    function drawRect(x, y, w, h, color) {
        ctx2d.fillStyle = color;
        ctx2d.fillRect(x, y, w, h);
    }
    function drawCircle(x, y, r, color) {
        ctx2d.fillStyle = color;
        ctx2d.beginPath();
        ctx2d.arc(x, y, r, 0, Math.PI * 2, false);
        ctx2d.closePath();
        ctx2d.fill();
    }
    function draw() {
        drawRect(0, 0, canvas.width, canvas.height, 'black');
        drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white');
        drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white');
        drawCircle(ballX, ballY, ballRadius, 'white');
        ctx2d.fillStyle = 'white';
        ctx2d.textAlign = 'center';
        if (gameOver) {
            ctx2d.font = '40px Arial';
            ctx2d.fillText(currentTranslations['game_over'], canvas.width / 2, canvas.height / 2 - 100);
            ctx2d.font = '20px Arial';
            ctx2d.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
        }
        else if (!gameRunning) {
            ctx2d.font = '40px Arial';
            ctx2d.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
        }
    }
    function resetBall(flag) {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = flag ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED;
        ballSpeedY = 0;
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
    function update() {
        if (!gameRunning)
            return;
        if (keys['w'] && leftPaddleY > 0)
            leftPaddleY -= paddleSpeed;
        if (keys['s'] && leftPaddleY + paddleHeight < canvas.height)
            leftPaddleY += paddleSpeed;
        if (keys['ArrowUp'] && rightPaddleY > 0)
            rightPaddleY -= paddleSpeed;
        if (keys['ArrowDown'] && rightPaddleY + paddleHeight < canvas.height)
            rightPaddleY += paddleSpeed;
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0)
            ballSpeedY -= ballSpeedY;
        if (ballX - ballRadius < 20 && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
            const relativeIntersectY = (leftPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.hypot(ballSpeedX, ballSpeedY);
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = speed * Math.cos(bounceAngle);
            ballSpeedY = speed * Math.sin(bounceAngle);
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
        if (ballX + ballRadius < 0) {
            rightScore++;
            checkGameOver();
            updateScore;
            resetBall(0);
            resetPaddles();
        }
        if (ballX - ballRadius > canvas.width) {
            leftScore++;
            checkGameOver();
            updateScore;
            resetBall(1);
            resetPaddles();
        }
    }
    (function loop() {
        if (!el.isConnected)
            return;
        update();
        draw();
        requestAnimationFrame(loop);
    })();
    window.addEventListener('beforeunload', () => { if (gameOver)
        saveMatchIfNeeded(); });
}
// window.addEventListener('DOMContentLoaded', async () => {
// 	const canvas = document.getElementById('pong') as HTMLCanvasElement;
// 	if (!canvas) {
// 		console.error('Canvas element not found!');
// 		return;
// 	}
// 	const ctx = canvas.getContext('2d');
// 	if (!ctx) {
// 		throw new Error('No se pudo obtener el contexto 2D');
// 	}
// 	const paddleWidth = 10;
// 	const paddleHeight = 120;
// 	const ballRadius = 10;
// 	const INITIAL_BALL_SPEED = 10;
// 	const MAX_BALL_SPEED = 20;
// 	const paddleSpeed = 5;
// 	const keys: Record<string, boolean> = {};
// 	let leftPaddleY = (canvas.height - paddleHeight) / 2;
// 	let rightPaddleY = (canvas.height - paddleHeight) / 2;
// 	let ballX = canvas.width / 2;
// 	let ballY = canvas.height / 2;
// 	let ballSpeedX = 12;
// 	let ballSpeedY = 12;
// 	let leftScore = 0;
// 	let rightScore = 0;
// 	let gameRunning = false;
// 	let gameOver = false;
// 	let secondPlayer: { id: number; displayname: string; email?: string } | null = null;
// 	let pvpReady = false;
// 	let gameStartTs = performance.now();
// 	let savedThisGame = false;
// 	// Detectar modo desde la URL
// 	const urlParams = new URLSearchParams(window.location.search);
// 	const isAI = urlParams.get('mode') === 'ai';
// 	const isPVP = urlParams.get('mode') === 'pvp';
// 	let difficulty = urlParams.get('level');
// 	// === GUARDADO DE PARTIDAS ===
// 	async function saveMatchIfNeeded() {
// 		try {
// 			if (savedThisGame) return;
// 			const duration = Math.max(0, Math.floor(performance.now() - gameStartTs));
// 			if (isAI) {
// 				const body = {
// 					mode: 'ai',
// 					level: difficulty || null,
// 					score_user: leftScore,
// 					score_ai: rightScore,
// 					duration_ms: duration
// 				};
// 				await fetch('/api/matches', {
// 					method: 'POST',
// 					headers: { 'Content-Type': 'application/json' },
// 					credentials: 'include',
// 					body: JSON.stringify(body)
// 				});
// 			} else if (isPVP && secondPlayer) {
// 				const body = {
// 					mode: 'pvp',
// 					opponent_id: secondPlayer.id,
// 					score_left: leftScore,
// 					score_right: rightScore,
// 					duration_ms: duration
// 				};
// 				await fetch('/api/matches', {
// 					method: 'POST',
// 					headers: { 'Content-Type': 'application/json' },
// 					credentials: 'include',
// 					body: JSON.stringify(body)
// 				});
// 			}
// 			savedThisGame = true;
// 		} catch (e) {
// 			console.warn('No se pudo guardar el match:', e);
// 		}
// 	}
// 	// === TECLAS ===
// 	window.addEventListener('keydown', (e: KeyboardEvent) => {
// 		if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
// 		keys[e.key] = true;
// 		if (e.key === ' ') {
// 		if (!gameRunning && !gameOver) {
// 			if (isPVP && !pvpReady) {
// 				const pvpOverlay = document.getElementById('pvp-login-overlay') as HTMLElement;
// 				if (pvpOverlay) {
// 					pvpOverlay.classList.remove('hidden');
// 					pvpOverlay.classList.add('flex'); // por si acaso
// 				}
// 				return; // NO empezar hasta validar al segundo jugador
// 			}
// 			gameRunning = true;
// 			resetBall();
// 			} else if (gameOver) {
// 				leftScore = 0;
// 				rightScore = 0;
// 				savedThisGame = false;
// 				gameOver = false;
// 				gameRunning = false;
// 				gameStartTs = performance.now();
// 				resetBall();
// 				updateScore();
// 			}
// 		}
// 	});
// 	window.addEventListener('keyup', (e: KeyboardEvent) => {
// 		if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
// 		keys[e.key] = false;
// 	});
// 	// === FUNCIONES DE DIBUJO ===
// 	function drawRect(x: number, y: number, w: number, h: number, color: string, ctx: CanvasRenderingContext2D) {
// 		ctx.fillStyle = color;
// 		ctx.fillRect(x, y, w, h);
// 	}
// 	function drawCircle(x: number, y: number, r: number, color: string, ctx: CanvasRenderingContext2D) {
// 		ctx.fillStyle = color;
// 		ctx.beginPath();
// 		ctx.arc(x, y, r, 0, Math.PI * 2, false);
// 		ctx.closePath();
// 		ctx.fill();
// 	}
// 	function draw(ctx: CanvasRenderingContext2D) {
// 		drawRect(0, 0, canvas.width, canvas.height, 'black', ctx);
// 		drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white', ctx);
// 		drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white', ctx);
// 		drawCircle(ballX, ballY, ballRadius, 'white', ctx);
// 		ctx.fillStyle = 'white';
// 		ctx.textAlign = 'center';
// 		if (gameOver) {
// 			ctx.font = '40px Arial';
// 			ctx.fillText(currentTranslations['gameOver'], canvas.width / 2, canvas.height / 2 - 100);
// 			ctx.font = '20px Arial';
// 			ctx.fillText(currentTranslations['press_space_restart'], canvas.width / 2, canvas.height / 2 - 40);
// 		} else if (!gameRunning) {
// 			ctx.font = '40px Arial';
// 			ctx.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
// 		}
// 	}
// 	// === OVERLAY DE DIFICULTAD (SOLO IA) ===
// 	const overlay = document.getElementById('difficulty-overlay') as HTMLElement;
// 	if (isAI && !difficulty) {
// 		if (overlay) overlay.style.display = 'flex';
// 		const buttons = document.querySelectorAll<HTMLButtonElement>('.difficulty-btn');
// 		buttons.forEach(btn => {
// 			btn.addEventListener('click', () => {
// 				const level = btn.getAttribute('data-level');
// 				if (!level) return;
// 				urlParams.set('level', level);
// 				overlay?.classList.remove('animate-fade-in');
// 				overlay?.classList.add('animate-fade-out');
// 				setTimeout(() => {
// 					const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
// 					window.location.replace(newUrl);
// 				}, 400);
// 			});
// 		});
// 		return;
// 	} else {
// 		if (overlay) overlay.style.display = 'none';
// 		if (isAI) {
// 			const blocker = document.getElementById('board-blocker');
// 			if (blocker) blocker.classList.add('hidden');
// 		} 
// 	}
// 	// === OVERLAY DE LOGIN (SOLO PVP) ===
// 	if (isPVP) {
// 		const blocker = document.getElementById('board-blocker');
// 		if (blocker) blocker.classList.remove('hidden');
// 		const pvpOverlay = document.getElementById('pvp-login-overlay') as HTMLElement;
// 		if (pvpOverlay) pvpOverlay.classList.remove('hidden');
// 		const form = document.getElementById('pvp-login-form') as HTMLFormElement;
// 		const errorEl = document.getElementById('pvp-login-error') as HTMLElement;
// 		form.addEventListener('submit', async (e) => {
// 			e.preventDefault();
// 			const email = (document.getElementById('pvp-email') as HTMLInputElement).value;
// 			const password = (document.getElementById('pvp-password') as HTMLInputElement).value;
// 			try {
// 				const res = await fetch('/api/auth/login-second', {
// 					method: 'POST',
// 					headers: { 'Content-Type': 'application/json' },
// 					credentials: 'include',
// 					body: JSON.stringify({ email, password }),
// 				});
// 				if (!res.ok) throw new Error(`HTTP ${res.status}`);
// 				const data = await res.json();
// 				secondPlayer = data;
// 				pvpReady = true;
// 				if (pvpOverlay) pvpOverlay.classList.add('hidden');
// 				if (blocker) blocker.classList.add('hidden'); 
// 			} catch (err) {
// 				if (errorEl) {
// 					errorEl.textContent = "Credenciales inválidas o jugador no válido";
// 					errorEl.classList.remove('hidden');
// 				}
// 			}
// 		});
// 	}
// 	// === IA ===
// 	if (isAI) {
// 		keys['ArrowUp'] = false;
// 		keys['ArrowDown'] = false;
// 		let aiPressedKey: string | null = null;
// 		function simulateKeyPress(key: string) {
// 			if (!keys[key]) {
// 				const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
// 				window.dispatchEvent(event);
// 			}
// 		}
// 		function simulateKeyRelease(key: string) {
// 			if (keys[key]) {
// 				const event = new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true });
// 				window.dispatchEvent(event);
// 			}
// 		}
// 		function predictballY(): number {
// 			let x = ballX, y = ballY, dx = ballSpeedX, dy = ballSpeedY;
// 			if (dx <= 0) return rightPaddleY + paddleHeight / 2;
// 			while (x < canvas.width - 20) {
// 				x += dx; y += dy;
// 				if (y - ballRadius < 0 || y + ballRadius > canvas.height) {
// 					dy *= -1;
// 					y = Math.max(ballRadius, Math.min(canvas.height - ballRadius, y));
// 				}
// 			}
// 			return y;
// 		}
// 		function updateAI() {
// 			if (!gameRunning) return;
// 			if (ballSpeedX <= 0) {
// 				if (aiPressedKey) {
// 					simulateKeyRelease(aiPressedKey);
// 					aiPressedKey = null;
// 				}
// 				return;
// 			}
// 			const predictedY = predictballY();
// 			const paddleCenter = rightPaddleY + paddleHeight / 2;
// 			const diff = predictedY - paddleCenter;
// 			let DEAD_ZONE = 60;
// 			if (difficulty === 'easy') DEAD_ZONE = 110;
// 			else if (difficulty === 'medium') DEAD_ZONE = 75;
// 			else if (difficulty === 'hard') DEAD_ZONE = 60;
// 			let keyToPress: string | null = null;
// 			if (diff < -DEAD_ZONE && rightPaddleY > 0) keyToPress = 'ArrowUp';
// 			else if (diff > DEAD_ZONE && rightPaddleY + paddleHeight < canvas.height) keyToPress = 'ArrowDown';
// 			if (keyToPress !== aiPressedKey) {
// 				if (aiPressedKey) simulateKeyRelease(aiPressedKey);
// 				if (keyToPress) simulateKeyPress(keyToPress);
// 				aiPressedKey = keyToPress;
// 			}
// 		}
// 		setInterval(updateAI, 100);
// 	}
// 	// === UPDATE DEL JUEGO ===
// 	function update() {
// 		if (!gameRunning) return;
// 		if (keys['w'] && leftPaddleY > 0) leftPaddleY -= paddleSpeed;
// 		if (keys['s'] && leftPaddleY + paddleHeight < canvas.height) leftPaddleY += paddleSpeed;
// 		if (keys['ArrowUp'] && rightPaddleY > 0) rightPaddleY -= paddleSpeed;
// 		if (keys['ArrowDown'] && rightPaddleY + paddleHeight < canvas.height) rightPaddleY += paddleSpeed;
// 		ballX += ballSpeedX; ballY += ballSpeedY;
// 		if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) ballSpeedY = -ballSpeedY;
// 		if (ballX - ballRadius < 20 && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
// 			const relativeIntersectY = (leftPaddleY + paddleHeight / 2) - ballY;
// 			const normalized = relativeIntersectY / (paddleHeight / 2);
// 			const bounceAngle = normalized * (Math.PI / 4);
// 			const currentSpeed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2);
// 			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
// 			ballSpeedX = speed * Math.cos(bounceAngle);
// 			ballSpeedY = -speed * Math.sin(bounceAngle);
// 		}
// 		if (ballX + ballRadius > canvas.width - 20 && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
// 			const relativeIntersectY = (rightPaddleY + paddleHeight / 2) - ballY;
// 			const normalized = relativeIntersectY / (paddleHeight / 2);
// 			const bounceAngle = normalized * (Math.PI / 4);
// 			const currentSpeed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2);
// 			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
// 			ballSpeedX = -speed * Math.cos(bounceAngle);
// 			ballSpeedY = -speed * Math.sin(bounceAngle);
// 		}
// 		if (ballX + ballRadius < 0) {
// 			rightScore++;
// 			checkGameOver();
// 			updateScore();
// 			resetBall(0);
// 			resetPaddles();
// 		}
// 		if (ballX - ballRadius > canvas.width) {
// 			leftScore++;
// 			checkGameOver();
// 			updateScore();
// 			resetBall(1);
// 			resetPaddles();
// 		}
// 	}
// 	function resetBall(flag?: number) {
// 		ballX = canvas.width / 2;
// 		ballY = canvas.height / 2;
// 		ballSpeedX = flag ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED;
// 		ballSpeedY = 0;
// 	}
// 	function resetPaddles() {
// 		leftPaddleY = (canvas.height - paddleHeight) / 2;
// 		rightPaddleY = (canvas.height - paddleHeight) / 2;
// 	}
// 	function checkGameOver() {
// 		if (leftScore >= 5 || rightScore >= 5) {
// 			gameOver = true;
// 			gameRunning = false;
// 			saveMatchIfNeeded();
// 		}
// 	}
// 	function updateScore() {
// 		const scoreEl = document.getElementById('score');
// 		if (scoreEl) scoreEl.textContent = `${leftScore} : ${rightScore}`;
// 	}
// 	// === LOOP DEL JUEGO ===
// 	function gameLoop(ctx: CanvasRenderingContext2D) {
// 		update();
// 		draw(ctx);
// 		requestAnimationFrame(() => gameLoop(ctx));
// 	}
// 	gameLoop(ctx);
// 	window.addEventListener('beforeunload', () => { if (gameOver) saveMatchIfNeeded(); });
// });
