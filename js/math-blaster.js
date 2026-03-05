/**
 * MATH BLASTER GAME ENGINE
 * EduPlay Bonus Mini-Game
 */

// Supabase Init
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
let currentUser = null;

// Game Config
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GameState = {
    balls: [],
    particles: [],
    stars: [],
    currentEquation: null,
    answer: null,
    score: 0,
    level: 1,
    lives: 3,
    coins: 0,
    correctCatches: 0,
    frame: 0,
    lastSpawnTime: 0,
    spawnInterval: 2000,
    isRunning: false,
    isPaused: false,
    usedEquations: new Set(),
    rafId: null,
    bgStarCanvas: null
};

// Ball Color Palettes
const BALL_COLORS = [
    { main: '#7C3AED', light: '#A78BFA' }, // Purple
    { main: '#EC4899', light: '#F9A8D4' }, // Pink
    { main: '#3B82F6', light: '#93C5FD' }, // Blue
    { main: '#F97316', light: '#FED7AA' }, // Orange
    { main: '#10B981', light: '#6EE7B7' }  // Green
];

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('eduplay_user_id');
    const username = localStorage.getItem('eduplay_username');

    if (!userId) {
        alert("Please log in to play this game!");
        window.location.href = 'login.html';
        return;
    }

    currentUser = { userId, username };

    // Setup Canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup Background Stars (Draw once to offscreen canvas)
    initBackgroundStars();

    // Setup Event Listeners
    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            handleCanvasClick({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
    }, { passive: false });

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnPause').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('btnPlayAgain').addEventListener('click', resetGame);
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (GameState.bgStarCanvas) {
        initBackgroundStars(); // redraw stars for new size
    }
}

function initBackgroundStars() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const bgCtx = bgCanvas.getContext('2d');

    GameState.stars = [];
    for (let i = 0; i < 50; i++) {
        GameState.stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5 + 0.5,
            opacityBase: Math.random(),
            opacitySpeed: Math.random() * 0.05 + 0.01
        });
    }

    // Draw static part (if any)
    GameState.bgStarCanvas = bgCanvas;
}

// ----------------------------------------------------
// GAME STATE MANAGEMENT
// ----------------------------------------------------

function startGame() {
    document.getElementById('startScreen').classList.remove('active');
    resetGame();
}

function resetGame() {
    document.getElementById('gameOverScreen').classList.remove('active');

    GameState.balls = [];
    GameState.particles = [];
    GameState.score = 0;
    GameState.level = 1;
    GameState.lives = 3;
    GameState.coins = 0;
    GameState.correctCatches = 0;
    GameState.frame = 0;
    GameState.usedEquations.clear();
    GameState.isRunning = true;
    GameState.isPaused = false;
    GameState.lastSpawnTime = 0;

    updateHUD();
    generateEquation();

    if (GameState.rafId) cancelAnimationFrame(GameState.rafId);
    gameLoop(performance.now());
}

function togglePause() {
    if (!GameState.isRunning) return;
    GameState.isPaused = !GameState.isPaused;
    const pauseScreen = document.getElementById('pauseScreen');
    if (GameState.isPaused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
        gameLoop(performance.now());
    }
}

