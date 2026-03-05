/**
 * WORD BUBBLE POP GAME ENGINE
 * EduPlay Bonus Mini-Game
 */

// Supabase Init
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
let currentUser = null;

// Game Config
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BubbleGame = {
    bubbles: [],
    particles: [],
    popEffects: [],
    score: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    maxCombo: 0,
    coins: 0,
    timeLeft: 60,
    level: 1,
    isRunning: false,
    isPaused: false,
    frame: 0,
    lastSpawnTime: 0,
    usedWords: new Set(),
    rafId: null,
    timerIntervalId: null,
    bgStarCanvas: null
};

// Word Lists
const WORDS = {
    easy: [
        { correct: "apple", wrong: "aple" },
        { correct: "happy", wrong: "hapy" },
        { correct: "friend", wrong: "freind" },
        { correct: "school", wrong: "skool" },
        { correct: "beautiful", wrong: "beutiful" },
        { correct: "because", wrong: "becuase" },
        { correct: "people", wrong: "pepole" },
        { correct: "together", wrong: "togther" },
        { correct: "elephant", wrong: "elefant" },
        { correct: "butterfly", wrong: "buttefly" },
        { correct: "garden", wrong: "gardin" },
        { correct: "summer", wrong: "sumer" },
        { correct: "winter", wrong: "wintir" },
        { correct: "family", wrong: "famaly" },
        { correct: "animal", wrong: "animel" },
        { correct: "water", wrong: "warter" },
        { correct: "yellow", wrong: "yelow" },
        { correct: "purple", wrong: "purpel" },
        { correct: "orange", wrong: "oranje" },
        { correct: "mother", wrong: "muther" },
        { correct: "father", wrong: "fawther" },
        { correct: "sister", wrong: "sistar" },
        { correct: "brother", wrong: "bruther" },
        { correct: "teacher", wrong: "techer" },
        { correct: "doctor", wrong: "docter" },
        { correct: "police", wrong: "poleec" },
        { correct: "little", wrong: "litle" },
        { correct: "always", wrong: "alwayes" },
        { correct: "another", wrong: "anuther" },
        { correct: "before", wrong: "bifore" },
        { correct: "better", wrong: "beter" },
        { correct: "change", wrong: "chanje" },
        { correct: "every", wrong: "evry" },
        { correct: "first", wrong: "ferst" },
        { correct: "found", wrong: "fownd" },
        { correct: "great", wrong: "grate" },
        { correct: "house", wrong: "howse" },
        { correct: "large", wrong: "larj" },
        { correct: "never", wrong: "nevar" },
        { correct: "number", wrong: "numbir" }
    ],
    medium: [
        { correct: "necessary", wrong: "necesary" },
        { correct: "separate", wrong: "seperate" },
        { correct: "calendar", wrong: "calender" },
        { correct: "privilege", wrong: "privelege" },
        { correct: "occurrence", wrong: "occurence" },
        { correct: "committee", wrong: "comitee" },
        { correct: "beginning", wrong: "begining" },
        { correct: "definitely", wrong: "definately" },
        { correct: "environment", wrong: "enviroment" },
        { correct: "government", wrong: "goverment" },
        { correct: "business", wrong: "buisness" },
        { correct: "decide", wrong: "disside" },
        { correct: "receive", wrong: "recieve" },
        { correct: "until", wrong: "untill" },
        { correct: "which", wrong: "wich" },
        { correct: "across", wrong: "accross" },
        { correct: "address", wrong: "adress" },
        { correct: "basically", wrong: "basicly" },
        { correct: "completely", wrong: "completly" },
        { correct: "different", wrong: "diffrent" },
        { correct: "disappear", wrong: "dissappear" },
        { correct: "disappoint", wrong: "dissapoint" },
        { correct: "excellent", wrong: "excellant" },
        { correct: "finally", wrong: "finaly" },
        { correct: "foreign", wrong: "foriegn" },
        { correct: "grammar", wrong: "grammer" },
        { correct: "happened", wrong: "hapened" },
        { correct: "imagine", wrong: "imagin" },
        { correct: "important", wrong: "importent" },
        { correct: "interesting", wrong: "intresting" },
        { correct: "knowledge", wrong: "knowlege" },
        { correct: "library", wrong: "libary" },
        { correct: "minute", wrong: "minite" },
        { correct: "noticeable", wrong: "noticable" },
        { correct: "piece", wrong: "peice" },
        { correct: "preferred", wrong: "prefered" },
        { correct: "probably", wrong: "probly" },
        { correct: "promise", wrong: "promiss" },
        { correct: "really", wrong: "realy" },
        { correct: "remember", wrong: "rember" }
    ],
    hard: [
        { correct: "achieve", wrong: "acheive" },
        { correct: "believe", wrong: "beleive" },
        { correct: "conscientious", wrong: "consciencious" },
        { correct: "rhythm", wrong: "rythm" },
        { correct: "accommodate", wrong: "accomodate" },
        { correct: "millennium", wrong: "millenium" },
        { correct: "questionnaire", wrong: "questionairre" },
        { correct: "Fahrenheit", wrong: "Farenheit" },
        { correct: "cemetery", wrong: "cemetary" },
        { correct: "embarrass", wrong: "embarass" },
        { correct: "fluorescent", wrong: "flourescent" },
        { correct: "guarantee", wrong: "garanty" },
        { correct: "harass", wrong: "harrass" },
        { correct: "independent", wrong: "independant" },
        { correct: "maintenance", wrong: "maintainance" },
        { correct: "maneuver", wrong: "manuever" },
        { correct: "medieval", wrong: "medeval" },
        { correct: "miniature", wrong: "minature" },
        { correct: "mischievous", wrong: "mischevious" },
        { correct: "occasionally", wrong: "occassionally" },
        { correct: "parallel", wrong: "paralell" },
        { correct: "perseverance", wrong: "percervarence" },
        { correct: "playwright", wrong: "playright" },
        { correct: "possession", wrong: "posession" },
        { correct: "precede", wrong: "preceed" },
        { correct: "principal", wrong: "principle" },
        { correct: "pronunciation", wrong: "pronounciation" },
        { correct: "recommend", wrong: "recomend" },
        { correct: "restaurant", wrong: "restarant" },
        { correct: "secretary", wrong: "secretery" },
        { correct: "successful", wrong: "succesful" },
        { correct: "supersede", wrong: "supercede" },
        { correct: "their", wrong: "thier" },
        { correct: "threshold", wrong: "threshhold" },
        { correct: "twelfth", wrong: "twelth" },
        { correct: "vacuum", wrong: "vaccum" },
        { correct: "weather", wrong: "whether" },
        { correct: "weird", wrong: "wierd" },
        { correct: "acceptable", wrong: "acceptible" },
        { correct: "accidentally", wrong: "accidently" }
    ]
};

