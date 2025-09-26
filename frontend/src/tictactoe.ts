import type { Ctx } from "./router.js";

type Player = "X" | "O";
type cellPos = [number, number];
type winCombo = [cellPos, cellPos, cellPos];
type winResult = { player: Player; combo: winCombo } | "draw" | null;

const WIN_COMBOS: winCombo[] = [
	[
		[0, 0],
		[1, 0],
		[2, 0],
	],
	[
		[0, 1],
		[1, 1],
		[2, 1],
	],
	[
		[0, 2],
		[1, 2],
		[2, 2],
	],
	[
		[0, 0],
		[0, 1],
		[0, 2],
	],
	[
		[1, 0],
		[1, 1],
		[1, 2],
	],
	[
		[2, 0],
		[2, 1],
		[2, 2],
	],
	[
		[0, 0],
		[1, 1],
		[2, 2],
	],
	[
		[2, 0],
		[1, 1],
		[0, 2],
	],
];

export async function mount(el: HTMLElement, { t, api, navigate }: Ctx) {

	el.innerHTML = `
	<div class="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex flex-col">

	<!-- Header -->
	<header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
		<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
		<a href="/home" data-nav="home" class="flex items-center gap-2">
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
			${t("home.logout") ?? "Cerrar sesión"}
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
			<span class="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent" data-translate="ttt.title">
				${t("ttt.title") ?? "Ft_Transcendence — Tres en raya"}
			</span>
			</h1>
			<div id="status" class="mt-2 text-white/70 text-lg font-mono"></div>
		</div>

		<!-- Contenedor del canvas -->
		<section class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4">
			<div class="overflow-x-auto">
			<div class="relative w-full max-w-[600px] mx-auto">
				<canvas id="ticTacToe" width="400" height="400" class="block w-full h-auto bg-gray-900 rounded-xl"></canvas>

				<div id="board-blocker" class="absolute inset-0 bg-black z-40"></div>

				<svg id="ttt-anim" viewBox="0 0 400 400"
					 class="absolute inset-0 w-full h-full pointer-events-none"></svg>
			</div>
			</div>

			<!-- Controles -->
			<div class="mt-4 flex items-center justify-center">
			<button id="resetBtn"
					class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
					data-translate="ttt.restart">
				${t("ttt.restart") ?? "Reiniciar"}
			</button>
			</div>
		</section>
		</div>
	</main>

	<!-- Overlay login segundo jugador -->
	<div id="pvp-login-overlay" class="fixed inset-0 hidden flex items-center justify-center bg-black/60 z-50">
		<div class="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 w-full max-w-md">
		<h2 class="text-xl font-semibold mb-4" data-translate="ttt.second_player">${
			t("pvp.second_player") ?? "Segundo jugador"
		}</h2>
		<form id="pvp-login-form" class="flex flex-col gap-3">
			<input id="pvp-email" type="email" placeholder="Email"
				 class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
			<input id="pvp-password" type="password" placeholder="${
				t("auth.password") ?? "Contraseña"
			}"
				 class="w-full rounded-xl bg-white/10 px-4 py-2 outline-none" required>
			<button type="submit"
					class="rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2 font-semibold">
			${t("pvp.start_match") ?? "Empezar partida"}
			</button>
		</form>
		<p id="pvp-login-error" class="text-red-400 text-sm mt-3 hidden"></p>
		</div>
	</div>

	<!-- Winner Overlay -->
	<div id="winnerOverlay"
		class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
		<div class="bg-white/10 border border-white/20 rounded-2xl shadow-2xl px-8 sm:px-10 py-8 text-center w-[min(92vw,40rem)]">
		<h2 id="winnerText" class="text-3xl sm:text-4xl font-extrabold mb-6 text-emerald-300"></h2>
		<div class="flex gap-3 justify-center">
			<button id="playAgainBtn"
					class="px-5 py-2.5 rounded-xl font-semibold bg-emerald-500/90 hover:bg-emerald-500 text-black/90 transition"
					data-translate="ttt.play_again">
			${t("ttt.play_again") ?? "Jugar de nuevo"}
			</button>
			<button id="closeOverlayBtn"
					class="px-5 py-2.5 rounded-xl font-semibold bg-white/10 hover:bg-white/15 border border-white/15 transition"
					data-translate="ttt.close">
			${t("ttt.close") ?? "Cerrar"}
			</button>
		</div>
				</div>
		</div>
		</div>
	`;
	
	const canvas = el.querySelector<HTMLCanvasElement>("#ticTacToe");
	const svg = el.querySelector<SVGSVGElement>("#ttt-anim");
	const statusEl = el.querySelector<HTMLParagraphElement>("#status");
	const resetBtn = el.querySelector<HTMLButtonElement>("#resetBtn");
	const playAgainBtn = el.querySelector<HTMLButtonElement>("#playAgainBtn");
	const closeOverlayBtn = el.querySelector<HTMLButtonElement>("#closeOverlayBtn");
	const winnerOverlay = el.querySelector<HTMLDivElement>("#winnerOverlay");
	const winnerText = el.querySelector<HTMLHeadingElement>("#winnerText");

	const blocker = el.querySelector<HTMLElement>("#board-blocker");
	const pvpOverlay = el.querySelector<HTMLElement>("#pvp-login-overlay");
	const form = el.querySelector<HTMLFormElement>("#pvp-login-form");
	const errorEl = el.querySelector<HTMLElement>("#pvp-login-error");

	if (!canvas) throw new Error("Canvas not found");
	if (!svg) throw new Error("SVG layer not found");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not obtain 2D context");

	// const me = (window as any).user as { id: number } | undefined;

	const { user: me } = await api("/api/auth/me");

	let secondPlayer: { id: number, displayName: string, email?: string } | null = null;
	let pvpReady = false;

	let gameStartTs = performance.now();
	let savedThisGame = false;

	const boardSize = Math.min(canvas.width, canvas.height);
	let cellSize = boardSize / 3;
	const offX = (canvas.width - boardSize) / 2;
	const offY = (canvas.height - boardSize) / 2;

	let board: (Player | null)[][] = [[null, null, null], [null, null, null], [null, null, null]];
	let currentPlayer: Player = "X";
	let gameOver = false;
	let lastResult: winResult = null;

	const playerName = (p: Player) => (p === "X" ? (t?.("ttt_player1") ?? "Jugador 1") : (t?.("ttt_player2") ?? "Jugador 2"));

	function refreshTexts() {
		if (!statusEl) return;
		if (!gameOver) {
			statusEl.textContent = `${t?.("ttt_turn") ?? "Turno"}: ${currentPlayer}`;
		} else if (lastResult) {
			if (lastResult === "draw") {
				const txt = t?.("ttt_draw") ?? "Empate";
				statusEl.textContent = txt;
				if (winnerText) winnerText.textContent = txt;
			} else {
				const label = `${playerName(lastResult.player)} (${lastResult.player}) ${t?.("ttt_wins") ?? "gana"}`;
				statusEl.textContent = label;
				if (winnerText) winnerText.textContent = label;
			}
		}
		if (resetBtn) resetBtn.textContent = t?.("ttt_restart") ?? "Reiniciar";
		if (playAgainBtn) playAgainBtn.textContent = t?.("ttt_play_again") ?? "Jugar de nuevo";
	}

	function winnerUserId(result: winResult): number | null {
		if (!result || result === "draw" || !me || !secondPlayer) return null;

		return result.player === "X" ? me.id : secondPlayer.id;
	}

	async function saveMatchIfNeeded() {
		if (savedThisGame) return;
		if (!me || !secondPlayer || !lastResult) return;

		savedThisGame = true;

		const duration_ms = Math.round(performance.now() - gameStartTs);

		const base = {
			mode: "pvp",
			game: "tictactoe",
			opponent_id: secondPlayer.id,
			duration_ms,
		};

		try {
			if (lastResult === "draw") {
				await api("/api/matches", {
					method: "POST",
					headers: { "Content-Type": "application/json"},
					credentials: "include",
					body: JSON.stringify({...base, is_draw: true}),
				});
			} else {
				const w = winnerUserId(lastResult);
				if (w === null) throw new Error("No se pudo deducir winner_id");
				await api("/api/matches", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({...base, is_draw: false, winner_id: w}),
				});
			}
		} catch (err) {
			console.error("Error al guardar la partida: ", err);
			savedThisGame = false;
		}
	}

	function checkWinner(): winResult {
		for (const combo of WIN_COMBOS) {
			const [[x1, y1], [x2, y2], [x3, y3]] = combo;
			const v = board[y1][x1];
			if (v && v === board[y2][x2] && v === board[y3][x3]) {
				return { player: v, combo };
			}
		}
		if (board.flat().every(c => c !== null)) return "draw";
		return null;
	}

	function drawBoard() {
		ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
		ctx!.strokeStyle = "rgba(255, 255, 255, 0.9)";
		ctx!.lineWidth = 3;
		ctx!.lineCap = "round";
		for (let i = 1; i < 3; i++) {
			const x = Math.round(offX + i * cellSize) + 0.5;
			ctx?.beginPath(); ctx?.moveTo(x, offY); ctx?.lineTo(x, offY + boardSize); ctx?.stroke();
			const y = Math.round(offY + i * cellSize) + 0.5;
			ctx?.beginPath(); ctx?.moveTo(offX, y); ctx?.lineTo(offX + boardSize, y); ctx?.stroke();
		}
	}

	function addAnimatedMark(x: number, y: number, player: Player) {
		const pad = cellSize * 0.2;
		const cellLeft = offX + x * cellSize;
		const cellTop = offY + y * cellSize;
		const cellRight = cellLeft + cellSize;
		const cellBottom = cellTop + cellSize;

		if (player === "X") {
			const x1 = cellLeft + pad, y1 = cellTop + pad;
			const x2 = cellRight - pad, y2 = cellBottom - pad;
			const len = Math.hypot(x2 - x1, y2 - y1);

			const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line1.setAttribute("x1", `${x1}`); line1.setAttribute("y1", `${y1}`);
			line1.setAttribute("x2", `${x2}`); line1.setAttribute("y2", `${y2}`);
			line1.setAttribute("stroke", "#f87171"); line1.setAttribute("stroke-width", "6");
			line1.setAttribute("stroke-linecap", "round");
			line1.setAttribute("stroke-dasharray", `${len}`);
			line1.setAttribute("stroke-dashoffset", `${len}`);
			line1.classList.add("ttt-draw-line");
	  		svg!.appendChild(line1);

			const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line2.setAttribute("x1", `${x2}`); line2.setAttribute("y1", `${y1}`);
			line2.setAttribute("x2", `${x1}`); line2.setAttribute("y2", `${y2}`);
			line2.setAttribute("stroke", "#f87171"); line2.setAttribute("stroke-width", "6");
			line2.setAttribute("stroke-linecap", "round");
			line2.setAttribute("stroke-dasharray", `${len}`);
			line2.setAttribute("stroke-dashoffset", `${len}`);
			line2.classList.add("ttt-draw-line");
			(line2 as any).style.animationDelay = "0.15s";
			svg!.appendChild(line2);
		} else {
			const cx = cellLeft + cellSize / 2;
			const cy = cellTop + cellSize / 2;
			const r = cellSize / 2 - pad;
			const len = 2 * Math.PI * r;

			const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			circle.setAttribute("cx", `${cx}`); circle.setAttribute("cy", `${cy}`);
			circle.setAttribute("r", `${r}`); circle.setAttribute("fill", "transparent");
			circle.setAttribute("stroke", "#60a5fa"); circle.setAttribute("stroke-width", "6");
			circle.setAttribute("stroke-dasharray", `${len}`);
			circle.setAttribute("stroke-dashoffset", `${len}`);
			circle.classList.add("ttt-draw-circle");
			svg!.appendChild(circle);
		}
	}

	function highlightWinningLine(cells: cellPos[]) {
		const [[x0, y0], , [x1, y1]] = cells;
		const cx0 = offX + x0 * cellSize + cellSize / 2;
		const cy0 = offY + y0 * cellSize + cellSize / 2;
		const cx1 = offX + x1 * cellSize + cellSize / 2;
		const cy1 = offY + y1 * cellSize + cellSize / 2;
		const win = document.createElementNS("http://www.w3.org/2000/svg", "line");
		win.setAttribute("x1", `${cx0}`);
		win.setAttribute("y1", `${cy0}`);
		win.setAttribute("x2", `${cx1}`);
		win.setAttribute("y2", `${cy1}`);
		win.setAttribute("stroke", "#22c55e");
		win.setAttribute("stroke-width", "8");
		win.setAttribute("stroke-linecap", "round");
		const len = Math.hypot(cx1 - cx0, cy1 - cy0);
		win.setAttribute("stroke-dasharray", `${len}`);
		win.setAttribute("stroke-dashoffset", `${len}`);
		win.classList.add("ttt-draw-line");
		svg?.appendChild(win);

		setTimeout(() => {
			if (lastResult && winnerOverlay && winnerText) {
				if (lastResult === "draw") {
					const txt = t("ttt_draw");
					statusEl!.textContent = txt;
					winnerText.textContent = txt;
					winnerOverlay.classList.remove("hidden");
					winnerOverlay.classList.add("animate-fade-in");
				} else {
					const label = `${playerName(lastResult.player)} (${
						lastResult.player
					}) ${t("ttt_wins")}`;
					statusEl!.textContent = label;
					winnerText.textContent = label;
					winnerOverlay.classList.remove("hidden");
					winnerOverlay.classList.add("animate-fade-in");
				}
			}
		}, 600);
	}

	canvas.addEventListener("click", async (e) => {
		if (!pvpReady) {
			pvpOverlay?.classList.remove("hidden");
			blocker?.classList.remove("hidden");
			return;
		}
		if (gameOver) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const px = (e.clientX - rect.left) * scaleX;
		const py = (e.clientY - rect.top) * scaleY;
		
		const localX = px - offX;
		const localY = py - offY;

		if (localX < 0 || localY < 0 || localX >= boardSize || localY >= boardSize) return;

		const x = Math.floor(localX / cellSize);
		const y = Math.floor(localY / cellSize);

		if (!board[y][x]) {
			board[y][x] = currentPlayer;
			addAnimatedMark(x, y, currentPlayer);

			const result = checkWinner();
			lastResult = result;

			if (result) {
				gameOver = true;

				await saveMatchIfNeeded();

				if (result === "draw") {
					setTimeout(() => winnerOverlay?.classList.remove("hidden"), 600);
				} else {
					highlightWinningLine(result.combo);
				}
				refreshTexts();
			} else {
				currentPlayer = currentPlayer === "X" ? "O" : "X";
				refreshTexts();
			}
			drawBoard();
		}
	});

	resetBtn?.addEventListener("click", () => {
		board = [[null, null, null], [null, null, null], [null, null, null]];
		currentPlayer = "X";
		gameOver = false;
		lastResult = null;
		svg.innerHTML = "";
		winnerOverlay?.classList.add("hidden");
		drawBoard();
		refreshTexts(); 
		savedThisGame = false;
		gameStartTs = performance.now();
	});

	playAgainBtn?.addEventListener("click", () => {
		resetBtn?.click();
		winnerOverlay?.classList.add("hidden");
	});

	closeOverlayBtn?.addEventListener("click", () => {
		winnerOverlay?.classList.add("hidden");
	});

	blocker?.classList.remove("hidden");
	pvpOverlay?.classList.remove("hidden");

	form?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const email = (el.querySelector("#pvp-email") as HTMLInputElement)?.value;
		const password = (el.querySelector("#pvp-password") as HTMLInputElement)?.value;

		try {
			const data = await api("/api/auth/login-second", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password }),
			});
			secondPlayer = data;
			pvpReady = true;
			pvpOverlay?.classList.add("hidden");
			blocker?.classList.add("hidden");

			gameStartTs = performance.now();
			savedThisGame = false;

			refreshTexts();
		} catch (err) {
			errorEl!.textContent = t?.("pvp_invalid_credentials") ?? "Credenciales inválidas";
			errorEl?.classList.remove("hidden");
		}
	});

	drawBoard();
	refreshTexts();
	
}
