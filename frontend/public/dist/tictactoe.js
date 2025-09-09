var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { changeLanguage, currentTranslations, initializeLanguages } from "./translate.js";
window.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    yield initializeLanguages();
    const t = (k) => { var _a; return (_a = currentTranslations === null || currentTranslations === void 0 ? void 0 : currentTranslations[k]) !== null && _a !== void 0 ? _a : k; };
    const canvas = document.getElementById("ticTacToe");
    if (!canvas)
        throw new Error("Canvas not found");
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("No se pudo obtener el contexto 2D");
    const me = window.user;
    let secondPlayer = null;
    let pvpReady = false;
    let gameStartTs = performance.now();
    let savedThisGame = false;
    const blocker = document.getElementById('board-blocker');
    const pvpOverlay = document.getElementById('pvp-login-overlay');
    const statusEl = document.getElementById("status");
    const resetBtn = document.getElementById("resetBtn");
    const winnerOverlay = document.getElementById("winnerOverlay");
    const winnerText = document.getElementById("winnerText");
    const playAgainBtn = document.getElementById("playAgainBtn");
    const closeOverlayBtn = document.getElementById("closeOverlayBtn");
    // ⬇️ En vez de const playerNames = {...}, usa función:
    const playerName = (p) => (p === "X" ? t("ttt_player1") : t("ttt_player2"));
    const svg = document.querySelector("#ttt-anim");
    if (!svg)
        throw new Error("SVG layer not found");
    svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);
    const boardSize = Math.min(canvas.width, canvas.height);
    let cellSize = boardSize / 3;
    const offX = (canvas.width - boardSize) / 2;
    const offY = (canvas.height - boardSize) / 2;
    const WIN_COMBOS = [
        [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
        [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
        [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]],
    ];
    let board = [[null, null, null], [null, null, null], [null, null, null]];
    let currentPlayer = "X";
    let gameOver = false;
    let lastResult = null;
    (function requireLocalPVP() {
        blocker === null || blocker === void 0 ? void 0 : blocker.classList.remove('hidden');
        pvpOverlay === null || pvpOverlay === void 0 ? void 0 : pvpOverlay.classList.remove('hidden');
        const form = document.getElementById('pvp-login-form');
        const errorEl = document.getElementById('pvp-login-error');
        form === null || form === void 0 ? void 0 : form.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            const email = document.getElementById('pvp-email').value;
            const password = document.getElementById('pvp-password').value;
            try {
                const res = yield fetch('/api/auth/login-second', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const data = yield res.json();
                secondPlayer = data;
                pvpReady = true;
                pvpOverlay === null || pvpOverlay === void 0 ? void 0 : pvpOverlay.classList.add('hidden');
                blocker === null || blocker === void 0 ? void 0 : blocker.classList.add('hidden');
                gameStartTs = performance.now();
                savedThisGame = false;
                statusEl.textContent = t("ttt-turn") + `: ${currentPlayer}`;
            }
            catch (err) {
                if (errorEl) {
                    errorEl.textContent = t("pvp_invalid_credentials") || "Invalid credentials";
                    errorEl.classList.remove('hidden');
                }
            }
        }));
    })();
    function refreshTexts() {
        if (playAgainBtn)
            playAgainBtn.textContent = t("ttt_play_again");
        if (resetBtn)
            resetBtn.textContent = t("ttt_restart");
        if (!gameOver) {
            statusEl.textContent = `${t("ttt_turn")}: ${currentPlayer}`;
        }
        else if (lastResult) {
            if (lastResult === "draw") {
                const txt = t("ttt_draw");
                statusEl.textContent = txt;
                if (winnerText)
                    winnerText.textContent = txt;
            }
            else {
                const label = `${playerName(lastResult.player)} (${lastResult.player}) ${t("ttt_wins")}`;
                statusEl.textContent = label;
                if (winnerText)
                    winnerText.textContent = label;
            }
        }
    }
    // ⬇️ Igual que en pong: cuando se cambia el idioma, actualizamos textos al instante
    // @ts-ignore – exponemos al header
    window.changeLanguage = (lang) => {
        return changeLanguage(lang).then(() => {
            refreshTexts();
        });
    };
    function checkWinner() {
        for (const combo of WIN_COMBOS) {
            const [[x1, y1], [x2, y2], [x3, y3]] = combo;
            const v = board[y1][x1];
            if (v && v === board[y2][x2] && v === board[y3][x3]) {
                return { player: v, combo };
            }
        }
        if (board.flat().every(c => c !== null))
            return "draw";
        return null;
    }
    function highlightWinningLine(cells) {
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
        svg === null || svg === void 0 ? void 0 : svg.appendChild(win);
        setTimeout(() => {
            if (lastResult && winnerOverlay && winnerText) {
                if (lastResult === "draw") {
                    const txt = t("ttt_draw");
                    statusEl.textContent = txt;
                    winnerText.textContent = txt;
                    winnerOverlay.classList.remove("hidden");
                    winnerOverlay.classList.add("animate-fade-in");
                }
                else {
                    const label = `${playerName(lastResult.player)} (${lastResult.player}) ${t("ttt_wins")}`;
                    statusEl.textContent = label;
                    winnerText.textContent = label;
                    winnerOverlay.classList.remove("hidden");
                    winnerOverlay.classList.add("animate-fade-in");
                }
            }
        }, 600);
    }
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let i = 1; i < 3; i++) {
            const x = Math.round(offX + i * cellSize) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, offY);
            ctx.lineTo(x, offY + boardSize);
            ctx.stroke();
            const y = Math.round(offY + i * cellSize) + 0.5;
            ctx.beginPath();
            ctx.moveTo(offX, y);
            ctx.lineTo(offX + boardSize, y);
            ctx.stroke();
        }
    }
    function addAnimatedMark(x, y, player) {
        const pad = cellSize * 0.2;
        const cellLeft = offX + x * cellSize;
        const cellTop = offY + y * cellSize;
        const cellRight = cellLeft + cellSize;
        const cellBottom = cellTop + cellSize;
        if (player === "X") {
            const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const x1 = cellLeft + pad, y1 = cellTop + pad;
            const x2 = cellRight - pad, y2 = cellBottom - pad;
            line1.setAttribute("x1", `${x1}`);
            line1.setAttribute("y1", `${y1}`);
            line1.setAttribute("x2", `${x2}`);
            line1.setAttribute("y2", `${y2}`);
            line1.setAttribute("stroke", "#f87171");
            line1.setAttribute("stroke-width", "6");
            line1.setAttribute("stroke-linecap", "round");
            const len = Math.hypot(x2 - x1, y2 - y1);
            line1.setAttribute("stroke-dasharray", `${len}`);
            line1.setAttribute("stroke-dashoffset", `${len}`);
            line1.classList.add("ttt-draw-line");
            svg === null || svg === void 0 ? void 0 : svg.appendChild(line1);
            const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line2.setAttribute("x1", `${x2}`);
            line2.setAttribute("y1", `${y1}`);
            line2.setAttribute("x2", `${x1}`);
            line2.setAttribute("y2", `${y2}`);
            line2.setAttribute("stroke", "#f87171");
            line2.setAttribute("stroke-width", "6");
            line2.setAttribute("stroke-linecap", "round");
            line2.setAttribute("stroke-dasharray", `${len}`);
            line2.setAttribute("stroke-dashoffset", `${len}`);
            line2.classList.add("ttt-draw-line");
            line2.style.animationDelay = "0.15s";
            svg === null || svg === void 0 ? void 0 : svg.appendChild(line2);
        }
        else {
            const cx = cellLeft + cellSize / 2;
            const cy = cellTop + cellSize / 2;
            const r = cellSize / 2 - pad;
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", `${cx}`);
            circle.setAttribute("cy", `${cy}`);
            circle.setAttribute("r", `${r}`);
            circle.setAttribute("fill", "transparent");
            circle.setAttribute("stroke", "#60a5fa");
            circle.setAttribute("stroke-width", "6");
            const len = 2 * Math.PI * r;
            circle.setAttribute("stroke-dasharray", `${len}`);
            circle.setAttribute("stroke-dashoffset", `${len}`);
            circle.classList.add("ttt-draw-circle");
            svg === null || svg === void 0 ? void 0 : svg.appendChild(circle);
        }
    }
    canvas.addEventListener("click", (e) => {
        if (!pvpReady) {
            pvpOverlay === null || pvpOverlay === void 0 ? void 0 : pvpOverlay.classList.remove('hidden');
            blocker === null || blocker === void 0 ? void 0 : blocker.classList.remove('hidden');
            return;
        }
        if (gameOver)
            return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;
        const localX = px - offX;
        const localY = py - offY;
        if (localX < 0 || localY < 0 || localX >= boardSize || localY >= boardSize)
            return;
        const x = Math.floor(localX / cellSize);
        const y = Math.floor(localY / cellSize);
        if (!board[y][x]) {
            board[y][x] = currentPlayer;
            addAnimatedMark(x, y, currentPlayer);
            const result = checkWinner();
            lastResult = result;
            if (result) {
                gameOver = true;
                if (result === "draw") {
                    setTimeout(() => {
                        if (winnerOverlay)
                            winnerOverlay.classList.remove("hidden");
                    }, 600);
                }
                else {
                    highlightWinningLine(result.combo);
                }
                refreshTexts(); // ⬅️ mostrar textos finales traducidos
            }
            else {
                currentPlayer = currentPlayer === "X" ? "O" : "X";
                refreshTexts();
            }
            drawBoard();
        }
    });
    resetBtn.addEventListener("click", () => {
        board = [[null, null, null], [null, null, null], [null, null, null]];
        currentPlayer = "X";
        gameOver = false;
        lastResult = null;
        svg.innerHTML = "";
        winnerOverlay === null || winnerOverlay === void 0 ? void 0 : winnerOverlay.classList.add("hidden");
        drawBoard();
        refreshTexts(); // ⬅️ textos iniciales traducidos
    });
    playAgainBtn === null || playAgainBtn === void 0 ? void 0 : playAgainBtn.addEventListener("click", () => {
        resetBtn.click();
        winnerOverlay === null || winnerOverlay === void 0 ? void 0 : winnerOverlay.classList.add("hidden");
    });
    closeOverlayBtn === null || closeOverlayBtn === void 0 ? void 0 : closeOverlayBtn.addEventListener("click", () => {
        winnerOverlay === null || winnerOverlay === void 0 ? void 0 : winnerOverlay.classList.add("hidden");
    });
    // Primera pintura
    drawBoard();
    refreshTexts();
}));