// Colors (match Math Blaster exactly)
const BUBBLE_COLORS = [
    '124, 58, 237',   // 0: Purple
    '236, 72, 153',   // 1: Pink
    '59, 130, 246',   // 2: Blue
    '16, 185, 129',   // 3: Green
    '245, 158, 11',   // 4: Gold
    '249, 115, 22'    // 5: Orange
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

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
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
    if (BubbleGame.bgStarCanvas) initBackgroundStars();
}

function initBackgroundStars() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;

    BubbleGame.bgStarCanvas = bgCanvas;
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

    BubbleGame.bubbles = [];
    BubbleGame.particles = [];
    BubbleGame.popEffects = [];
    BubbleGame.score = 0;
    BubbleGame.correct = 0;
    BubbleGame.wrong = 0;
    BubbleGame.combo = 0;
    BubbleGame.maxCombo = 0;
    BubbleGame.coins = 0;
    BubbleGame.timeLeft = 60;
    BubbleGame.level = 1;
    BubbleGame.frame = 0;
    document.getElementById('levelBadge').textContent = `LEVEL 1`;
    BubbleGame.usedWords.clear();
    BubbleGame.isRunning = true;
    BubbleGame.isPaused = false;
    BubbleGame.lastSpawnTime = 0;

    updateTimerHUD();
    updateScoreHUD();

    if (BubbleGame.rafId) cancelAnimationFrame(BubbleGame.rafId);
    BubbleGame.rafId = requestAnimationFrame(gameLoop);

    if (BubbleGame.timerIntervalId) clearInterval(BubbleGame.timerIntervalId);
    BubbleGame.timerIntervalId = setInterval(decrementTimer, 1000);
}

