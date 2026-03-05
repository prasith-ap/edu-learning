// Initialize authentication state purely from Supabase
(async () => {
  if (typeof checkAuth === "function") {
    await checkAuth();
  }
})();

// =============================================
// MEMORY FLIP — Full Game Engine
// =============================================

'use strict';

// ─── Fallback Card Pairs ──────────────────────
const FALLBACK_PAIRS = {
    math: {
        easy: [
            { card1: '2 + 3', card2: '5', emoji: '➕' },
            { card1: '4 × 2', card2: '8', emoji: '✖️' },
            { card1: '10 - 6', card2: '4', emoji: '➖' },
            { card1: '9 ÷ 3', card2: '3', emoji: '➗' },
            { card1: '5 + 7', card2: '12', emoji: '➕' },
            { card1: '3 × 3', card2: '9', emoji: '✖️' },
            { card1: '15 - 8', card2: '7', emoji: '➖' },
            { card1: 'Square of 4', card2: '16', emoji: '⬛' },
        ],
        medium: [
            { card1: '7 × 8', card2: '56', emoji: '✖️' },
            { card1: '√144', card2: '12', emoji: '🔢' },
            { card1: '25% of 80', card2: '20', emoji: '💯' },
            { card1: '2⁴', card2: '16', emoji: '🔢' },
            { card1: '180 ÷ 9', card2: '20', emoji: '➗' },
            { card1: 'Area 5×6', card2: '30', emoji: '📐' },
            { card1: 'Next prime after 11', card2: '13', emoji: '🔢' },
            { card1: '0.75 as fraction', card2: '3/4', emoji: '🔢' },
        ],
        hard: [
            { card1: '3³', card2: '27', emoji: '🔢' },
            { card1: '√225', card2: '15', emoji: '🔢' },
            { card1: '15% of 200', card2: '30', emoji: '💯' },
            { card1: '2⁷', card2: '128', emoji: '🔢' },
            { card1: 'Perimeter of 8×5 rect', card2: '26', emoji: '📐' },
            { card1: '1/3 as decimal', card2: '0.333', emoji: '🔢' },
            { card1: 'LCM of 4 & 6', card2: '12', emoji: '🔢' },
            { card1: 'Prime factors of 12', card2: '2,2,3', emoji: '🔢' },
        ]
    },
    english: {
        easy: [
            { card1: 'happy', card2: 'joyful', emoji: '😊' },
            { card1: 'big', card2: 'large', emoji: '⬆️' },
            { card1: 'fast', card2: 'quick', emoji: '⚡' },
            { card1: 'cold', card2: 'opposite of hot', emoji: '🥶' },
            { card1: 'dog', card2: 'loyal animal', emoji: '🐕' },
            { card1: 'run', card2: 'ran', emoji: '🏃' },
            { card1: 'noun', card2: 'name of a thing', emoji: '📝' },
            { card1: 'verb', card2: 'action word', emoji: '🏃' },
        ],
        medium: [
            { card1: 'enormous', card2: 'very large', emoji: '🐘' },
            { card1: 'ancient', card2: 'very old', emoji: '🏛️' },
            { card1: 'swift', card2: 'very fast', emoji: '⚡' },
            { card1: 'melancholy', card2: 'feeling sad', emoji: '😢' },
            { card1: 'eagle', card2: 'bird of prey', emoji: '🦅' },
            { card1: 'brave', card2: 'courageous', emoji: '🦁' },
            { card1: 'go', card2: 'went', emoji: '🚶' },
            { card1: 'synonym', card2: 'same meaning word', emoji: '📖' },
        ],
        hard: [
            { card1: 'ephemeral', card2: 'lasting briefly', emoji: '🌸' },
            { card1: 'tenacious', card2: 'not giving up', emoji: '💪' },
            { card1: 'meticulous', card2: 'very careful', emoji: '🔍' },
            { card1: 'ubiquitous', card2: 'found everywhere', emoji: '🌍' },
            { card1: 'cogent', card2: 'clear and logical', emoji: '🧠' },
            { card1: 'serendipity', card2: 'happy accident', emoji: '🍀' },
            { card1: 'juxtapose', card2: 'place side by side', emoji: '↔️' },
            { card1: 'hyperbole', card2: 'extreme exaggeration', emoji: '🎭' },
        ]
    },
    gk: {
        easy: [
            { card1: 'France', card2: 'Paris', emoji: '🗼' },
            { card1: 'Japan', card2: 'Tokyo', emoji: '🗾' },
            { card1: 'Lion', card2: 'Roar', emoji: '🦁' },
            { card1: 'Dog', card2: 'Bark', emoji: '🐕' },
            { card1: 'Earth', card2: '3rd from Sun', emoji: '🌍' },
            { card1: 'Mars', card2: 'Red Planet', emoji: '🔴' },
            { card1: 'Penguin', card2: 'Antarctica', emoji: '🐧' },
            { card1: 'Telephone', card2: 'Bell', emoji: '📞' },
        ],
        medium: [
            { card1: 'Brazil', card2: 'Brasília', emoji: '🇧🇷' },
            { card1: 'Egypt', card2: 'Cairo', emoji: '🏛️' },
            { card1: 'Largest planet', card2: 'Jupiter', emoji: '🪐' },
            { card1: 'Elephant', card2: 'Largest land animal', emoji: '🐘' },
            { card1: 'Nile River', card2: 'Longest river', emoji: '🌊' },
            { card1: 'H₂O', card2: 'Water formula', emoji: '💧' },
            { card1: 'Photosynthesis', card2: 'Plants make food', emoji: '🌱' },
            { card1: '8 legs', card2: 'Spider', emoji: '🕷️' },
        ],
        hard: [
            { card1: 'Canberra', card2: 'Capital of Australia', emoji: '🦘' },
            { card1: 'Nairobi', card2: 'Capital of Kenya', emoji: '🦒' },
            { card1: 'Isaac Newton', card2: 'Discovered gravity', emoji: '🍎' },
            { card1: 'Marie Curie', card2: 'First female Nobel winner', emoji: '⚗️' },
            { card1: 'Deepest ocean', card2: 'Mariana Trench', emoji: '🌊' },
            { card1: 'Fastest land animal', card2: 'Cheetah', emoji: '🐆' },
            { card1: 'Smallest planet', card2: 'Mercury', emoji: '☿' },
            { card1: 'Great Barrier Reef', card2: 'Australia', emoji: '🐠' },
        ]
    }
};