async function endGame() {
    GameState.isRunning = false;
    if (GameState.rafId) cancelAnimationFrame(GameState.rafId);

    // Update Game Over DOM
    document.getElementById('finalScore').textContent = GameState.score;
    document.getElementById('finalLevel').textContent = GameState.level;
    document.getElementById('finalCatches').textContent = GameState.correctCatches;

    const emoji = document.getElementById('gameOverEmoji');
    const title = document.getElementById('gameOverTitle');

    if (GameState.score >= 200) {
        emoji.textContent = '🎉';
        title.textContent = 'Math Legend! 🏆';
        title.className = 'overlay-title title-math';
    } else if (GameState.score >= 100) {
        emoji.textContent = '🎉';
        title.textContent = 'Blasting It! 🚀';
        title.style.background = 'linear-gradient(to right, #A78BFA, #EC4899)';
        title.style.webkitBackgroundClip = 'text';
        title.style.color = 'transparent';
    } else if (GameState.score >= 50) {
        emoji.textContent = '🦉';
        title.textContent = 'Good Effort! ⭐';
        title.style.background = 'linear-gradient(to right, #3B82F6, #93C5FD)';
        title.style.webkitBackgroundClip = 'text';
        title.style.color = 'transparent';
    } else {
        emoji.textContent = '💪';
        title.textContent = 'Keep Practicing! 💪';
        title.style.background = 'linear-gradient(to right, #EC4899, #F9A8D4)';
        title.style.webkitBackgroundClip = 'text';
        title.style.color = 'transparent';
    }

    document.getElementById('gameOverScreen').classList.add('active');

    // Coin counter animation
    const finalCoinsEl = document.getElementById('finalCoins');
    let currentDisplayCoins = 0;
    const coinInterval = setInterval(() => {
        if (currentDisplayCoins >= GameState.coins) {
            clearInterval(coinInterval);
            finalCoinsEl.textContent = GameState.coins;
        } else {
            currentDisplayCoins++;
            finalCoinsEl.textContent = currentDisplayCoins;
            // tiny pulse
            finalCoinsEl.style.transform = 'scale(1.2)';
            setTimeout(() => finalCoinsEl.style.transform = 'scale(1)', 50);
        }
    }, 1500 / Math.max(GameState.coins, 1));

    // Save to DB
    await saveGameCoins(currentUser.userId, GameState.coins, 'math-blaster', GameState.score, GameState.level);
}

// ----------------------------------------------------
// DB INTEGRATION
// ----------------------------------------------------

async function saveGameCoins(userId, coinsEarned, gameType, score, levelReached) {
    try {
        const { data: user, error: fetchErr } = await supabaseClient
            .from('users')
            .select('game_coins')
            .eq('id', userId)
            .single();

        if (fetchErr) throw fetchErr;

        const newCoinsAmount = (user.game_coins || 0) + coinsEarned;

        await supabaseClient
            .from('users')
            .update({ game_coins: newCoinsAmount })
            .eq('id', userId);

        // Save session
        await supabaseClient
            .from('game_sessions')
            .insert([{
                user_id: userId,
                game_type: gameType,
                coins_earned: coinsEarned,
                score: score,
                level_reached: levelReached
            }]);

        // Actively update the cross-page top Nav UI natively by document element
        try {
            const coinEl = document.getElementById('navCoins');
            if (coinEl) {
                const currentVal = parseInt(coinEl.textContent || "0");
                coinEl.textContent = currentVal + coinsEarned;
                window.eduplay_current_coins = currentVal + coinsEarned;
            } else if (window.parent && window.parent.document.getElementById('navCoins')) {
                const parentCoinEl = window.parent.document.getElementById('navCoins');
                const currentVal = parseInt(parentCoinEl.textContent || "0");
                parentCoinEl.textContent = currentVal + coinsEarned;
            }
        } catch (e) { }
    } catch (err) {
        console.warn('Game coin save issue: ', err);
    }
}

// ----------------------------------------------------
// GAME LOGIC
// ----------------------------------------------------