function decrementTimer() {
    if (!BubbleGame.isRunning || BubbleGame.isPaused) return;
    BubbleGame.timeLeft--;
    updateTimerHUD();
    if (BubbleGame.timeLeft <= 0) {
        endGame();
    }
}

function togglePause() {
    if (!BubbleGame.isRunning) return;
    BubbleGame.isPaused = !BubbleGame.isPaused;
    const pauseScreen = document.getElementById('pauseScreen');
    if (BubbleGame.isPaused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
        BubbleGame.rafId = requestAnimationFrame(gameLoop);
    }
}

async function endGame() {
    BubbleGame.isRunning = false;
    if (BubbleGame.rafId) cancelAnimationFrame(BubbleGame.rafId);
    if (BubbleGame.timerIntervalId) clearInterval(BubbleGame.timerIntervalId);

    // Stats
    document.getElementById('finalCorrect').textContent = BubbleGame.correct;
    document.getElementById('finalWrong').textContent = BubbleGame.wrong;
    document.getElementById('finalCombo').textContent = BubbleGame.maxCombo;

    const totalAttempts = BubbleGame.correct + BubbleGame.wrong;
    const accuracy = totalAttempts > 0 ? Math.round((BubbleGame.correct / totalAttempts) * 100) : 0;
    document.getElementById('finalAccuracy').textContent = accuracy;
    setTimeout(() => {
        document.getElementById('accuracyBar').style.width = accuracy + '%';
    }, 100);

    // Bonus Coins Math
    let bonusCoins = 0;
    if (BubbleGame.wrong === 0 && BubbleGame.correct > 0) bonusCoins += 15;

    BubbleGame.coins += bonusCoins;

    // Title / Emoji
    const emoji = document.getElementById('gameOverEmoji');
    const title = document.getElementById('gameOverTitle');
    if (BubbleGame.correct >= 20) {
        emoji.textContent = '🎉';
        title.textContent = 'Champion Popper!';
        title.style.background = 'linear-gradient(to right, #F59E0B, #EF4444)';
    } else if (BubbleGame.correct >= 10) {
        emoji.textContent = '⭐';
        title.textContent = 'Great Spotter!';
    } else if (BubbleGame.correct >= 5) {
        emoji.textContent = '💪';
        title.textContent = 'Keep practicing!';
    } else {
        emoji.textContent = '🌱';
        title.textContent = "You're learning!";
    }
    title.style.webkitBackgroundClip = 'text';
    title.style.color = 'transparent';

    document.getElementById('gameOverScreen').classList.add('active');

    // Coin counter animation
    const finalCoinsEl = document.getElementById('finalCoins');
    let currentCoins = 0;
    const coinInt = setInterval(() => {
        if (currentCoins >= BubbleGame.coins) {
            clearInterval(coinInt);
            finalCoinsEl.textContent = BubbleGame.coins;
        } else {
            currentCoins++;
            finalCoinsEl.textContent = currentCoins;
            finalCoinsEl.style.transform = 'scale(1.2)';
            setTimeout(() => finalCoinsEl.style.transform = 'scale(1)', 50);
        }
    }, 1500 / Math.max(BubbleGame.coins, 1));

    await saveGameCoins(currentUser.userId, BubbleGame.coins, 'word-bubble', BubbleGame.score, BubbleGame.maxCombo);
}

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
// RENDERING
// ----------------------------------------------------