// ─── State ────────────────────────────────────
const MemGame = {
    mode: 'math', difficulty: 'easy', timedMode: false,
    pairs: [], cards: [],
    flippedCards: [], matchedPairs: 0,
    score: 0, wrongFlips: 0, currentCombo: 0, bestCombo: 0,
    coinsEarned: 0,
    locked: false, paused: false, gameActive: false,
    timerLeft: 120, timerInterval: null,
    startTime: null, timeTaken: 0,
    peekUsed: false
};

let currentUser = null;
let supabaseClient = null;

const GROQ_API_KEY_KEY = 'GROQ_API_KEY';

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('eduplay_user_id');
    if (!userId) { window.location.href = 'login.html'; return; }
    currentUser = { userId };
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Mode selector
    document.querySelectorAll('#modeSelector .diff-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#modeSelector .diff-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active'); MemGame.mode = b.dataset.mode;
        });
    });

    // Difficulty selector
    document.querySelectorAll('#diffSelector .diff-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#diffSelector .diff-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active'); MemGame.difficulty = b.dataset.diff;
        });
    });

    // Timed toggle
    document.getElementById('timedToggle').addEventListener('click', () => {
        MemGame.timedMode = !MemGame.timedMode;
        document.getElementById('timedToggle').classList.toggle('on', MemGame.timedMode);
    });

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnNewGame').addEventListener('click', () => {
        hideOverlay('gameOverScreen'); startGame();
    });
    document.getElementById('btnChangeSubject').addEventListener('click', () => {
        hideOverlay('gameOverScreen'); showOverlay('startScreen');
    });
    document.getElementById('btnPause').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('peekBtn').addEventListener('click', usePeek);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') togglePause(); });
});

// ─── Start Game ───────────────────────────────
async function startGame() {
    MemGame.flippedCards = [];
    MemGame.matchedPairs = 0;
    MemGame.score = 0; MemGame.wrongFlips = 0;
    MemGame.currentCombo = 0; MemGame.bestCombo = 0;
    MemGame.coinsEarned = 0;
    MemGame.locked = false; MemGame.paused = false;
    MemGame.timerLeft = 120; MemGame.peekUsed = false;
    MemGame.gameActive = true;
    MemGame.startTime = Date.now();

    hideOverlay('startScreen');
    showOverlay('loadingScreen');

    // Fetch pairs from Groq or use fallback
    MemGame.pairs = await generateMemoryPairs(MemGame.mode, MemGame.difficulty);

    hideOverlay('loadingScreen');

    renderGrid();

    document.getElementById('statsRow').style.display = '';
    document.getElementById('memoryGrid').style.display = '';
    document.getElementById('peekBtn').disabled = false;
    document.getElementById('peekBtn').textContent = '👁️ Peek';

    if (MemGame.timedMode) {
        document.getElementById('memTimerTrack').style.display = '';
        document.getElementById('timerChip').style.display = '';
        startMemTimer();
    }

    updateStats();
}