function generateEquation() {
    let a, b, eqString, ans;
    let attempts = 0;

    do {
        const lvl = GameState.level;
        const typeRoll = Math.random();

        if (lvl === 1) {
            // Add
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            ans = a + b;
            eqString = `${a} + ${b} = ?`;
        } else if (lvl === 2) {
            // Add / Sub
            if (typeRoll > 0.5) {
                a = Math.floor(Math.random() * 20) + 1;
                b = Math.floor(Math.random() * 20) + 1;
                ans = a + b;
                eqString = `${a} + ${b} = ?`;
            } else {
                a = Math.floor(Math.random() * 20) + 5;
                b = Math.floor(Math.random() * a);
                ans = a - b;
                eqString = `${a} - ${b} = ?`;
            }
        } else if (lvl === 3) {
            // Mul
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 8) + 2;
            ans = a * b;
            eqString = `${a} × ${b} = ?`;
        } else if (lvl === 4) {
            if (typeRoll > 0.7) {
                const evens = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
                a = evens[Math.floor(Math.random() * evens.length)];
                ans = a / 2;
                eqString = `Half of ${a} = ?`;
            } else if (typeRoll > 0.4) {
                a = Math.floor(Math.random() * 10) + 1;
                b = Math.floor(Math.random() * 9) + 2;
                ans = a * b;
                eqString = `${a} × ${b} = ?`;
            } else {
                a = Math.floor(Math.random() * 30) + 10;
                b = Math.floor(Math.random() * 20) + 1;
                ans = a + b;
                eqString = `${a} + ${b} = ?`;
            }
        } else {
            // Div / Mixed
            if (typeRoll > 0.6) {
                b = Math.floor(Math.random() * 9) + 2;
                ans = Math.floor(Math.random() * 10) + 2;
                a = b * ans;
                eqString = `${a} ÷ ${b} = ?`;
            } else if (typeRoll > 0.3 && lvl >= 6) {
                let x = Math.floor(Math.random() * 5) + 1;
                let y = Math.floor(Math.random() * 4) + 1;
                let c = Math.floor(Math.random() * 5) + 2;
                ans = (x + y) * c;
                eqString = `(${x} + ${y}) × ${c} = ?`;
            } else {
                a = Math.floor(Math.random() * 12) + 2;
                b = Math.floor(Math.random() * 11) + 2;
                ans = a * b;
                eqString = `${a} × ${b} = ?`;
            }
        }
        attempts++;
    } while (GameState.usedEquations.has(eqString) && attempts < 20);

    GameState.usedEquations.add(eqString);
    GameState.currentEquation = eqString;
    GameState.answer = ans;

    const display = document.getElementById('equationDisplay');
    display.textContent = eqString;

    // Slide animation trigger
    display.style.animation = 'none';
    void display.offsetWidth;
    display.style.animation = 'pulse-gold 2s infinite, slide-in-right 0.3s ease-out';
}

function checkLevelUp() {
    const newLevel = Math.floor(GameState.correctCatches / 5) + 1;
    if (newLevel > GameState.level) {
        GameState.level = newLevel;
        document.getElementById('levelBadge').textContent = `LEVEL ${GameState.level}`;

        // Level Up FX
        flashScreen('gold');
        const lvlText = document.getElementById('levelUpText');
        lvlText.classList.remove('active');
        void lvlText.offsetWidth;
        lvlText.classList.add('active');

        // Clear balls and new eqn
        GameState.balls = [];
        generateEquation();

        // Update spawn rules
        GameState.spawnInterval = Math.max(800, 2000 - (GameState.level * 200));
    }
}

// ----------------------------------------------------
// RENDERING
// ----------------------------------------------------