function gameLoop(timestamp) {
    if (!BubbleGame.isRunning || BubbleGame.isPaused) return;

    BubbleGame.rafId = requestAnimationFrame(gameLoop);
    BubbleGame.frame++;

    clearCanvas();
    drawBackground();
    updateAndDrawBubbles();
    updateAndDrawParticles();
    updateAndDrawPopEffects();
    checkSpawn(timestamp);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    if (BubbleGame.combo >= 8) {
        // ON FIRE! Warmer background
        gradient.addColorStop(0, '#1A0A10');
        gradient.addColorStop(1, '#351020');
    } else {
        // Progressive level backgrounds
        let topColor = '#0F0A1E';
        let btmColor = '#1A1035';

        if (BubbleGame.level === 2) { topColor = '#0F1A0E'; btmColor = '#102A15'; }
        else if (BubbleGame.level === 3) { topColor = '#1A0F0E'; btmColor = '#2A1015'; }
        else if (BubbleGame.level === 4) { topColor = '#1A1A0E'; btmColor = '#2A2510'; }
        else if (BubbleGame.level >= 5) { topColor = '#1A0F1A'; btmColor = '#2A102A'; }

        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, btmColor);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ----------------------------------------------------
// BUBBLE SPAWNING & PHYSICS
// ----------------------------------------------------

function checkSpawn(timestamp) {
    let interval = Math.max(800, 2200 - ((BubbleGame.level - 1) * 300));
    let maxBubbles = Math.min(10, 4 + BubbleGame.level);

    // On fire speedup
    if (BubbleGame.combo >= 8) interval *= 0.8;

    if (timestamp - BubbleGame.lastSpawnTime > interval) {
        if (BubbleGame.bubbles.length < maxBubbles) {
            spawnBubble();
            BubbleGame.lastSpawnTime = timestamp;
        }
    }
}

function spawnBubble() {
    let list;
    if (BubbleGame.level <= 2) list = WORDS.easy;
    else if (BubbleGame.level <= 4) list = WORDS.easy.concat(WORDS.medium);
    else list = WORDS.easy.concat(WORDS.medium).concat(WORDS.hard);

    let isCorrect = Math.random() < 0.6; // 60% correct
    let attempts = 0;
    let wordPair;

    do {
        wordPair = list[Math.floor(Math.random() * list.length)];
        attempts++;
    } while (BubbleGame.usedWords.has(wordPair.correct) && attempts < 20);

    BubbleGame.usedWords.add(wordPair.correct);

    const wordText = isCorrect ? wordPair.correct : wordPair.wrong;
    const speedScale = 1.0 + (BubbleGame.level * 0.2);

    const radius = 45 + Math.random() * 25;
    const bubble = {
        x: Math.random() * (canvas.width - radius * 2 - 40) + radius + 20,
        y: canvas.height + radius + 10,
        radius: radius,
        word: wordText,
        isCorrect: isCorrect,
        speed: (Math.random() * 0.5 + 0.8) * speedScale,
        wobble: Math.random() * 30 + 10,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        wobbleOffset: Math.random() * Math.PI * 2,
        colorIndex: Math.floor(Math.random() * BUBBLE_COLORS.length),
        shimmer: Math.random() * 360,
        opacity: 1.0
    };

    BubbleGame.bubbles.push(bubble);
}

function updateAndDrawBubbles() {
    for (let i = BubbleGame.bubbles.length - 1; i >= 0; i--) {
        const bubble = BubbleGame.bubbles[i];

        // Float upwards
        bubble.y -= bubble.speed;
        const wobbleX = bubble.x + Math.sin(BubbleGame.frame * bubble.wobbleSpeed + bubble.wobbleOffset) * bubble.wobble;
        bubble.shimmer += 2; // Iridescence

        // Check missed
        if (bubble.y < -bubble.radius * 2) {
            BubbleGame.bubbles.splice(i, 1);
            continue;
        }

        drawSoapBubble(wobbleX, bubble.y, bubble.radius, bubble.colorIndex, bubble.word, bubble.shimmer, bubble.isCorrect);
    }
}

function drawSoapBubble(x, y, radius, colorIdx, word, shimmerAngle, isCorrect) {
    const c = BUBBLE_COLORS[colorIdx];

    // Wrong word hint base tweaks
    const renderColor = isCorrect ? c : `239, 68, 68`; // slight red hint if wrong
    const baseAlpha = isCorrect ? '0.15' : '0.2';
    const edgeAlpha = isCorrect ? '0.6' : '0.7';

    // 1. MAIN BUBBLE BODY
    const bodyGrad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    bodyGrad.addColorStop(0, `rgba(${c}, ${baseAlpha})`);
    if (!isCorrect) bodyGrad.addColorStop(0.5, `rgba(239,68,68,0.1)`);
    bodyGrad.addColorStop(1, `rgba(${c}, ${edgeAlpha})`);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // On Fire Aura
    if (BubbleGame.combo >= 8) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(249,115,22,0.8)';
    }

    // 2. BORDER
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(${c}, 0.8)`;
    ctx.stroke();

    ctx.shadowBlur = 0; // reset

    // 3. IRIDESCENT SHIMMER
    ctx.lineWidth = 4;
    ctx.strokeStyle = `hsla(${shimmerAngle % 360}, 100%, 70%, 0.3)`;
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // 4. MAIN HIGHLIGHT (Top left)
    const hx = x - radius * 0.3;
    const hy = y - radius * 0.35;
    const hGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius * 0.4);
    hGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    hGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.ellipse(hx, hy, radius * 0.3, radius * 0.15, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 5. SECONDARY HIGHLIGHT
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x + radius * 0.25, y + radius * 0.3, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 6. WORD TEXT
    const fontSize = radius * 0.38;
    ctx.font = `bold ${fontSize}px 'Baloo 2'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Fake text shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(word, x + 2, y + 2);
    ctx.fillStyle = 'white';
    ctx.fillText(word, x, y);

    if (!isCorrect) {
        ctx.font = `bold ${radius * 0.2}px 'Nunito'`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('?', x + radius * 0.6, y + radius * 0.6);
    }
}

