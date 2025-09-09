import { currentTranslations, initializeLanguages } from "./translate.js";

window.addEventListener("DOMContentLoaded", async () => {
  // 1) idiomas
  await initializeLanguages();

  // 2) util de traducción con fallback
  const t = (k: string) => currentTranslations?.[k] ?? k;

  const canvas = document.getElementById("ticTacToe") as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas not found");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D");

  const statusEl = document.getElementById("status") as HTMLParagraphElement;
  const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
  const winnerOverlay = document.getElementById("winnerOverlay") as HTMLDivElement;
  const winnerText = document.getElementById("winnerText") as HTMLParagraphElement;
  const playAgainBtn = document.getElementById("playAgainBtn") as HTMLButtonElement;
  const closeOverlayBtn = document.getElementById("closeOverlayBtn") as HTMLButtonElement | null;

  // 3) nombres de jugadores traducidos
  type Player = "X" | "O";
  const playerNames: Record<Player, string> = {
    X: t("ttt_player1"),
    O: t("ttt_player2"),
  };

  // 4) textos estáticos del overlay/botones
  if (playAgainBtn) playAgainBtn.textContent = t("ttt_play_again");
  // Si prefieres setear también el de reinicio por JS:
  // if (resetBtn) resetBtn.textContent = t("ttt_restart");

  const svg = document.querySelector<SVGSVGElement>("#ttt-anim");
  if (!svg) throw new Error("SVG layer not found");
  svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);

  const boardSize = Math.min(canvas.width, canvas.height);
  let cellSize = boardSize / 3;
  const offX = (canvas.width - boardSize) / 2;
  const offY = (canvas.height - boardSize) / 2;

  type cellPos = [number, number];
  type winCombo = [cellPos, cellPos, cellPos];
  type winResult = { player: Player; combo: winCombo } | "draw" | null;

  const WIN_COMBOS: winCombo[] = [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[2, 0], [1, 1], [0, 2]],
  ];

  let board: (Player | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  let currentPlayer: Player = "X";
  let gameOver = false;

  function checkWinner(): winResult {
    for (const combo of WIN_COMBOS) {
      const [[x1, y1], [x2, y2], [x3, y3]] = combo;
      const v = board[y1][x1];
      if (v && v === board[y2][x2] && v === board[y3][x3]) {
        return { player: v, combo };
      }
    }
    if (board.flat().every((cell) => cell !== null)) return "draw";
    return null;
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
  }

  function drawBoard() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    ctx!.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx!.lineWidth = 3;
    ctx!.lineCap = "round";

    for (let i = 1; i < 3; i++) {
      const x = Math.round(offX + i * cellSize) + 0.5;
      ctx!.beginPath();
      ctx!.moveTo(x, offY);
      ctx!.lineTo(x, offY + boardSize);
      ctx!.stroke();

      const y = Math.round(offY + i * cellSize) + 0.5;
      ctx!.beginPath();
      ctx!.moveTo(offX, y);
      ctx!.lineTo(offX + boardSize, y);
      ctx!.stroke();
    }
  }

  function addAnimatedMark(x: number, y: number, player: Player) {
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
      svg?.appendChild(line1);

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
      svg?.appendChild(line2);
    } else {
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
      svg?.appendChild(circle);
    }
  }

  canvas.addEventListener("click", (e) => {
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
      if (result) {
        gameOver = true;
        if (result === "draw") {
          statusEl.textContent = t("ttt_draw");
          if (winnerOverlay && winnerText) {
            winnerText.textContent = t("ttt_draw");
            winnerOverlay.classList.remove("hidden");
            winnerOverlay.classList.add("animate-fade-in");
          }
        } else {
          highlightWinningLine(result.combo);
          const label = `${playerNames[result.player]} (${result.player}) ${t("ttt_wins")}`;
          statusEl.textContent = label;
          if (winnerOverlay && winnerText) {
            winnerText.textContent = label;
            winnerOverlay.classList.remove("hidden");
            winnerOverlay.classList.add("ttt-fade-in");
          }
        }
      } else {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        statusEl.textContent = `${t("ttt_turn")}: ${currentPlayer}`;
      }
      drawBoard();
    }
  });

  resetBtn.addEventListener("click", () => {
    board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    currentPlayer = "X";
    gameOver = false;
    statusEl.textContent = `${t("ttt_new_game")}! ${t("ttt_turn")}: X`;

    if (svg) svg.innerHTML = "";
    winnerOverlay?.classList.add("hidden");

    drawBoard();
  });

  playAgainBtn?.addEventListener("click", () => {
    resetBtn?.click();
    winnerOverlay.classList.add("hidden");
  });

  closeOverlayBtn?.addEventListener("click", () => {
    winnerOverlay.classList.add("hidden");
  });

  drawBoard();
  statusEl.textContent = `${t("ttt_turn")}: X`;
});
