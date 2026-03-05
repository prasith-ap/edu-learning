// Initialize authentication state purely from Supabase
(async () => {
  if (typeof checkAuth === "function") {
    await checkAuth();
  }
})();

// =============================================
// SPEED TYPER — Full Game Engine
// =============================================

'use strict';

// ─── Word Lists ───────────────────────────────
const WORD_LISTS = {
    numbers: [
        { word: 'one', emoji: '1️⃣' }, { word: 'two', emoji: '2️⃣' }, { word: 'three', emoji: '3️⃣' },
        { word: 'four', emoji: '4️⃣' }, { word: 'five', emoji: '5️⃣' }, { word: 'six', emoji: '6️⃣' },
        { word: 'seven', emoji: '7️⃣' }, { word: 'eight', emoji: '8️⃣' }, { word: 'nine', emoji: '9️⃣' },
        { word: 'ten', emoji: '🔟' }, { word: 'eleven', emoji: '1️⃣1️⃣' }, { word: 'twelve', emoji: '1️⃣2️⃣' },
        { word: 'thirteen', emoji: '1️⃣3️⃣' }, { word: 'fourteen', emoji: '1️⃣4️⃣' }, { word: 'fifteen', emoji: '1️⃣5️⃣' },
        { word: 'sixteen', emoji: '1️⃣6️⃣' }, { word: 'seventeen', emoji: '1️⃣7️⃣' }, { word: 'eighteen', emoji: '1️⃣8️⃣' },
        { word: 'nineteen', emoji: '1️⃣9️⃣' }, { word: 'twenty', emoji: '2️⃣0️⃣' },
        { word: 'thirty', emoji: '3️⃣0️⃣' }, { word: 'forty', emoji: '4️⃣0️⃣' }, { word: 'fifty', emoji: '5️⃣0️⃣' },
        { word: 'sixty', emoji: '6️⃣0️⃣' }, { word: 'seventy', emoji: '7️⃣0️⃣' }, { word: 'eighty', emoji: '8️⃣0️⃣' },
        { word: 'ninety', emoji: '9️⃣0️⃣' }, { word: 'hundred', emoji: '💯' }, { word: 'thousand', emoji: '🔢' },
        { word: 'million', emoji: '🔢' }, { word: 'zero', emoji: '0️⃣' }, { word: 'half', emoji: '½' },
        { word: 'quarter', emoji: '¼' }, { word: 'double', emoji: '✌️' }, { word: 'triple', emoji: '3️⃣' },
        { word: 'dozen', emoji: '🔢' }, { word: 'score', emoji: '2️⃣0️⃣' }, { word: 'gross', emoji: '🔢' },
        { word: 'billion', emoji: '🔢' }, { word: 'trillion', emoji: '🔢' }, { word: 'odd', emoji: '1️⃣' },
        { word: 'even', emoji: '2️⃣' }, { word: 'prime', emoji: '⭐' }, { word: 'square', emoji: '⬛' },
        { word: 'cube', emoji: '🎲' }, { word: 'root', emoji: '🌱' }, { word: 'digit', emoji: '🔢' },
        { word: 'numeral', emoji: '🔢' }, { word: 'count', emoji: '🖐️' }, { word: 'sum', emoji: '➕' },
        { word: 'product', emoji: '✖️' }, { word: 'factor', emoji: '🔢' }, { word: 'multiple', emoji: '✖️' },
        { word: 'average', emoji: '📊' }, { word: 'median', emoji: '📊' }, { word: 'mode', emoji: '📊' },
        { word: 'ratio', emoji: '⚖️' }, { word: 'percent', emoji: '💯' }, { word: 'fraction', emoji: '🔢' },
        { word: 'decimal', emoji: '.' }, { word: 'negative', emoji: '➖' }, { word: 'positive', emoji: '➕' },
    ],
    animals: [
        { word: 'cat', emoji: '🐱' }, { word: 'dog', emoji: '🐶' }, { word: 'bird', emoji: '🐦' },
        { word: 'fish', emoji: '🐟' }, { word: 'bear', emoji: '🐻' }, { word: 'lion', emoji: '🦁' },
        { word: 'frog', emoji: '🐸' }, { word: 'duck', emoji: '🦆' }, { word: 'cow', emoji: '🐄' },
        { word: 'pig', emoji: '🐷' }, { word: 'hen', emoji: '🐔' }, { word: 'fox', emoji: '🦊' },
        { word: 'wolf', emoji: '🐺' }, { word: 'deer', emoji: '🦌' }, { word: 'goat', emoji: '🐐' },
        { word: 'sheep', emoji: '🐑' }, { word: 'horse', emoji: '🐴' }, { word: 'rabbit', emoji: '🐰' },
        { word: 'tiger', emoji: '🐯' }, { word: 'zebra', emoji: '🦓' }, { word: 'monkey', emoji: '🐒' },
        { word: 'parrot', emoji: '🦜' }, { word: 'turtle', emoji: '🐢' }, { word: 'snake', emoji: '🐍' },
        { word: 'eagle', emoji: '🦅' }, { word: 'shark', emoji: '🦈' }, { word: 'whale', emoji: '🐳' },
        { word: 'dolphin', emoji: '🐬' }, { word: 'penguin', emoji: '🐧' }, { word: 'koala', emoji: '🐨' },
        { word: 'panda', emoji: '🐼' }, { word: 'giraffe', emoji: '🦒' }, { word: 'gorilla', emoji: '🦍' },
        { word: 'leopard', emoji: '🐆' }, { word: 'cheetah', emoji: '🐆' }, { word: 'elephant', emoji: '🐘' },
        { word: 'crocodile', emoji: '🐊' }, { word: 'flamingo', emoji: '🦩' }, { word: 'peacock', emoji: '🦚' },
        { word: 'jellyfish', emoji: '🪼' }, { word: 'octopus', emoji: '🐙' }, { word: 'butterfly', emoji: '🦋' },
        { word: 'chameleon', emoji: '🦎' }, { word: 'rhinoceros', emoji: '🦏' }, { word: 'hippopotamus', emoji: '🦛' },
        { word: 'chimpanzee', emoji: '🐒' }, { word: 'salamander', emoji: '🦎' }, { word: 'capybara', emoji: '🐭' },
        { word: 'armadillo', emoji: '🦔' }, { word: 'platypus', emoji: '🦆' }, { word: 'narwhal', emoji: '🐳' },
        { word: 'wolverine', emoji: '🐻' }, { word: 'porpoise', emoji: '🐬' }, { word: 'mongoose', emoji: '🐾' },
        { word: 'iguana', emoji: '🦎' }, { word: 'macaw', emoji: '🦜' }, { word: 'toucan', emoji: '🐦' },
        { word: 'pangolin', emoji: '🐾' }, { word: 'meerkat', emoji: '🐾' }, { word: 'tapir', emoji: '🐾' },
    ],
    countries: [
        { word: 'India', emoji: '🇮🇳' }, { word: 'China', emoji: '🇨🇳' }, { word: 'Spain', emoji: '🇪🇸' },
        { word: 'Egypt', emoji: '🇪🇬' }, { word: 'Japan', emoji: '🇯🇵' }, { word: 'Brazil', emoji: '🇧🇷' },
        { word: 'Italy', emoji: '🇮🇹' }, { word: 'France', emoji: '🇫🇷' }, { word: 'Kenya', emoji: '🇰🇪' },
        { word: 'Ghana', emoji: '🇬🇭' }, { word: 'Peru', emoji: '🇵🇪' }, { word: 'Cuba', emoji: '🇨🇺' },
        { word: 'Iran', emoji: '🇮🇷' }, { word: 'Iraq', emoji: '🇮🇶' }, { word: 'Chile', emoji: '🇨🇱' },
        { word: 'Nepal', emoji: '🇳🇵' }, { word: 'Laos', emoji: '🇱🇦' }, { word: 'Fiji', emoji: '🇫🇯' },
        { word: 'Germany', emoji: '🇩🇪' }, { word: 'Mexico', emoji: '🇲🇽' }, { word: 'Nigeria', emoji: '🇳🇬' },
        { word: 'Thailand', emoji: '🇹🇭' }, { word: 'Sweden', emoji: '🇸🇪' }, { word: 'Poland', emoji: '🇵🇱' },
        { word: 'Turkey', emoji: '🇹🇷' }, { word: 'Greece', emoji: '🇬🇷' }, { word: 'Canada', emoji: '🇨🇦' },
        { word: 'Russia', emoji: '🇷🇺' }, { word: 'Finland', emoji: '🇫🇮' }, { word: 'Denmark', emoji: '🇩🇰' },
        { word: 'Norway', emoji: '🇳🇴' }, { word: 'Austria', emoji: '🇦🇹' }, { word: 'Belgium', emoji: '🇧🇪' },
        { word: 'Portugal', emoji: '🇵🇹' }, { word: 'Hungary', emoji: '🇭🇺' }, { word: 'Romania', emoji: '🇷🇴' },
        { word: 'Argentina', emoji: '🇦🇷' }, { word: 'Ethiopia', emoji: '🇪🇹' }, { word: 'Tanzania', emoji: '🇹🇿' },
        { word: 'Colombia', emoji: '🇨🇴' }, { word: 'Pakistan', emoji: '🇵🇰' }, { word: 'Malaysia', emoji: '🇲🇾' },
        { word: 'Indonesia', emoji: '🇮🇩' }, { word: 'Singapore', emoji: '🇸🇬' }, { word: 'Australia', emoji: '🇦🇺' },
        { word: 'Luxembourg', emoji: '🇱🇺' }, { word: 'Mozambique', emoji: '🇲🇿' }, { word: 'Bangladesh', emoji: '🇧🇩' },
        { word: 'Kazakhstan', emoji: '🇰🇿' }, { word: 'Azerbaijan', emoji: '🇦🇿' }, { word: 'Guatemala', emoji: '🇬🇹' },
        { word: 'Venezuela', emoji: '🇻🇪' }, { word: 'Zimbabwe', emoji: '🇿🇼' }, { word: 'Cameroon', emoji: '🇨🇲' },
        { word: 'Sri Lanka', emoji: '🇱🇰' }, { word: 'Morocco', emoji: '🇲🇦' }, { word: 'Algeria', emoji: '🇩🇿' },
        { word: 'Senegal', emoji: '🇸🇳' }, { word: 'Iceland', emoji: '🇮🇸' }, { word: 'Ukraine', emoji: '🇺🇦' },
    ],
    vocabulary: [
        { word: 'happy', emoji: '😊' }, { word: 'brave', emoji: '🦁' }, { word: 'swift', emoji: '⚡' },
        { word: 'quiet', emoji: '🤫' }, { word: 'bright', emoji: '💡' }, { word: 'strong', emoji: '💪' },
        { word: 'kind', emoji: '💝' }, { word: 'smart', emoji: '🧠' }, { word: 'proud', emoji: '🏆' },
        { word: 'calm', emoji: '😌' }, { word: 'bold', emoji: '🔥' }, { word: 'fair', emoji: '⚖️' },
        { word: 'clear', emoji: '💎' }, { word: 'wild', emoji: '🌿' }, { word: 'pure', emoji: '✨' },
        { word: 'clever', emoji: '🦊' }, { word: 'gentle', emoji: '🕊️' }, { word: 'playful', emoji: '🎮' },
        { word: 'curious', emoji: '🔍' }, { word: 'patient', emoji: '⏳' }, { word: 'grateful', emoji: '🙏' },
        { word: 'enormous', emoji: '🐘' }, { word: 'ancient', emoji: '🏛️' }, { word: 'radiant', emoji: '✨' },
        { word: 'ferocious', emoji: '🐯' }, { word: 'tranquil', emoji: '🌊' }, { word: 'vibrant', emoji: '🌈' },
        { word: 'majestic', emoji: '👑' }, { word: 'luminous', emoji: '💡' }, { word: 'serene', emoji: '🏞️' },
        { word: 'diligent', emoji: '📚' }, { word: 'sincere', emoji: '💝' }, { word: 'prudent', emoji: '🦉' },
        { word: 'tenacious', emoji: '💪' }, { word: 'eloquent', emoji: '🎭' }, { word: 'ardent', emoji: '🔥' },
        { word: 'whimsical', emoji: '🌀' }, { word: 'resilient', emoji: '🌱' }, { word: 'astute', emoji: '🧠' },
        { word: 'adventurous', emoji: '🗺️' }, { word: 'magnificent', emoji: '🏆' }, { word: 'mysterious', emoji: '🔮' },
        { word: 'courageous', emoji: '⚔️' }, { word: 'benevolent', emoji: '💝' }, { word: 'inquisitive', emoji: '🔍' },
        { word: 'extraordinary', emoji: '🌟' }, { word: 'phenomenal', emoji: '✨' }, { word: 'meticulous', emoji: '📏' },
        { word: 'captivating', emoji: '💫' }, { word: 'exuberant', emoji: '🎉' }, { word: 'perseverance', emoji: '🏅' },
        { word: 'flamboyant', emoji: '🦚' }, { word: 'sophisticated', emoji: '🎩' }, { word: 'scintillating', emoji: '✨' },
        { word: 'perspicacious', emoji: '🦅' }, { word: 'loquacious', emoji: '💬' }, { word: 'serendipity', emoji: '🍀' },
        { word: 'melancholy', emoji: '😢' }, { word: 'euphoric', emoji: '🎊' }, { word: 'bibliophile', emoji: '📚' },
    ]
};