// ----------------------------------------------------
// POP EFFECTS & PARTICLES
// ----------------------------------------------------

function createPopEffect(x, y, radius, colorStr, isWrong) {
    BubbleGame.popEffects.push({
        x, y,
        radius: radius,
        maxRadius: radius * 3,
        colorStr: isWrong ? '239,68,68' : colorStr,
        life: 1.0
    });

    // Particles
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        BubbleGame.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.03 + Math.random() * 0.04,
            size: Math.random() * 5 + 3,
            color: isWrong ? 'rgba(239,68,68,0.6)' : `rgba(${colorStr},0.6)`
        });
    }
}

function updateAndDrawPopEffects() {
    for (let i = BubbleGame.popEffects.length - 1; i >= 0; i--) {
        const eff = BubbleGame.popEffects[i];
        eff.life -= 0.05;
        if (eff.life <= 0) {
            BubbleGame.popEffects.splice(i, 1);
            continue;
        }

        const currentRad = eff.radius + (eff.maxRadius - eff.radius) * (1 - eff.life);

        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(${eff.colorStr}, ${eff.life})`;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, currentRad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${eff.colorStr}, ${eff.life * 0.5})`;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, currentRad * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function updateAndDrawParticles() {
    for (let i = BubbleGame.particles.length - 1; i >= 0; i--) {
        const p = BubbleGame.particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
            BubbleGame.particles.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ----------------------------------------------------
// INTERACTIONS & LOGIC
// ----------------------------------------------------

function handleCanvasClick(e) {
    if (!BubbleGame.isRunning || BubbleGame.isPaused) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Reverse iterate to click top-most bubble
    for (let i = BubbleGame.bubbles.length - 1; i >= 0; i--) {
        const bubble = BubbleGame.bubbles[i];
        const wobbleX = bubble.x + Math.sin(BubbleGame.frame * bubble.wobbleSpeed + bubble.wobbleOffset) * bubble.wobble;

        const dx = x - wobbleX;
        const dy = y - bubble.y;
        if (Math.sqrt(dx * dx + dy * dy) <= bubble.radius) {
            // Pop it!
            BubbleGame.bubbles.splice(i, 1);
            triggerPop(bubble, wobbleX, bubble.y);
            break;
        }
    }
}

function triggerPop(bubble, x, y) {
    createPopEffect(x, y, bubble.radius, BUBBLE_COLORS[bubble.colorIndex], !bubble.isCorrect);

    if (bubble.isCorrect) {
        BubbleGame.correct++;
        BubbleGame.score += 10;
        BubbleGame.combo++;
        if (BubbleGame.combo > BubbleGame.maxCombo) BubbleGame.maxCombo = BubbleGame.combo;

        // Combo math
        let multiplier = 1;
        let bonus = 0;
        if (BubbleGame.combo >= 8) { multiplier = 3; bonus = 20; }
        else if (BubbleGame.combo >= 5) { multiplier = 2; bonus = 10; }
        else if (BubbleGame.combo >= 3) { multiplier = 1.5; bonus = 5; }

        BubbleGame.score += bonus;
        BubbleGame.coins += 2;
        if (BubbleGame.combo >= 3) BubbleGame.coins += 1;

        flashScreen('green');

        // Popups
        createDOMPopup(bubble.word, x, y - 20, 'word-popup');
        createDOMPopup(`+${10 + bonus}`, x, y - 50, 'score-popup');

        checkLevelUp();

    } else {
        BubbleGame.wrong++;
        BubbleGame.score = Math.max(0, BubbleGame.score - 5);
        BubbleGame.combo = 0;

        flashScreen('red');
        createDOMPopup('✗ WRONG', x, y - 30, 'wrong-popup');
        createDOMPopup('-5', x, y - 60, 'wrong-popup');
    }

    updateScoreHUD();
}

function checkLevelUp() {
    const newLevel = Math.floor(BubbleGame.correct / 5) + 1;
    if (newLevel > BubbleGame.level) {
        BubbleGame.level = newLevel;
        document.getElementById('levelBadge').textContent = `LEVEL ${BubbleGame.level}`;

        flashScreen('gold');
        const lvlText = document.getElementById('levelUpText');
        if (lvlText) {
            lvlText.classList.remove('active');
            void lvlText.offsetWidth;
            lvlText.classList.add('active');
        }
    }
}

function updateScoreHUD() {
    document.getElementById('correctScore').textContent = BubbleGame.correct;
    document.getElementById('wrongScore').textContent = BubbleGame.wrong;

    const comboEl = document.getElementById('comboDisplay');
    if (BubbleGame.combo >= 3) {
        comboEl.classList.add('active');
        if (BubbleGame.combo >= 8) {
            comboEl.textContent = '🔥🔥 ON FIRE! 🔥🔥';
            comboEl.classList.add('on-fire');
        } else {
            comboEl.textContent = `🔥 ${BubbleGame.combo}x Combo!`;
            comboEl.classList.remove('on-fire');
        }
        // Re-trigger animation
        comboEl.style.animation = 'none';
        void comboEl.offsetWidth;
        comboEl.style.animation = 'pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    } else {
        comboEl.classList.remove('active', 'on-fire');
    }
}

function updateTimerHUD() {
    const el = document.getElementById('timeValue');
    const box = document.getElementById('timerBox');
    el.textContent = BubbleGame.timeLeft;

    box.classList.remove('warning', 'danger');
    if (BubbleGame.timeLeft <= 15) {
        box.classList.add('danger');
        if (BubbleGame.timeLeft <= 5) flashScreen('red');
    } else if (BubbleGame.timeLeft <= 30) {
        box.classList.add('warning');
    }

    // Ring offset
    const ratio = BubbleGame.timeLeft / 60;
    const offset = 188.5 - (188.5 * ratio); // 188.5 is stroke-dasharray
    const ring = box.querySelector('circle');
    if (ring) ring.style.strokeDashoffset = offset;
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
    });

    setTimeout(() => {
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 800);
    }, 400);
}