// ─── Groq Card Generation ─────────────────────
async function generateMemoryPairs(mode, difficulty) {
    try {
        const groqKey = (typeof CONFIG !== 'undefined' && CONFIG.GROQ_API_KEY) ? CONFIG.GROQ_API_KEY : null;
        if (!groqKey) throw new Error('No Groq key');

        const prompt = `Generate exactly 8 matching pairs for a memory card game for children aged 6-12.
Subject mode: ${mode}. Difficulty: ${difficulty}.
Return ONLY valid JSON array of 8 objects:
[{"card1":"...","card2":"...","emoji":"..."},...]
Rules: obvious match, age-appropriate, no duplicates, difficulty matters. JSON only.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
                model: 'llama3-8b-8192', temperature: 0.6, max_tokens: 800,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!res.ok) throw new Error('Groq API error');
        const data = await res.json();
        const text = data.choices[0].message.content.trim();
        const jsonStr = text.includes('[') ? text.slice(text.indexOf('['), text.lastIndexOf(']') + 1) : text;
        const pairs = JSON.parse(jsonStr);
        if (Array.isArray(pairs) && pairs.length >= 8) return pairs.slice(0, 8);
        throw new Error('Invalid response');
    } catch (e) {
        console.warn('Groq failed, using fallback:', e);
        return FALLBACK_PAIRS[mode][difficulty];
    }
}

// ─── Grid Rendering ───────────────────────────
function renderGrid() {
    const grid = document.getElementById('memoryGrid');
    grid.innerHTML = '';
    MemGame.cards = [];

    // Create 16 cards (8 pairs × 2)
    const cardData = [];
    MemGame.pairs.forEach((pair, i) => {
        cardData.push({ pairId: i, face: pair.card1, emoji: pair.emoji, mode: MemGame.mode });
        cardData.push({ pairId: i, face: pair.card2, emoji: pair.emoji, mode: MemGame.mode });
    });

    // Shuffle
    for (let i = cardData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
    }

    cardData.forEach((data, idx) => {
        const container = document.createElement('div');
        container.className = 'card-container';
        container.dataset.pairId = data.pairId;
        container.dataset.idx = idx;

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        // Back face
        const back = document.createElement('div');
        back.className = 'card-face card-back';

        // Front face
        const front = document.createElement('div');
        const modeClass = data.mode === 'math' ? 'math-card' : data.mode === 'english' ? 'english-card' : 'gk-card';
        front.className = `card-face card-front ${modeClass}`;

        const emojiEl = document.createElement('div');
        emojiEl.className = 'card-emoji';
        emojiEl.textContent = data.emoji;

        const textEl = document.createElement('div');
        const len = data.face.length;
        textEl.className = 'card-text ' + (len < 7 ? 'short' : len < 13 ? 'medium' : 'long');
        textEl.textContent = data.face;

        front.appendChild(emojiEl); front.appendChild(textEl);
        inner.appendChild(back); inner.appendChild(front);
        container.appendChild(inner);

        const cardObj = {
            el: container, innerEl: inner,
            pairId: data.pairId, idx, isFlipped: false, isMatched: false
        };
        MemGame.cards.push(cardObj);

        container.addEventListener('click', () => onCardClick(cardObj));
        container.addEventListener('touchend', e => { e.preventDefault(); onCardClick(cardObj); });

        grid.appendChild(container);
    });
}

// ─── Card Click ───────────────────────────────
function onCardClick(card) {
    if (MemGame.locked || MemGame.paused || !MemGame.gameActive) return;
    if (card.isFlipped || card.isMatched) return;
    if (MemGame.flippedCards.length >= 2) return;

    flipCard(card);
    MemGame.flippedCards.push(card);

    if (MemGame.flippedCards.length === 2) {
        MemGame.locked = true;
        setTimeout(checkMatch, 600);
    }
}

function flipCard(card) {
    card.isFlipped = true;
    card.innerEl.classList.add('flipped');
    card.el.classList.add('awaiting');
}

function unflipCard(card) {
    card.isFlipped = false;
    card.innerEl.classList.remove('flipped');
    card.el.classList.remove('awaiting');
}

function checkMatch() {
    const [a, b] = MemGame.flippedCards;
    if (a.pairId === b.pairId) {
        // Match!
        a.isMatched = b.isMatched = true;
        a.el.classList.remove('awaiting'); b.el.classList.remove('awaiting');
        a.el.classList.add('matched'); b.el.classList.add('matched');
        a.innerEl.classList.add('matched-final'); b.innerEl.classList.add('matched-final');

        MemGame.matchedPairs++;
        MemGame.score += 20;
        MemGame.coinsEarned += 4;
        MemGame.currentCombo++;
        if (MemGame.currentCombo > MemGame.bestCombo) MemGame.bestCombo = MemGame.currentCombo;

        // Combo bonus
        let comboBonus = 0;
        if (MemGame.currentCombo === 2) comboBonus = 10;
        else if (MemGame.currentCombo === 3) comboBonus = 20;
        else if (MemGame.currentCombo >= 4) comboBonus = 30;

        if (comboBonus > 0) {
            MemGame.score += comboBonus;
            showComboBurst(`🔥 ${MemGame.currentCombo}x COMBO! +${comboBonus}`);
        }

        MemGame.flippedCards = [];
        MemGame.locked = false;
        updateStats();

        if (MemGame.matchedPairs === 8) {
            setTimeout(onGameComplete, 400);
        }
    } else {
        // No match
        MemGame.wrongFlips++;
        MemGame.currentCombo = 0;

        a.innerEl.classList.add('shake'); b.innerEl.classList.add('shake');
        a.el.style.borderColor = 'rgba(239,68,68,0.6)';
        b.el.style.borderColor = 'rgba(239,68,68,0.6)';

        setTimeout(() => {
            a.innerEl.classList.remove('shake'); b.innerEl.classList.remove('shake');
            a.el.style.borderColor = ''; b.el.style.borderColor = '';
            unflipCard(a); unflipCard(b);
            MemGame.flippedCards = [];
            MemGame.locked = false;
        }, 1200);

        updateStats();
    }
}

// ─── Peek Mode ────────────────────────────────
function usePeek() {
    if (MemGame.peekUsed || !MemGame.gameActive) return;
    MemGame.peekUsed = true;
    MemGame.score = Math.max(0, MemGame.score - 20);
    document.getElementById('peekBtn').disabled = true;
    document.getElementById('peekBtn').textContent = '👁️ Peeked';

    const grid = document.getElementById('memoryGrid');
    grid.classList.add('memory-peek-active');

    // Flip all unmatched to face-up
    MemGame.cards.forEach(c => {
        if (!c.isMatched) c.innerEl.classList.add('flipped');
    });

    setTimeout(() => {
        grid.classList.remove('memory-peek-active');
        MemGame.cards.forEach(c => {
            if (!c.isMatched && !c.isFlipped) c.innerEl.classList.remove('flipped');
        });
        // Show "Peek used" notification
        const notif = document.createElement('div');
        notif.style.cssText = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);background:rgba(239,68,68,0.9);color:white;padding:10px 20px;border-radius:12px;font-weight:800;z-index:100;font-family:Nunito,sans-serif;';
        notif.textContent = 'Peek used! Score -20';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 1500);
        updateStats();
    }, 2000);
}

// ─── Timed Mode ───────────────────────────────
function startMemTimer() {
    clearInterval(MemGame.timerInterval);
    MemGame.timerLeft = 120;
    MemGame.timerInterval = setInterval(() => {
        if (MemGame.paused || !MemGame.gameActive) return;
        MemGame.timerLeft--;
        document.getElementById('timerChipVal').textContent = MemGame.timerLeft;
        document.getElementById('memTimerFill').style.width = (MemGame.timerLeft / 120 * 100) + '%';
        if (MemGame.timerLeft <= 0) {
            clearInterval(MemGame.timerInterval);
            onTimeOut();
        }
    }, 1000);
}

function onTimeOut() {
    MemGame.gameActive = false;
    onGameOver(false);
}

// ─── Game Complete ────────────────────────────
function onGameComplete() {
    clearInterval(MemGame.timerInterval);
    MemGame.gameActive = false;
    MemGame.timeTaken = Math.round((Date.now() - MemGame.startTime) / 1000);

    // Completion bonus based on wrong flips
    let bonus = 0, bonusCoins = 0;
    if (MemGame.wrongFlips === 0) { bonus = 100; bonusCoins = 10; }
    else if (MemGame.wrongFlips <= 2) { bonus = 50; bonusCoins = 5; }
    else if (MemGame.wrongFlips <= 5) { bonus = 20; bonusCoins = 2; }
    MemGame.score += bonus;
    MemGame.coinsEarned += bonusCoins;

    // Speed bonus
    if (MemGame.timeTaken < 60) MemGame.coinsEarned += 10;

    launchConfetti();
    setTimeout(() => onGameOver(true), 1000);
}

async function onGameOver(completed) {
    const mins = Math.floor((MemGame.timeTaken || 0) / 60);
    const secs = (MemGame.timeTaken || 0) % 60;

    let title = '';
    if (!completed) {
        title = "Time's Up! ⏰";
        document.getElementById('goEmoji').textContent = '⏰';
    } else if (MemGame.wrongFlips === 0) {
        title = 'Perfect Memory! 🧠'; document.getElementById('goEmoji').textContent = '💯';
        document.getElementById('perfectBanner').style.display = 'block';
    } else if (MemGame.wrongFlips <= 3) {
        title = 'Memory Champion! 🏆'; document.getElementById('goEmoji').textContent = '🏆';
    } else if (MemGame.wrongFlips <= 6) {
        title = 'Great Job! ⭐'; document.getElementById('goEmoji').textContent = '⭐';
    } else {
        title = 'Keep Practicing! 💪'; document.getElementById('goEmoji').textContent = '💪';
    }

    document.getElementById('goTitle').textContent = title;
    document.getElementById('goTitle').className = 'overlay-title title-memory';
    document.getElementById('goPairs').textContent = `${MemGame.matchedPairs}/8`;
    document.getElementById('goWrong').textContent = MemGame.wrongFlips;
    document.getElementById('goTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('goCombo').textContent = MemGame.bestCombo;

    // Animate coins
    let c = 0;
    const target = MemGame.coinsEarned;
    const coinEl = document.getElementById('goCoins');
    const iv = setInterval(() => {
        c = Math.min(c + Math.ceil(target / 30), target);
        coinEl.textContent = c;
        if (c >= target) clearInterval(iv);
    }, 30);

    showOverlay('gameOverScreen');

    await saveGameSession(currentUser.userId, 'memory-flip', {
        score: MemGame.score, coinsEarned: MemGame.coinsEarned, levelReached: MemGame.matchedPairs
    });
}

// ─── Pause ────────────────────────────────────
function togglePause() {
    if (!MemGame.gameActive) return;
    MemGame.paused = !MemGame.paused;
    if (MemGame.paused) showOverlay('pauseScreen');
    else hideOverlay('pauseScreen');
}

// ─── Stats ────────────────────────────────────
function updateStats() {
    document.getElementById('scoreChip').textContent = MemGame.score;
    document.getElementById('pairsChip').textContent = MemGame.matchedPairs;
    document.getElementById('wrongChip').textContent = MemGame.wrongFlips;
    document.getElementById('comboChip').textContent = MemGame.currentCombo;
    document.getElementById('coinsChip').textContent = MemGame.coinsEarned;
}

// ─── Combo Burst ─────────────────────────────
function showComboBurst(text) {
    const b = document.createElement('div');
    b.className = 'combo-burst';
    b.textContent = text;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1000);
}

// ─── DB Save ─────────────────────────────────
async function saveGameSession(userId, gameType, data) {
    try {
        const { data: user } = await supabaseClient.from('users').select('game_coins').eq('id', userId).single();
        const newCoins = (user?.game_coins || 0) + data.coinsEarned;
        await supabaseClient.from('users').update({ game_coins: newCoins }).eq('id', userId);
        await supabaseClient.from('game_sessions').insert([{
            user_id: userId, game_type: gameType,
            score: data.score, coins_earned: data.coinsEarned, level_reached: data.levelReached
        }]);
    } catch (e) {
        console.warn('Save failed:', e);
    }
}

// ─── Confetti ─────────────────────────────────
function launchConfetti() {
    const colors = ['#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#A78BFA', '#FCD34D'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = '-10px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (6 + Math.random() * 8) + 'px';
        p.style.height = (6 + Math.random() * 8) + 'px';
        p.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        p.style.animationDelay = (Math.random() * 0.8) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4000);
    }
}

// ─── Overlay helpers ─────────────────────────
function showOverlay(id) { document.getElementById(id).classList.add('active'); }
function hideOverlay(id) { document.getElementById(id).classList.remove('active'); }