// ─── Difficulty Settings ──────────────────────
const DIFF_TIMES = { easy: 6, medium: 4, hard: 2.5 };
const LEVEL_SPEED = {
    easy: [6, 5.5, 5, 4.5, 4.2, 3.9, 3.6, 3.3, 3.0, 2.8],
    medium: [4, 3.7, 3.4, 3.1, 2.9, 2.7, 2.5, 2.3, 2.1, 1.9],
    hard: [2.5, 2.3, 2.1, 1.9, 1.8, 1.7, 1.6, 1.55, 1.5, 1.5]
};

// ─── State ────────────────────────────────────
const TyperGame = {
    category: 'numbers', difficulty: 'easy',
    wordList: [], wordIdx: 0,
    currentWord: null,
    score: 0, level: 1, strikes: 0, wordsTyped: 0,
    coinsEarned: 0, wpm: 0,
    firstKeypressTime: null,
    timerInterval: null, wordTimeout: null, wpmInterval: null,
    paused: false, gameActive: false,
    timePerWord: 6,
    wordsThisLevel: 0,
};

let currentUser = null;
let supabaseClient = null;

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('eduplay_user_id');
    if (!userId) { window.location.href = 'login.html'; return; }
    currentUser = { userId };
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Category selector
    document.querySelectorAll('#catSelector .cat-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#catSelector .cat-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active'); TyperGame.category = b.dataset.cat;
        });
    });

    // Difficulty selector
    document.querySelectorAll('#diffSelector .diff-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#diffSelector .diff-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active'); TyperGame.difficulty = b.dataset.diff;
        });
    });

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
        hideOverlay('gameOverScreen'); startGame();
    });
    document.getElementById('btnChangeCategory').addEventListener('click', () => {
        hideOverlay('gameOverScreen'); showOverlay('startScreen');
    });
    document.getElementById('btnPause').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('wordInput').addEventListener('input', onInput);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') togglePause(); });
});

