import { initializeLanguages } from "./translate.js";
export async function mount(el, ctx) {
    let isAuthed = false;
    try {
        const response = await ctx.api("/api/auth/me");
        isAuthed = !!(response && response.user);
    }
    catch (error) {
        isAuthed = false;
    }
    if (!isAuthed) {
        ctx.navigate("/login", { replace: true });
        return;
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
            <!-- Cabecera del juego de torneo -->
            <div class="mb-6">
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
                    <span class="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                        Tournament Match
                    </span>
                </h1>
                <div id="tournament-info" class="mt-2 text-white/70 text-lg">
                    <div id="players-names" class="font-semibold mb-2"></div>
                    <div id="score" class="font-mono text-xl">0 : 0</div>
                </div>
            </div>

            <!-- Contenedor del canvas -->
            <section class="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4">
                <div class="overflow-x-auto">
                    <div class="relative w-full max-w-[1200px] mx-auto">
                        <canvas
                            id="tournament-pong"
                            width="1200"
                            height="800"
                            class="block w-full h-auto bg-gray-900"
                        ></canvas>
                    </div>
                </div>
            </section>
        </div>
    </main>
    `;
    const subs = new AbortController();
    const on = (type, handler) => window.addEventListener(type, handler, { signal: subs.signal });
    await initializeLanguages();
    // Language buttons
    el.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => window.changeLanguage?.(btn.dataset.lang));
    });
    // SPA nav binding
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
    /* -------------------------
       LEER PARÁMETROS DEL TORNEO
       ------------------------- */
    const url = new URL(window.location.href);
    const matchId = url.searchParams.get('matchId');
    const tournamentId = url.searchParams.get('tournamentId');
    const player1Name = url.searchParams.get('player1');
    const player2Name = url.searchParams.get('player2');
    const player1Id = url.searchParams.get('player1Id');
    const player2Id = url.searchParams.get('player2Id');
    // Verificar que tenemos todos los parámetros necesarios
    if (!matchId || !tournamentId || !player1Name || !player2Name || !player1Id || !player2Id) {
        console.error('Missign required tournament parameters:', {
            matchId, tournamentId, player1Name, player2Name, player1Id, player2Id
        });
        alert('Invalid tournament match parameters');
        ctx.navigate('/tournament');
        return;
    }
    console.log('Tournament match parameters:', {
        matchId, tournamentId, player1Name, player2Name, player1Id, player2Id
    });
    // Actualizar UI con nombres de jugadores
    const playersNamesEl = el.querySelector('#players-names');
    if (playersNamesEl) {
        playersNamesEl.textContent = `${player1Name} vs ${player2Name}`;
    }
    /* -------------------------
       VARIABLES DEL JUEGO
       ------------------------- */
    const canvas = el.querySelector('#tournament-pong');
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d)
        throw new Error("Could not obtain 2d context");
    const paddleWidth = 10, paddleHeight = 120, ballRadius = 10;
    const INITIAL_BALL_SPEED = 10, MAX_BALL_SPEED = 20, paddleSpeed = 8;
    const keys = {};
    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;
    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 0, ballSpeedY = 0;
    let leftScore = 0, rightScore = 0;
    let gameRunning = false, gameOver = false;
    let savedThisGame = false;
    let gameStartTs = performance.now();
    function $(sel) { return el.querySelector(sel); }
    /* -------------------------
       REPORTAR RESULTADO DEL TORNEO
       ------------------------- */
    async function reportTournamentResult() {
        try {
            if (savedThisGame)
                return;
            // Determinar el ganador
            let winnerId;
            if (leftScore > rightScore) {
                winnerId = parseInt(player1Id); // Player 1 (izquierda) ganó
            }
            else {
                winnerId = parseInt(player2Id); // Player 2 (derecha) ganó
            }
            console.log('Reporting tournament result:', {
                matchId,
                tournamentId,
                winnerId,
                scorePlayer1: leftScore,
                scorePlayer2: rightScore
            });
            const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    winnerId: winnerId,
                    scorePlayer1: leftScore,
                    scorePlayer2: rightScore
                })
            });
            if (response.ok) {
                console.log('Tournament result reported successfully');
                savedThisGame = true;
                // Mostrar mensaje de éxito después de un breve delay
                setTimeout(() => {
                    const winnerName = leftScore > rightScore ? player1Name : player2Name;
                    alert(`${winnerName} wins! Result reported. Tournament will advance automatically.`);
                    // Redirigir de vuelta a torneos
                    ctx.navigate('/tournament');
                }, 1500);
            }
            else {
                const error = await response.json();
                console.error('Error reporting tournament result:', error);
                alert(`Error reporting result: ${error.error || 'Unknown error'}`);
            }
        }
        catch (error) {
            console.error('Error reporting tournament result:', error);
            alert('Error reporting match result');
        }
    }
    /* -------------------------
       HANDLERS DE TECLADO
       ------------------------- */
    const onKeyDown = (e) => {
        keys[e.key] = true;
        if (e.key === ' ') {
            if (!gameRunning && !gameOver) {
                // Iniciar juego
                gameRunning = true;
                resetBall(1);
                gameStartTs = performance.now();
            }
            else if (gameOver) {
                // En torneos NO permitir reiniciar - el resultado ya se reportó
                return;
            }
        }
    };
    const onKeyUp = (e) => {
        keys[e.key] = false;
    };
    on('keydown', onKeyDown);
    on('keyup', onKeyUp);
    /* -------------------------
       FUNCIONES DE DIBUJO
       ------------------------- */
    function drawRect(x, y, w, h, color) {
        ctx2d.fillStyle = color;
        ctx2d.fillRect(x, y, w, h);
    }
    function drawCircle(x, y, r, color) {
        ctx2d.fillStyle = color;
        ctx2d.beginPath();
        ctx2d.arc(x, y, r, 0, Math.PI * 2);
        ctx2d.closePath();
        ctx2d.fill();
    }
    function draw() {
        // Fondo
        drawRect(0, 0, canvas.width, canvas.height, 'black');
        // Paddles
        drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white');
        drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white');
        // Ball
        drawCircle(ballX, ballY, ballRadius, 'white');
        // Línea central
        ctx2d.setLineDash([5, 15]);
        ctx2d.strokeStyle = 'white';
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(canvas.width / 2, 0);
        ctx2d.lineTo(canvas.width / 2, canvas.height);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
        // Texto
        ctx2d.fillStyle = 'white';
        ctx2d.textAlign = 'center';
        ctx2d.font = '16px Arial';
        // Nombres de jugadores
        ctx2d.textAlign = 'left';
        ctx2d.fillText(player1Name, 30, 30);
        ctx2d.textAlign = 'right';
        ctx2d.fillText(player2Name, canvas.width - 30, 30);
        ctx2d.textAlign = 'center';
        // Scores
        ctx2d.font = '48px Arial';
        ctx2d.fillText(leftScore.toString(), canvas.width / 4, 60);
        ctx2d.fillText(rightScore.toString(), (3 * canvas.width) / 4, 60);
        // Mensajes de estado
        if (gameOver) {
            ctx2d.font = '40px Arial';
            const winnerName = leftScore > rightScore ? player1Name : player2Name;
            ctx2d.fillText(`${winnerName} Wins!`, canvas.width / 2, canvas.height / 2 - 50);
            ctx2d.font = '20px Arial';
            ctx2d.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx2d.fillText('Reporting result...', canvas.width / 2, canvas.height / 2);
        }
        else if (!gameRunning) {
            ctx2d.font = '30px Arial';
            ctx2d.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2);
        }
    }
    /* -------------------------
       LÓGICA DEL JUEGO
       ------------------------- */
    function resetBall(direction = 1) {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = direction * INITIAL_BALL_SPEED;
        ballSpeedY = 0;
    }
    function updateScore() {
        const scoreEl = $('#score');
        if (scoreEl) {
            scoreEl.textContent = `${leftScore} : ${rightScore}`;
        }
    }
    function checkGameOver() {
        if (leftScore >= 5 || rightScore >= 5) {
            gameOver = true;
            gameRunning = false;
            reportTournamentResult();
        }
    }
    function update() {
        if (!gameRunning || gameOver)
            return;
        // Movimiento de paddles
        if (keys['w'] && leftPaddleY > 0)
            leftPaddleY -= paddleSpeed;
        if (keys['s'] && leftPaddleY + paddleHeight < canvas.height)
            leftPaddleY += paddleSpeed;
        if (keys['ArrowUp'] && rightPaddleY > 0)
            rightPaddleY -= paddleSpeed;
        if (keys['ArrowDown'] && rightPaddleY + paddleHeight < canvas.height)
            rightPaddleY += paddleSpeed;
        // Movimiento de la pelota
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        // Rebote en paredes superior e inferior
        if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
            ballSpeedY = -ballSpeedY;
        }
        // Colisión con paddle izquierdo
        if (ballX - ballRadius < 20 &&
            ballY > leftPaddleY &&
            ballY < leftPaddleY + paddleHeight &&
            ballSpeedX < 0) {
            const relativeIntersectY = (leftPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.hypot(ballSpeedX, ballSpeedY);
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = speed * Math.cos(bounceAngle);
            ballSpeedY = -speed * Math.sin(bounceAngle);
        }
        // Colisión con paddle derecho
        if (ballX + ballRadius > canvas.width - 20 &&
            ballY > rightPaddleY &&
            ballY < rightPaddleY + paddleHeight &&
            ballSpeedX > 0) {
            const relativeIntersectY = (rightPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.hypot(ballSpeedX, ballSpeedY);
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = -speed * Math.cos(bounceAngle);
            ballSpeedY = -speed * Math.sin(bounceAngle);
        }
        // Puntuación
        if (ballX + ballRadius < 0) {
            rightScore++;
            updateScore();
            checkGameOver();
            if (!gameOver)
                resetBall(1);
        }
        if (ballX - ballRadius > canvas.width) {
            leftScore++;
            updateScore();
            checkGameOver();
            if (!gameOver)
                resetBall(-1);
        }
    }
    /* -------------------------
       LOOP PRINCIPAL
       ------------------------- */
    (function loop() {
        if (!el.isConnected) {
            subs.abort();
            return;
        }
        update();
        draw();
        requestAnimationFrame(loop);
    })();
}
