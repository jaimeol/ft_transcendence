import { currentTranslations, initializeLanguages } from "./translate.js";

window.addEventListener('DOMContentLoaded', async () => {

	await initializeLanguages();
	const canvas = document.getElementById('pong') as HTMLCanvasElement;
	
	if (!canvas) {
		console.error('Canvas element not found!');
		return;
		}
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('No se pudo obtener el contexto 2D');
	}
  
	const paddleWidth = 10;
	const paddleHeight = 120;
	const ballRadius = 10;
	const INITIAL_BALL_SPEED = 5;
	const MAX_BALL_SPEED = 10;
	const paddleSpeed = 5;
  
	const keys: Record<string, boolean> = {};
  
	let leftPaddleY = (canvas.height - paddleHeight) / 2;
	let rightPaddleY = (canvas.height - paddleHeight) / 2;
  
	let ballX = canvas.width / 2;
	let ballY = canvas.height / 2;
	let ballSpeedX = 12;
	let ballSpeedY = 12;
  
	let leftScore = 0;
	let rightScore = 0;
  
	let gameRunning = false;
	let gameOver = false;

	window.addEventListener('keydown', (e: KeyboardEvent) => {
		if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
		keys[e.key] = true;

		if (e.key === ' ') {
			if (!gameRunning && !gameOver) {
				gameRunning = true;
				resetBall();
			} else if (gameOver) {
				leftScore = 0;
				rightScore = 0;
				gameOver = false;
				gameRunning = false;
				resetBall();
				updateScore();
			}
		}
	});

	window.addEventListener('keyup', (e: KeyboardEvent) => {
		if (isAI && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.isTrusted) return;
		keys[e.key] = false;
	});

  
	function drawRect(x: number, y: number, w: number, h: number, color: string, ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = color;
		ctx.fillRect(x, y, w, h);
	}
  
	function drawCircle(x: number, y: number, r: number, color: string, ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	}
  
	function draw(ctx: CanvasRenderingContext2D) {
		console.log("Drawing");
		drawRect(0, 0, canvas.width, canvas.height, 'black', ctx);
		drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white', ctx);
		drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white', ctx);
		drawCircle(ballX, ballY, ballRadius, 'white', ctx);
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		if (gameOver) {
			ctx.font = '40px Arial';
			ctx.fillText(currentTranslations['game_over'], canvas.width / 2, canvas.height / 2 - 100);
			ctx.font = '20px Arial';
			ctx.fillText(currentTranslations['press_space_restart'], canvas.width / 2, canvas.height / 2 - 40);
		} else if (!gameRunning) {
			ctx.font = '40px Arial';
			ctx.fillText(currentTranslations['press_space_start'], canvas.width / 2, canvas.height / 2 - 40);
		}
	}
	const urlParams = new URLSearchParams(window.location.search);
	const isAI = urlParams.get('mode') === 'ai';
	let difficulty = urlParams.get('level');


	const overlay = document.getElementById('difficulty-overlay') as HTMLElement;
	if (!isAI || difficulty) {
		if (overlay) overlay.style.display = 'none';
	} else {
		if (overlay) overlay.style.display = 'flex';

		const buttons = document.querySelectorAll<HTMLButtonElement>('.difficulty-btn');
		buttons.forEach(btn => {
			btn.addEventListener('click', () => {
				const level = btn.getAttribute('data-level');
				if (!level) return;

				urlParams.set('level', level);

				overlay?.classList.remove('animate-fade-in');
				overlay?.classList.add('animate-fade-out');

				setTimeout(() => {
					const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
					window.location.replace(newUrl);
				}, 400);
			});
		});
		return;
	}


	if (isAI) {
		keys['ArrowUp'] = false;
		keys['ArrowDown'] = false;

		let aiPressedKey: string | null = null;
	
		function simulateKeyPress(key: string) {
			if (!keys[key]) {
				const event = new KeyboardEvent('keydown', {
					key,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);
			}
		}

		function simulateKeyRelease(key: string) {
			if (keys[key]) {
				const event = new KeyboardEvent('keyup', {
					key,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);
			}
		}

		function predictballY(): number {
			let x = ballX;
			let y = ballY;
			let dx = ballSpeedX;
			let dy = ballSpeedY;
	
			if (dx <= 0) return rightPaddleY + paddleHeight / 2;
	
			while (x < canvas.width - 20) {
				x += dx;
				y += dy;
		
				if (y - ballRadius < 0 || y + ballRadius > canvas.height) {
					dy *= -1;
					y = Math.max(ballRadius, Math.min(canvas.height - ballRadius, y));
				}
			}
			return y;
		}

		function updateAI() {
			if (!gameRunning) return;
	
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

			if (difficulty === 'easy') DEAD_ZONE = 110;
			else if (difficulty === 'medium') DEAD_ZONE = 75;
			else if(difficulty === 'hard') DEAD_ZONE = 60;
	
			let keyToPress: string | null = null;
			
			if (diff < -DEAD_ZONE && rightPaddleY > 0) {
				keyToPress = 'ArrowUp';
			} else if (diff > DEAD_ZONE && rightPaddleY + paddleHeight < canvas.height) {
				keyToPress = 'ArrowDown';
			}
	
			if (keyToPress !== aiPressedKey) {
				if (aiPressedKey) simulateKeyRelease(aiPressedKey);
				if (keyToPress) simulateKeyPress(keyToPress);
					aiPressedKey = keyToPress;
			}
		}
		setInterval(updateAI, 100); // Más reactivo: cada 100ms
	}

	async function saveMatch() {
		try {
		  // Determina el lado del jugador: en tu juego el humano controla izquierda por defecto.
		  const side = 'left';
		  const body = {
			mode: isAI ? 'ai' : 'local',
			leftScore,
			rightScore,
			side
			// opponentId: en el futuro si juegas PvP real, pásalo aquí
		  };
	  
		  // Usa window.api si existe; si no, fetch con credenciales
		  const post = (window as any).api
			? (path: string, opts: any) => (window as any).api(path, opts)
			: (path: string, opts: RequestInit) =>
				fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts })
				  .then(r => { if(!r.ok) throw new Error(String(r.status)); return r.json(); });
	  
		  await post('/api/matches', {
			method: 'POST',
			body: JSON.stringify(body),
		  });
		} catch (e) {
		  console.error('No se pudo guardar la partida:', e);
		}
	  }
	  

	function update() {
		if (!gameRunning) return;
		
		if (keys['w'] && leftPaddleY > 0) {
			leftPaddleY -= paddleSpeed;
		}
		
		if (keys['s'] && leftPaddleY + paddleHeight < canvas.height) {
			leftPaddleY += paddleSpeed;
		}
		
		if (keys['ArrowUp'] && rightPaddleY > 0) {
			rightPaddleY -= paddleSpeed;
		}
		if (keys['ArrowDown'] && rightPaddleY + paddleHeight < canvas.height) {
			rightPaddleY += paddleSpeed;
		}

  
	  	ballX += ballSpeedX;
	  	ballY += ballSpeedY;
  
	  // Ball bounce on top and bottom walls
	  	if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
			ballSpeedY = -ballSpeedY;
	  	}
  
	  // Ball bounce on left paddle
	  	if (ballX - ballRadius < 20 && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
			const relativeIntersectY = (leftPaddleY + paddleHeight / 2) - ballY;
			const normalized = relativeIntersectY / (paddleHeight / 2);
			const bounceAngle = normalized * (Math.PI / 4);
  
			const currentSpeed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2);
			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
  
			ballSpeedX = speed * Math.cos(bounceAngle);
			ballSpeedY = -speed * Math.sin(bounceAngle);
	  	}
  
	  // Ball bounce on right paddle
	  	if (ballX + ballRadius > canvas.width - 20 && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
			const relativeIntersectY = (rightPaddleY + paddleHeight / 2) - ballY;
			const normalized = relativeIntersectY / (paddleHeight / 2);
			const bounceAngle = normalized * (Math.PI / 4);
  
			const currentSpeed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2);
			const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
  
			ballSpeedX = -speed * Math.cos(bounceAngle);
			ballSpeedY = -speed * Math.sin(bounceAngle);
	 	}
  
	  // Score and reset if ball goes out on left side
	  	if (ballX + ballRadius < 0) {
			rightScore++;
			checkGameOver();
			updateScore();
			resetBall(0);
			resetPaddles();
	  	}
  
	  // Score and reset if ball goes out on right side
	  	if (ballX - ballRadius > canvas.width) {
			leftScore++;
			checkGameOver();
			updateScore();
			resetBall(1);
			resetPaddles();
		}
	}
  
	function resetBall(flag?: number) {
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
		  saveMatch(); // <-- NUEVO
		}
	  }
	  
  
	function updateScore() {
	  	const scoreEl = document.getElementById('score');
	  	if (scoreEl) {
			scoreEl.textContent = `${leftScore} : ${rightScore}`;
	  	}
	}
  
	function gameLoop(ctx: CanvasRenderingContext2D) {
	  	update();
	  	draw(ctx);
	  	requestAnimationFrame(() => gameLoop(ctx));
	}
	gameLoop(ctx);
});
  