// ─── Start Game ───────────────────────────────
function startGame() {
    TyperGame.score = 0; TyperGame.level = 1; TyperGame.strikes = 0;
    TyperGame.wordsTyped = 0; TyperGame.coinsEarned = 0; TyperGame.wpm = 0;
    TyperGame.firstKeypressTime = null; TyperGame.paused = false;
    TyperGame.wordsThisLevel = 0;
    TyperGame.timePerWord = DIFF_TIMES[TyperGame.difficulty];
    TyperGame.gameActive = true;

    // Shuffle word list
    const raw = [...WORD_LISTS[TyperGame.category]];
    for (let i = raw.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    TyperGame.wordList = raw;
    TyperGame.wordIdx = 0;

    hideOverlay('startScreen');
    hideOverlay('gameOverScreen');
    document.getElementById('gameArea').style.display = '';

    updateStrikesDisplay();
    loadNextWord();

    // WPM update interval
    TyperGame.wpmInterval = setInterval(updateWPM, 5000);
}

// ─── Word Loading ─────────────────────────────
function loadNextWord() {
    clearInterval(TyperGame.timerInterval);
    clearTimeout(TyperGame.wordTimeout);
    document.getElementById('wordInput').value = '';
    document.getElementById('wordInput').className = 'typer-input';
    document.getElementById('missedIndicator').style.display = 'none';

    if (TyperGame.wordIdx >= TyperGame.wordList.length) {
        // Reshuffle and continue
        const raw = [...WORD_LISTS[TyperGame.category]];
        for (let i = raw.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [raw[i], raw[j]] = [raw[j], raw[i]];
        }
        TyperGame.wordList = raw;
        TyperGame.wordIdx = 0;
    }

    TyperGame.currentWord = TyperGame.wordList[TyperGame.wordIdx++];

    // Render word with letter spans
    renderWordLetters(TyperGame.currentWord.word);
    document.getElementById('emojiHint').textContent = TyperGame.currentWord.emoji;

    // Word card slide animation
    const wordDisplay = document.getElementById('wordDisplay');
    wordDisplay.classList.remove('word-slide-in');
    void wordDisplay.offsetWidth; // force reflow
    wordDisplay.classList.add('word-slide-in');

    // Focus input
    document.getElementById('wordInput').focus();

    // Start draining timer
    startWordTimer();
}

function renderWordLetters(word) {
    const display = document.getElementById('wordDisplay');
    display.innerHTML = '';
    for (let i = 0; i < word.length; i++) {
        const span = document.createElement('span');
        span.className = 'letter ' + (i === 0 ? 'next' : 'pending');
        span.textContent = word[i];
        display.appendChild(span);
    }
}

// ─── Timer ─────────────────────────────────────
function startWordTimer() {
    const totalMs = TyperGame.timePerWord * 1000;
    const startTime = Date.now();
    const fill = document.getElementById('timerFill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    fill.className = 'typer-timer-fill';
    void fill.offsetWidth;

    clearInterval(TyperGame.timerInterval);
    TyperGame.timerInterval = setInterval(() => {
        if (TyperGame.paused || !TyperGame.gameActive) return;
        const elapsed = Date.now() - startTime;
        const pct = Math.max(0, 100 - (elapsed / totalMs) * 100);
        fill.style.width = pct + '%';

        if (pct < 15) {
            fill.className = 'typer-timer-fill danger';
        } else if (pct < 35) {
            fill.className = 'typer-timer-fill amber';
        } else {
            fill.className = 'typer-timer-fill';
        }

        if (pct <= 0) {
            clearInterval(TyperGame.timerInterval);
            triggerStrikeOut();
        }
    }, 50);
}

// ─── Input Handling ───────────────────────────
function onInput(e) {
    if (!TyperGame.gameActive || TyperGame.paused) return;

    // Record first keypress time for WPM
    if (!TyperGame.firstKeypressTime) TyperGame.firstKeypressTime = Date.now();

    const input = e.target.value;
    const target = TyperGame.currentWord.word;
    const targetLower = target.toLowerCase();
    const inputLower = input.toLowerCase();

    // Update letter highlights
    updateLetterHighlights(inputLower, targetLower);

    // Check for exact match (case insensitive)
    if (inputLower === targetLower) {
        triggerCorrectWord();
        return;
    }

    // Show prefix status
    const input_el = document.getElementById('wordInput');
    if (targetLower.startsWith(inputLower) && inputLower.length > 0) {
        input_el.className = 'typer-input border-gold';
    } else if (inputLower.length > 0) {
        input_el.className = 'typer-input border-red';
    } else {
        input_el.className = 'typer-input';
    }
}

function updateLetterHighlights(input, target) {
    const letters = document.querySelectorAll('#wordDisplay .letter');
    for (let i = 0; i < letters.length; i++) {
        letters[i].className = 'letter';
        if (i < input.length) {
            letters[i].className = input[i] === target[i] ? 'letter correct' : 'letter wrong';
        } else if (i === input.length) {
            letters[i].className = 'letter next';
        } else {
            letters[i].className = 'letter pending';
        }
    }
}

// ─── Correct Word ──────────────────────────────
function triggerCorrectWord() {
    clearInterval(TyperGame.timerInterval);

    // Flash all letters green
    document.querySelectorAll('#wordDisplay .letter').forEach(l => l.className = 'letter correct');

    TyperGame.wordsTyped++;
    TyperGame.wordsThisLevel++;
    const points = 10 + TyperGame.level * 2;
    TyperGame.score += points;
    TyperGame.coinsEarned += 2;

    // Score popup
    const input = document.getElementById('wordInput');
    const rect = input.getBoundingClientRect();
    showScoreFloat(rect.left + rect.width / 2, rect.top, `+${points}`);

    // Full timer bar
    const fill = document.getElementById('timerFill');
    fill.className = 'typer-timer-fill';
    fill.style.width = '100%';

    // Background pulse green
    const body = document.getElementById('gameArea');
    body.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.08), #0F0A1E, #1A1035)';
    setTimeout(() => { body.style.background = ''; }, 300);

    updateStats();

    // Level up check
    if (TyperGame.wordsThisLevel >= 8) {
        TyperGame.level++;
        TyperGame.wordsThisLevel = 0;
        TyperGame.coinsEarned += 5;
        showLevelUp();
        // Speed increase
        const lvlIdx = Math.min(TyperGame.level - 1, 9);
        TyperGame.timePerWord = Math.max(1.5, LEVEL_SPEED[TyperGame.difficulty][lvlIdx] || 1.5);
    }

    // Load next word after short delay
    setTimeout(() => {
        if (TyperGame.gameActive) loadNextWord();
    }, 300);
}

// ─── Strike Out ───────────────────────────────
function triggerStrikeOut() {
    if (!TyperGame.gameActive) return;

    // Flash word red
    document.querySelectorAll('#wordDisplay .letter').forEach(l => l.className = 'letter wrong');

    TyperGame.strikes++;
    updateStrikesDisplay();

    // Show missed indicator
    const missed = document.getElementById('missedIndicator');
    missed.style.display = 'block';

    // Shake input
    const input = document.getElementById('wordInput');
    input.classList.add('shake-input');
    input.classList.add('border-red');
    setTimeout(() => input.classList.remove('shake-input'), 400);

    updateStats();

    if (TyperGame.strikes >= 3) {
        setTimeout(onGameOver, 600);
    } else {
        setTimeout(() => {
            if (TyperGame.gameActive) loadNextWord();
        }, 1000);
    }
}

function updateStrikesDisplay() {
    const hearts = ['❤️', '❤️', '❤️'];
    for (let i = 0; i < TyperGame.strikes; i++) hearts[2 - i] = '🖤';
    document.getElementById('strikesDisplay').textContent = hearts.join('');
}

// ─── WPM ─────────────────────────────────────
function updateWPM() {
    if (!TyperGame.firstKeypressTime || TyperGame.wordsTyped === 0) return;
    const minutes = (Date.now() - TyperGame.firstKeypressTime) / 60000;
    TyperGame.wpm = Math.round(TyperGame.wordsTyped / minutes);
    document.getElementById('wpmDisplay').textContent = TyperGame.wpm;
}

// ─── Level Up ─────────────────────────────────
function showLevelUp() {
    const el = document.getElementById('levelUpText');
    el.textContent = `LEVEL UP! ⚡ Level ${TyperGame.level}`;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 1800);
    updateStats();
}