function gameLoop(timestamp) {
    if (!GameState.isRunning || GameState.isPaused) return;

    GameState.rafId = requestAnimationFrame(gameLoop);
    GameState.frame++;

    clearCanvas();
    drawBackground();
    drawStars();
    updateAndDrawBalls(timestamp);
    updateAndDrawParticles();
    checkSpawnNewBall(timestamp);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
    // Background tint progression
    let topColor = '#0F0A1E';
    let btmColor = '#1A1035';

    if (GameState.level === 2) { topColor = '#0F1A0E'; btmColor = '#102A15'; }
    else if (GameState.level === 3) { topColor = '#1A0F0E'; btmColor = '#2A1015'; }
    else if (GameState.level === 4) { topColor = '#1A1A0E'; btmColor = '#2A2510'; }
    else if (GameState.level >= 5) { topColor = '#1A0F1A'; btmColor = '#2A102A'; }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, btmColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawStars() {
    ctx.fillStyle = 'white';
    GameState.stars.forEach(star => {
        const opacity = Math.abs(Math.sin(GameState.frame * star.opacitySpeed + star.opacityBase));
        ctx.globalAlpha = opacity * 0.8;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        if (opacity > 0.8) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
    ctx.globalAlpha = 1.0;
}

// ----------------------------------------------------
// PHYSICS & ENTITIES
// ----------------------------------------------------

function checkSpawnNewBall(timestamp) {
    if (timestamp - GameState.lastSpawnTime > GameState.spawnInterval) {
        spawnBall(timestamp);
    }
}

function spawnBall(timestamp) {
    GameState.lastSpawnTime = timestamp;

    let maxBalls = 4;
    if (GameState.level === 2) maxBalls = 5;
    if (GameState.level === 3) maxBalls = 6;
    if (GameState.level === 4) maxBalls = 7;
    if (GameState.level >= 5) maxBalls = 8;

    if (GameState.balls.length >= maxBalls) return;

    // Does answer exist?
    const hasAnswer = GameState.balls.some(b => b.isAnswer);
    let isAnswer = false;

    // If no answer, definitely spawn it
    if (!hasAnswer) {
        isAnswer = true;
    } else {
        // If answer exists, 20% chance to spawn another answer just in case
        isAnswer = Math.random() < 0.2;
    }

    let value;
    if (isAnswer) {
        value = GameState.answer;
    } else {
        // Wrong value logic
        if (GameState.level >= 3 && Math.random() < 0.5) {
            let offset = Math.floor(Math.random() * 5) + 1;
            value = GameState.answer + (Math.random() > 0.5 ? offset : -offset);
            if (value <= 0) value = GameState.answer + offset;
        } else {
            value = Math.floor(Math.random() * 100) + 1;
            if (value === GameState.answer) value += 1; // Double check
        }
    }

    const speedBase = 1.0 + (GameState.level * 0.2);
    const colorPair = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];

    const ball = {
        x: Math.random() * (canvas.width - 120) + 60,
        y: -60,
        value: value,
        speed: speedBase + Math.random() * 0.5,
        size: 50,
        colorPair: colorPair,
        isAnswer: isAnswer,
        glowIntensity: 0.5,
        trail: [],
        wobble: (GameState.level * 0.5) + Math.random() * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobbleOffset: Math.random() * Math.PI * 2,
        spawnTime: timestamp
    };

    GameState.balls.push(ball);
}

function updateAndDrawBalls(timestamp) {
    for (let i = GameState.balls.length - 1; i >= 0; i--) {
        const ball = GameState.balls[i];

        // Trail logic
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) ball.trail.shift();

        // Physics
        ball.y += ball.speed;
        const wobbleX = ball.x + Math.sin(GameState.frame * ball.wobbleSpeed + ball.wobbleOffset) * ball.wobble;

        ball.glowIntensity = 0.5 + 0.5 * Math.sin(GameState.frame * 0.05);

        // Miss check
        if (ball.y > canvas.height + 60) {
            GameState.balls.splice(i, 1);
            // Generate missed particle effect at bottom
            createParticles(ball.x, canvas.height, ball.colorPair.light, true);

            if (ball.isAnswer) {
                loseLife();
            }
            continue;
        }

        drawBall(ball, wobbleX);
    }
}

function drawBall(ball, wobbleX) {
    // Draw trail
    ball.trail.forEach((pos, idx) => {
        const alpha = (idx / ball.trail.length) * 0.3;
        const size = ball.size * 0.8 * (idx / ball.trail.length);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ball.colorPair.main;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw main glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = ball.colorPair.main;

    // Draw gradient circle
    const grad = ctx.createRadialGradient(wobbleX - 10, ball.y - 10, 5, wobbleX, ball.y, ball.size);
    grad.addColorStop(0, ball.colorPair.light);
    grad.addColorStop(1, ball.colorPair.main);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(wobbleX, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();

    // Draw Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = ball.colorPair.light;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw Text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${ball.size * 0.8}px 'Baloo 2'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillText(ball.value, wobbleX, ball.y);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

// ----------------------------------------------------
// EFFECTS & PARTICLES
// ----------------------------------------------------

function createParticles(x, y, color, isWrong = false) {
    const count = isWrong ? 8 : 12;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        GameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: Math.random() * 0.05 + 0.02,
            size: Math.random() * 6 + 4,
            color: isWrong ? 'rgba(239,68,68,0.6)' : color,
            isWrong: isWrong
        });
    }
}

function updateAndDrawParticles() {
    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        p.life -= p.decay;

        if (p.life <= 0) {
            GameState.particles.splice(i, 1);
            continue;
        }

        p.x += p.vx;
        p.y += p.vy;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.isWrong ? '#6B7280' : p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (!p.isWrong && Math.random() > 0.5) {
            ctx.fillStyle = 'white'; // Glimmers
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0;
}

// ----------------------------------------------------
// INTERACTIONS
// ----------------------------------------------------

function handleCanvasClick(e) {
    if (!GameState.isRunning || GameState.isPaused) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hit = false;

    for (let i = GameState.balls.length - 1; i >= 0; i--) {
        const ball = GameState.balls[i];
        const wobbleX = ball.x + Math.sin(GameState.frame * ball.wobbleSpeed + ball.wobbleOffset) * ball.wobble;

        const dx = x - wobbleX;
        const dy = y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= ball.size) {
            hit = true;
            GameState.balls.splice(i, 1);

            if (ball.isAnswer) {
                triggerCorrectCatch(ball, wobbleX, ball.y, performance.now());
            } else {
                triggerWrongCatch(ball, wobbleX, ball.y);
            }
            break; // Only hit one
        }
    }

    // Ripple effect for miss could be added to particles
    if (!hit) {
        createParticles(x, y, 'rgba(255,255,255,0.3)', true);
    }
}

function triggerCorrectCatch(ball, x, y, timestamp) {
    GameState.correctCatches++;
    const basePoints = 10 * GameState.level;
    GameState.score += basePoints;

    // Speed bonus
    let earnedCoins = 3;
    if (timestamp - ball.spawnTime < 2000) earnedCoins += 1;
    GameState.coins += earnedCoins;

    updateHUD();
    checkLevelUp();
    createParticles(x, y, ball.colorPair.light, false);

    // Create DOM Popups
    createDOMPopup(`+${basePoints}`, x, y, 'score-popup');
    setTimeout(() => {
        createDOMPopup(`+🪙${earnedCoins}`, x, y + 25, 'coin-popup');
    }, 150);

    flashScreen('green');
    generateEquation();
}

function triggerWrongCatch(ball, x, y) {
    createParticles(x, y, null, true);
    loseLife();
}

function loseLife() {
    GameState.lives--;
    updateHUD();

    // Shake hearts
    const livesEl = document.getElementById('livesDisplay');
    livesEl.classList.remove('shake');
    void livesEl.offsetWidth;
    livesEl.classList.add('shake');

    // Shake Canvas
    canvas.classList.remove('canvas-shake');
    void canvas.offsetWidth;
    canvas.classList.add('canvas-shake');

    flashScreen('red');

    if (GameState.lives <= 0) {
        endGame();
    } else {
        // If we missed the answer ball and are still playing, spawn a new equation
        const hasAnswer = GameState.balls.some(b => b.isAnswer);
        if (!hasAnswer) generateEquation();
    }
}

function updateHUD() {
    document.getElementById('scoreValue').textContent = GameState.score;
    let hearts = '';
    for (let i = 0; i < 3; i++) {
        hearts += i < GameState.lives ? '❤️' : '🖤';
    }
    document.getElementById('livesDisplay').textContent = hearts;
}

function flashScreen(color) {
    let el;
    if (color === 'green') {
        el = document.getElementById('flashGreen');
    } else if (color === 'red') {
        el = document.getElementById('flashRed');
    } else if (color === 'gold') {
        el = document.createElement('div');
        el.className = 'flash-overlay';
        el.style.background = 'rgba(245, 158, 11, 0.2)';
        document.body.appendChild(el);
    }

    if (!el) return;

    el.style.opacity = 1;
    setTimeout(() => {
        el.style.opacity = 0;
        if (color === 'gold') setTimeout(() => el.remove(), 300);
    }, 300);
}

function createDOMPopup(text, x, y, className) {
    const el = document.createElement('div');
    el.className = `dom-particle ${className}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = `translateY(-40px) scale(1.2)`;
        if (className === 'score-popup') {
            el.style.color = '#F59E0B';
            el.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
        }
    });

    setTimeout(() => {
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 800);
    }, 400);
}
