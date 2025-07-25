"use strict";
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pong');
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
    const INITIAL_BALL_SPEED = 12;
    const MAX_BALL_SPEED = 20;
    const paddleSpeed = 10;
    const keys = {};
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
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === ' ') {
            if (!gameRunning && !gameOver) {
                gameRunning = true;
                resetBall();
            }
            else if (gameOver) {
                leftScore = 0;
                rightScore = 0;
                gameOver = false;
                gameRunning = false;
                resetBall();
                updateScore();
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    function drawRect(x, y, w, h, color, ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }
    function drawCircle(x, y, r, color, ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    }
    function draw(ctx) {
        console.log("Drawing");
        drawRect(0, 0, canvas.width, canvas.height, 'black', ctx);
        drawRect(10, leftPaddleY, paddleWidth, paddleHeight, 'white', ctx);
        drawRect(canvas.width - 20, rightPaddleY, paddleWidth, paddleHeight, 'white', ctx);
        drawCircle(ballX, ballY, ballRadius, 'white', ctx);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        if (gameOver) {
            ctx.font = '40px Arial';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 100);
            ctx.font = '24px Arial';
            ctx.fillText('Press Space to restart', canvas.width / 2, canvas.height / 2 - 40);
        }
        else if (!gameRunning) {
            ctx.font = '40px Arial';
            ctx.fillText('Press Space to Start', canvas.width / 2, canvas.height / 2 - 40);
        }
    }
    function update() {
        if (!gameRunning)
            return;
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
            const currentSpeed = Math.sqrt(Math.pow(ballSpeedX, 2) + Math.pow(ballSpeedY, 2));
            const speed = Math.min(currentSpeed * 1.05, MAX_BALL_SPEED);
            ballSpeedX = speed * Math.cos(bounceAngle);
            ballSpeedY = -speed * Math.sin(bounceAngle);
        }
        // Ball bounce on right paddle
        if (ballX + ballRadius > canvas.width - 20 && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
            const relativeIntersectY = (rightPaddleY + paddleHeight / 2) - ballY;
            const normalized = relativeIntersectY / (paddleHeight / 2);
            const bounceAngle = normalized * (Math.PI / 4);
            const currentSpeed = Math.sqrt(Math.pow(ballSpeedX, 2) + Math.pow(ballSpeedY, 2));
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
        }
    }
    function updateScore() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.textContent = `${leftScore} : ${rightScore}`;
        }
    }
    function gameLoop(ctx) {
        update();
        draw(ctx);
        requestAnimationFrame(() => gameLoop(ctx));
    }
    gameLoop(ctx);
});