// ─── Stats Update ─────────────────────────────
function updateStats() {
    document.getElementById('scoreDisplay').textContent = TyperGame.score;
    document.getElementById('levelDisplay').textContent = TyperGame.level;
    document.getElementById('wpmDisplay').textContent = TyperGame.wpm;
}

// ─── Score Float Popup ────────────────────────
function showScoreFloat(x, y, text) {
    const div = document.createElement('div');
    div.className = 'score-float';
    div.textContent = text;
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.transform = 'translateX(-50%)';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 900);
}

// ─── Pause ────────────────────────────────────
function togglePause() {
    if (!TyperGame.gameActive) return;
    TyperGame.paused = !TyperGame.paused;
    if (TyperGame.paused) {
        clearInterval(TyperGame.timerInterval);
        showOverlay('pauseScreen');
    } else {
        hideOverlay('pauseScreen');
        startWordTimer(); // restart timer from full for current word
    }
}

// ─── Game Over ────────────────────────────────
async function onGameOver() {
    clearInterval(TyperGame.timerInterval);
    clearInterval(TyperGame.wpmInterval);
    TyperGame.gameActive = false;
    updateWPM();

    // Coin WPM bonus
    TyperGame.coinsEarned += Math.max(0, Math.floor((TyperGame.wpm - 20) / 10));

    // Title based on level
    let emoji, title;
    if (TyperGame.level >= 5) { emoji = '🏆'; title = 'Speed Demon! ⚡'; }
    else if (TyperGame.level >= 3) { emoji = '⭐'; title = 'Fast Fingers! 🖐️'; }
    else { emoji = '💪'; title = 'Keep Typing! 💪'; }

    document.getElementById('goEmoji').textContent = emoji;
    document.getElementById('goTitle').textContent = title;
    document.getElementById('goTitle').className = 'overlay-title title-typer';
    document.getElementById('goScore').textContent = TyperGame.score;
    document.getElementById('goLevel').textContent = TyperGame.level;
    document.getElementById('goWords').textContent = TyperGame.wordsTyped;
    document.getElementById('goWPM').textContent = TyperGame.wpm;

    // Animate coins
    let c = 0; const target = TyperGame.coinsEarned;
    const coinEl = document.getElementById('goCoins');
    const iv = setInterval(() => {
        c = Math.min(c + Math.ceil(target / 30), target);
        coinEl.textContent = c;
        if (c >= target) clearInterval(iv);
    }, 30);

    // Check personal best
    try {
        const { data } = await supabaseClient
            .from('game_sessions')
            .select('score')
            .eq('user_id', currentUser.userId)
            .eq('game_type', 'speed-typer')
            .order('score', { ascending: false })
            .limit(1);

        const prevBest = data?.[0]?.score || 0;
        if (TyperGame.score > prevBest) {
            document.getElementById('newBestBanner').style.display = 'block';
        } else if (prevBest > 0) {
            document.getElementById('prevBestDiv').textContent = `Your best: ${prevBest} pts — beat it!`;
        }
    } catch (e) { }

    document.getElementById('gameArea').style.display = 'none';
    showOverlay('gameOverScreen');

    await saveGameSession(currentUser.userId, 'speed-typer', {
        score: TyperGame.score, coinsEarned: TyperGame.coinsEarned, levelReached: TyperGame.level
    });
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
        // Update nav display if on parent frame
        const coinEl = document.getElementById('navCoins');
        if (coinEl) coinEl.textContent = newCoins;
    } catch (e) {
        console.warn('Save failed:', e);
    }
}

// ─── Overlay helpers ─────────────────────────
function showOverlay(id) { document.getElementById(id).classList.add('active'); }
function hideOverlay(id) { document.getElementById(id).classList.remove('active'); }
