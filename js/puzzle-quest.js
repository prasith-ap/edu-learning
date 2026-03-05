// Initialize authentication state purely from Supabase
(async () => {
  if (typeof checkAuth === "function") {
    await checkAuth();
  }
})();

// =============================================
// PUZZLE QUEST — Full Game Engine
// =============================================

'use strict';

// ─── State ───────────────────────────────────
const COLS = 4, ROWS = 3, TOTAL_PIECES = 12;
const DIFF_TIMES = { easy: 180, medium: 120, hard: 90 };
const SCENE_LIST = {
    math: ['Number Castle', 'Fraction Forest', 'Shape Galaxy'],
    english: ['Alphabet Jungle', 'Story Kingdom', 'Grammar Garden'],
    gk: ['World Landmarks', 'Animal Kingdom', 'Solar System']
};

const FUN_FACTS = {
    'Number Castle': 'The number π (pi) has been calculated to over 100 trillion decimal places!',
    'Fraction Forest': 'A fraction represents equal parts of a whole – like slicing a pizza 🍕!',
    'Shape Galaxy': 'Hexagons are the most efficient shape for tiling a flat surface – bees knew this first!',
    'Alphabet Jungle': 'The English alphabet has 26 letters, but ancient Greek had over 40!',
    'Story Kingdom': 'The oldest written story ever found is the Epic of Gilgamesh, over 4,000 years old!',
    'Grammar Garden': 'English has over 1 million words – more than any other language!',
    'World Landmarks': 'The Great Wall of China is over 21,000 km long – that is longer than the Earth is wide!',
    'Animal Kingdom': 'Elephants are the only animals that cannot jump. But they can run up to 40 km/h!',
    'Solar System': 'One million Earths could fit inside the Sun. That is really, really big!'
};

const PuzzleGame = {
    pieces: [], placedCount: 0,
    timeLeft: 180, timerInterval: null,
    coinsEarned: 0, score: 0,
    hintsLeft: 3, hintsUsed: 0,
    difficulty: 'easy', category: 'math', sceneIdx: 0,
    sceneName: '',
    startTime: null, timeTaken: 0,
    paused: false, gameActive: false,
    dragPiece: null,
    dragEl: null,
    dragOffX: 0, dragOffY: 0,
    sceneCanvas: null,
    pieceW: 0, pieceH: 0,
    boardRect: null
};

let currentUser = null;
let supabaseClient = null;

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('eduplay_user_id');
    const username = localStorage.getItem('eduplay_username');
    if (!userId) { alert('Please log in!'); window.location.href = 'login.html'; return; }
    currentUser = { userId, username };

    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Category selector
    document.querySelectorAll('#categorySelector .diff-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#categorySelector .diff-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active');
            PuzzleGame.category = b.dataset.cat;
        });
    });

    // Difficulty selector
    document.querySelectorAll('#diffSelector .diff-pill').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#diffSelector .diff-pill').forEach(p => p.classList.remove('active'));
            b.classList.add('active');
            PuzzleGame.difficulty = b.dataset.diff;
        });
    });

    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnNewPuzzle').addEventListener('click', () => {
        PuzzleGame.sceneIdx = (PuzzleGame.sceneIdx + 1) % 3;
        hideOverlay('gameOverScreen');
        startGame();
    });
    document.getElementById('hintBtn').addEventListener('click', useHint);
    document.getElementById('btnPause').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);

    document.addEventListener('keydown', e => { if (e.key === 'Escape') togglePause(); });

    // Drag events
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
});

// ─── Scene Drawing ────────────────────────────
function drawPuzzleScene(ctx, sceneName, w, h) {
    switch (sceneName) {
        case 'Number Castle': drawNumberCastle(ctx, w, h); break;
        case 'Fraction Forest': drawFractionForest(ctx, w, h); break;
        case 'Shape Galaxy': drawShapeGalaxy(ctx, w, h); break;
        case 'Alphabet Jungle': drawAlphabetJungle(ctx, w, h); break;
        case 'Story Kingdom': drawStoryKingdom(ctx, w, h); break;
        case 'Grammar Garden': drawGrammarGarden(ctx, w, h); break;
        case 'World Landmarks': drawWorldLandmarks(ctx, w, h); break;
        case 'Animal Kingdom': drawAnimalKingdom(ctx, w, h); break;
        case 'Solar System': drawSolarSystem(ctx, w, h); break;
        default: drawNumberCastle(ctx, w, h);
    }
}

function drawNumberCastle(ctx, w, h) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3B0764'); sky.addColorStop(1, '#7C3AED');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    [[50, 40], [120, 25], [200, 55], [310, 30], [380, 45], [440, 20], [500, 60]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x * w / 600, y * h / 400, 2, 0, Math.PI * 2); ctx.fill();
    });
    // Ground
    ctx.fillStyle = '#4C1D95';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    // Main tower
    const tw = w * 0.18, tx = w * 0.5 - tw / 2;
    ctx.fillStyle = '#6D28D9'; ctx.fillRect(tx, h * 0.25, tw, h * 0.5);
    ctx.fillStyle = '#5B21B6'; ctx.fillRect(tx + 5, h * 0.25, tw - 10, h * 0.5);
    // Left tower
    ctx.fillStyle = '#7C3AED'; ctx.fillRect(tx - w * 0.12, h * 0.4, w * 0.1, h * 0.35);
    // Right tower
    ctx.fillStyle = '#7C3AED'; ctx.fillRect(tx + tw + w * 0.02, h * 0.4, w * 0.1, h * 0.35);
    // Battlements
    const bh = h * 0.06, bw = w * 0.035;
    ctx.fillStyle = '#8B5CF6';
    for (let i = 0; i < 4; i++) ctx.fillRect(tx + i * (bw + 4) * 1.5, h * 0.25 - bh, bw, bh);
    // Windows (squares)
    ctx.fillStyle = '#FCD34D';
    ctx.fillRect(tx + tw * 0.2, h * 0.35, tw * 0.25, tw * 0.25);
    ctx.fillRect(tx + tw * 0.55, h * 0.35, tw * 0.25, tw * 0.25);
    ctx.fillRect(tx + tw * 0.35, h * 0.52, tw * 0.3, tw * 0.3);
    // Door (arch)
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.arc(tx + tw / 2, h * 0.72, tw * 0.15, Math.PI, 0);
    ctx.lineTo(tx + tw / 2 + tw * 0.15, h * 0.75);
    ctx.lineTo(tx + tw / 2 - tw * 0.15, h * 0.75);
    ctx.fill();
    // Flag with π
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, h * 0.25); ctx.lineTo(tx + tw / 2, h * 0.1); ctx.stroke();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, h * 0.1); ctx.lineTo(tx + tw / 2 + w * 0.06, h * 0.15); ctx.lineTo(tx + tw / 2, h * 0.2); ctx.fill();
    ctx.fillStyle = '#1E1B4B'; ctx.font = `bold ${h * 0.06}px serif`;
    ctx.textAlign = 'center'; ctx.fillText('π', tx + tw / 2 + w * 0.03, h * 0.17);
    // Side tower flags
    ctx.fillStyle = '#EC4899';
    [[tx - w * 0.07, h * 0.4], [tx + tw + w * 0.07, h * 0.4]].forEach(([fx, fy]) => {
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + w * 0.05, fy + h * 0.04); ctx.lineTo(fx, fy + h * 0.08); ctx.fill();
    });
    // Path
    ctx.fillStyle = '#5B21B6';
    ctx.beginPath(); ctx.moveTo(tx + tw * 0.3, h * 0.75); ctx.lineTo(tx + tw * 0.7, h * 0.75);
    ctx.lineTo(tx + tw * 0.8, h); ctx.lineTo(tx + tw * 0.2, h); ctx.fill();
    // Numbers floating
    ctx.font = `bold ${h * 0.055}px 'Baloo 2', cursive`;
    ctx.fillStyle = 'rgba(252,211,77,0.9)';
    [['3', w * 0.1, h * 0.5], ['7', w * 0.9, h * 0.45], ['π', w * 0.15, h * 0.25], ['∞', w * 0.85, h * 0.3]].forEach(([t, x, y]) => {
        ctx.fillText(t, x, y);
    });
}

function drawFractionForest(ctx, w, h) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#064E3B'); sky.addColorStop(1, '#065F46');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Ground
    ctx.fillStyle = '#6B7280'; ctx.fillRect(0, h * 0.75, w, h * 0.25);
    ctx.fillStyle = '#4B5563'; ctx.fillRect(0, h * 0.75, w, h * 0.04);
    // Sun
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath(); ctx.arc(w * 0.85, h * 0.12, h * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(252,211,77,0.4)'; ctx.lineWidth = 3;
    for (let a = 0; a < 8; a++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.85 + Math.cos(a / 8 * Math.PI * 2) * (h * 0.1), h * 0.12 + Math.sin(a / 8 * Math.PI * 2) * (h * 0.1));
        ctx.lineTo(w * 0.85 + Math.cos(a / 8 * Math.PI * 2) * (h * 0.14), h * 0.12 + Math.sin(a / 8 * Math.PI * 2) * (h * 0.14));
        ctx.stroke();
    }
    // Draw trees with fraction coloring
    const trees = [
        { x: w * 0.12, frac: '1/2', pct: 0.5, c1: '#10B981', c2: '#6B7280' },
        { x: w * 0.30, frac: '3/4', pct: 0.75, c1: '#10B981', c2: '#6B7280' },
        { x: w * 0.50, frac: '1/4', pct: 0.25, c1: '#10B981', c2: '#6B7280' },
        { x: w * 0.70, frac: '2/3', pct: 0.667, c1: '#10B981', c2: '#6B7280' },
        { x: w * 0.88, frac: '1/3', pct: 0.333, c1: '#10B981', c2: '#6B7280' },
    ];
    trees.forEach(t => {
        const th = h * 0.45, tw = w * 0.06, cy = h * 0.5;
        // Trunk
        ctx.fillStyle = '#78350F';
        ctx.fillRect(t.x - tw * 0.2, h * 0.75 - th * 0.4, tw * 0.4, th * 0.4);
        // Canopy (circle, split)
        const r = tw * 1.1;
        // filled part (green)
        ctx.fillStyle = t.c1;
        ctx.beginPath();
        ctx.moveTo(t.x, cy - r);
        ctx.arc(t.x, cy, r, -Math.PI / 2, -Math.PI / 2 + t.pct * Math.PI * 2);
        ctx.lineTo(t.x, cy); ctx.fill();
        // empty part (grey)
        ctx.fillStyle = t.c2;
        ctx.beginPath();
        ctx.moveTo(t.x, cy);
        ctx.arc(t.x, cy, r, -Math.PI / 2 + t.pct * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
        ctx.lineTo(t.x, cy); ctx.fill();
        // Fraction label
        ctx.font = `bold ${h * 0.045}px 'Baloo 2',cursive`;
        ctx.fillStyle = '#FCD34D'; ctx.textAlign = 'center';
        ctx.fillText(t.frac, t.x, cy + r + h * 0.06);
    });
    // Animals
    ctx.font = `${h * 0.07}px serif`;
    ctx.fillText('🐦', w * 0.4, h * 0.18);
    ctx.fillText('🐿️', w * 0.6, h * 0.72);
}

function drawShapeGalaxy(ctx, w, h) {
    ctx.fillStyle = '#0C0A1E'; ctx.fillRect(0, 0, w, h);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    // Large circle planet
    const grad1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 5, w * 0.2, h * 0.3, h * 0.12);
    grad1.addColorStop(0, '#60A5FA'); grad1.addColorStop(1, '#1D4ED8');
    ctx.fillStyle = grad1;
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.3, h * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `bold ${h * 0.04}px 'Baloo 2',cursive`;
    ctx.textAlign = 'center'; ctx.fillText('Circle Planet', w * 0.2, h * 0.46);
    // Hexagon moon
    ctx.fillStyle = '#A78BFA'; ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        ctx.lineTo(w * 0.75 + h * 0.09 * Math.cos(i / 6 * Math.PI * 2), h * 0.2 + h * 0.09 * Math.sin(i / 6 * Math.PI * 2));
    } ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'white'; ctx.fillText('Hexagon Moon', w * 0.75, h * 0.34);
    // Triangle asteroid
    ctx.fillStyle = '#F59E0B'; ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.65 - h * 0.1); ctx.lineTo(w * 0.5 + h * 0.1, h * 0.65 + h * 0.1);
    ctx.lineTo(w * 0.5 - h * 0.1, h * 0.65 + h * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'white'; ctx.fillText('Triangle\nAsteroid', w * 0.5, h * 0.82);
    // Equations floating
    ctx.font = `${h * 0.035}px 'Baloo 2',cursive`;
    ctx.fillStyle = 'rgba(252,211,77,0.7)';
    ['A=πr²', 'V=4/3πr³', 'a²+b²=c²'].forEach((eq, i) => {
        ctx.fillText(eq, w * (0.1 + i * 0.35), h * (0.55 + i * 0.05));
    });
    // Milky way arc
    ctx.strokeStyle = 'rgba(167,139,250,0.15)'; ctx.lineWidth = 30;
    ctx.beginPath(); ctx.arc(w, h, w * 0.9, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
}

function drawAlphabetJungle(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, '#92400E'); sky.addColorStop(1, '#D97706');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#065F46'; ctx.fillRect(0, h * 0.65, w, h * 0.35);
    // Trees with letters
    const treeCols = ['#047857', '#065F46', '#064E3B', '#059669', '#10B981'];
    'ABCDE'.split('').forEach((letter, i) => {
        const tx = w * (0.08 + i * 0.18);
        const th = h * (0.25 + Math.random() * 0.15);
        ctx.fillStyle = '#78350F'; ctx.fillRect(tx - w * 0.02, h * 0.65 - th * 0.3, w * 0.04, th * 0.3);
        ctx.fillStyle = treeCols[i];
        ctx.beginPath(); ctx.arc(tx, h * 0.65 - th, w * 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.font = `bold ${h * 0.07}px 'Baloo 2',cursive`;
        ctx.fillStyle = '#FCD34D'; ctx.textAlign = 'center';
        ctx.fillText(letter, tx, h * 0.65 - th + h * 0.025);
    });
    // Animals
    ctx.font = `${h * 0.08}px serif`;
    [['🦁', w * 0.8, h * 0.6], ['🐒', w * 0.15, h * 0.4], ['🦜', w * 0.9, h * 0.35]].forEach(([e, x, y]) => ctx.fillText(e, x, y));
    // Word labels
    ctx.font = `bold ${h * 0.035}px 'Nunito',sans-serif`; ctx.fillStyle = 'white';
    [['lion=fierce', w * 0.8, h * 0.68], ['monkey=clever', w * 0.15, h * 0.5]].forEach(([t, x, y]) => ctx.fillText(t, x, y));
}

function drawStoryKingdom(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#831843'); sky.addColorStop(1, '#BE185D');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9D174D'; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Castle
    ctx.fillStyle = '#F9A8D4';
    ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
    ctx.fillStyle = '#EC4899';
    ctx.fillRect(w * 0.35, h * 0.2, w * 0.12, h * 0.12);
    ctx.fillRect(w * 0.53, h * 0.2, w * 0.12, h * 0.12);
    // Book towers
    ['📖', '📚', '📝'].forEach((e, i) => {
        ctx.font = `${h * 0.1}px serif`;
        ctx.fillText(e, w * (0.2 + i * 0.23), h * 0.45);
    });
    // Characters
    ctx.font = `${h * 0.08}px serif`;
    [['🗡️', w * 0.1, h * 0.65], ['👸', w * 0.85, h * 0.65], ['🐲', w * 0.5, h * 0.68]].forEach(([e, x, y]) => ctx.fillText(e, x, y));
    ctx.font = `bold ${h * 0.03}px 'Nunito',sans-serif`; ctx.fillStyle = '#FCD34D';
    [['brave', w * 0.1, h * 0.73], ['clever', w * 0.85, h * 0.73], ['fierce', w * 0.5, h * 0.76]].forEach(([t, x, y]) => {
        ctx.textAlign = 'center'; ctx.fillText(t, x, y);
    });
    // Sparkles
    ctx.font = '20px serif';
    ['⭐', '✨', '🌟'].forEach((e, i) => ctx.fillText(e, w * (0.05 + i * 0.4), h * 0.15));
}

function drawGrammarGarden(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#BAE6FD'); sky.addColorStop(1, '#7DD3FC');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#A3E635'; ctx.fillRect(0, h * 0.65, w, h * 0.35);
    // Rainbow
    const rainbowColors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'];
    rainbowColors.forEach((c, i) => {
        ctx.strokeStyle = c; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.8, (h * 0.6 - i * 12), Math.PI, 0); ctx.stroke();
    });
    // Labelled flowers
    const flowers = [
        { x: w * 0.15, y: h * 0.65, label: 'NOUN 🌸', color: '#EC4899' },
        { x: w * 0.4, y: h * 0.62, label: 'VERB 🌻', color: '#EAB308' },
        { x: w * 0.65, y: h * 0.64, label: 'ADJ 🌺', color: '#EF4444' },
        { x: w * 0.88, y: h * 0.66, label: 'ADV 🌼', color: '#A78BFA' },
    ];
    flowers.forEach(f => {
        ctx.font = `${h * 0.07}px serif`; ctx.textAlign = 'center';
        ctx.fillText(f.label.split(' ')[1], f.x, f.y);
        ctx.font = `bold ${h * 0.032}px 'Baloo 2',cursive`;
        ctx.fillStyle = f.color; ctx.fillText(f.label.split(' ')[0], f.x, f.y + h * 0.05);
    });
    // Butterflies with punctuation
    [['🦋', w * 0.25, h * 0.4, '!'], ['🦋', w * 0.75, h * 0.35, '?']].forEach(([e, x, y, p]) => {
        ctx.font = `${h * 0.06}px serif`; ctx.fillText(e, x, y);
        ctx.font = `bold ${h * 0.06}px 'Baloo 2',cursive`; ctx.fillStyle = '#1E3A5F'; ctx.fillText(p, x + h * 0.04, y);
    });
}

function drawWorldLandmarks(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#0EA5E9'); sky.addColorStop(1, '#38BDF8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#84CC16'; ctx.fillRect(0, h * 0.65, w, h * 0.35);
    // Globe center
    ctx.strokeStyle = '#0284C7'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.45, h * 0.1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(2,132,199,0.4)'; ctx.lineWidth = 1;
    [Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.9].forEach(a => {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.45, h * 0.1, 0, Math.PI * 2);
        ctx.save(); ctx.translate(w * 0.5, h * 0.45); ctx.scale(0.5, 1); ctx.arc(0, 0, h * 0.1, 0, Math.PI * 2); ctx.restore(); ctx.stroke();
    });
    ctx.font = `${h * 0.06}px serif`; ctx.textAlign = 'center'; ctx.fillText('🌍', w * 0.5, h * 0.48);
    // Eiffel tower (left)
    ctx.fillStyle = '#6B7280';
    [[w * 0.12, h * 0.4, w * 0.01, h * 0.25], [w * 0.14, h * 0.5, w * 0.06, h * 0.15], [w * 0.1, h * 0.5, w * 0.06, h * 0.15]].forEach(([x, y, bw, bh]) => ctx.fillRect(x - bw / 2, y - bh, bw, bh));
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.3); ctx.lineTo(w * 0.14, h * 0.4); ctx.lineTo(w * 0.1, h * 0.4); ctx.fill();
    ctx.font = `bold ${h * 0.03}px 'Baloo 2',cursive`; ctx.fillStyle = '#F3F4F6'; ctx.fillText('🗼 France', w * 0.12, h * 0.72);
    // Pyramid (right)
    ctx.fillStyle = '#D97706';
    ctx.beginPath(); ctx.moveTo(w * 0.88, h * 0.4); ctx.lineTo(w * 0.95, h * 0.65); ctx.lineTo(w * 0.81, h * 0.65); ctx.fill();
    ctx.fillStyle = '#B45309';
    ctx.beginPath(); ctx.moveTo(w * 0.88, h * 0.4); ctx.lineTo(w * 0.95, h * 0.65); ctx.lineTo(w * 0.88, h * 0.65); ctx.fill();
    ctx.font = `bold ${h * 0.03}px 'Baloo 2',cursive`; ctx.fillStyle = '#FCD34D'; ctx.fillText('⛩ Egypt', w * 0.88, h * 0.72);
    // Connecting lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.15, h * 0.5); ctx.lineTo(w * 0.4, h * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.85, h * 0.55); ctx.lineTo(w * 0.6, h * 0.45); ctx.stroke();
    ctx.setLineDash([]);
}

function drawAnimalKingdom(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    sky.addColorStop(0, '#FEF3C7'); sky.addColorStop(1, '#FDE68A');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#D97706'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.fillStyle = '#92400E'; ctx.fillRect(0, h * 0.6, w, h * 0.06);
    // Acacia-style trees
    [w * 0.15, w * 0.8].forEach(tx => {
        ctx.fillStyle = '#92400E'; ctx.fillRect(tx - 5, h * 0.35, 10, h * 0.25);
        ctx.fillStyle = '#4D7C0F';
        ctx.beginPath(); ctx.ellipse(tx, h * 0.32, w * 0.08, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    });
    // Animals with fact bubbles
    const animals = [
        { e: '🐘', x: w * 0.25, y: h * 0.6, fact: "Elephants never\nforget!" },
        { e: '🦒', x: w * 0.55, y: h * 0.55, fact: "Tallest animal\non Earth!" },
        { e: '🦁', x: w * 0.8, y: h * 0.62, fact: "Lions sleep\n20h a day!" },
    ];
    animals.forEach(a => {
        ctx.font = `${h * 0.1}px serif`; ctx.textAlign = 'center'; ctx.fillText(a.e, a.x, a.y);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.roundRect(a.x - w * 0.08, a.y - h * 0.2, w * 0.16, h * 0.12, 8); ctx.fill();
        ctx.font = `bold ${h * 0.025}px 'Nunito',sans-serif`; ctx.fillStyle = '#1C1917';
        ctx.fillText(a.fact.split('\n')[0], a.x, a.y - h * 0.13);
        ctx.fillText(a.fact.split('\n')[1], a.x, a.y - h * 0.105);
    });
    // Sun
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath(); ctx.arc(w * 0.85, h * 0.1, h * 0.06, 0, Math.PI * 2); ctx.fill();
}

function drawSolarSystem(ctx, w, h) {
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, w, h);
    // Stars
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7 + 0.1})`;
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Sun
    const sunGrad = ctx.createRadialGradient(w * 0.08, h * 0.5, 0, w * 0.08, h * 0.5, h * 0.12);
    sunGrad.addColorStop(0, '#FEF08A'); sunGrad.addColorStop(0.5, '#FDE047'); sunGrad.addColorStop(1, '#EAB308');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(w * 0.08, h * 0.5, h * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(254,240,138,0.15)';
    ctx.beginPath(); ctx.arc(w * 0.08, h * 0.5, h * 0.18, 0, Math.PI * 2); ctx.fill();
    // Planets: name, x, y, radius, color
    const planets = [
        { n: 'Mercury', x: w * 0.18, y: h * 0.45, r: 6, c: '#9CA3AF' },
        { n: 'Venus', x: w * 0.27, y: h * 0.38, r: 9, c: '#FDE68A' },
        { n: 'Earth', x: w * 0.38, y: h * 0.55, r: 10, c: '#3B82F6' },
        { n: 'Mars', x: w * 0.48, y: h * 0.42, r: 8, c: '#EF4444' },
        { n: 'Jupiter', x: w * 0.6, y: h * 0.5, r: 18, c: '#D97706' },
        { n: 'Saturn', x: w * 0.72, y: h * 0.44, r: 14, c: '#CA8A04' },
        { n: 'Uranus', x: w * 0.82, y: h * 0.55, r: 11, c: '#22D3EE' },
        { n: 'Neptune', x: w * 0.92, y: h * 0.48, r: 11, c: '#2563EB' },
    ];
    // Orbit paths
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    planets.forEach(p => {
        const d = Math.sqrt(Math.pow(p.x - w * 0.08, 2) + Math.pow(p.y - h * 0.5, 2));
        ctx.beginPath(); ctx.arc(w * 0.08, h * 0.5, d, 0, Math.PI * 2); ctx.stroke();
    });
    // Draw planets
    planets.forEach(p => {
        const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r * 1.2);
        g.addColorStop(0, 'white'); g.addColorStop(0.4, p.c); g.addColorStop(1, 'black');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        // Saturn rings
        if (p.n === 'Saturn') {
            ctx.strokeStyle = 'rgba(202,138,4,0.6)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 2, p.r * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.font = `${h * 0.025}px 'Nunito',sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center'; ctx.fillText(p.n, p.x, p.y + p.r + 12);
    });
}

// ─── Game Setup ───────────────────────────────
function startGame() {
    const scenes = SCENE_LIST[PuzzleGame.category];
    PuzzleGame.sceneName = scenes[PuzzleGame.sceneIdx % scenes.length];
    PuzzleGame.timeLeft = DIFF_TIMES[PuzzleGame.difficulty];
    PuzzleGame.placedCount = 0;
    PuzzleGame.coinsEarned = 0;
    PuzzleGame.score = 0;
    PuzzleGame.hintsLeft = 3;
    PuzzleGame.hintsUsed = 0;
    PuzzleGame.startTime = Date.now();
    PuzzleGame.paused = false;
    PuzzleGame.gameActive = true;

    hideOverlay('startScreen');
    hideOverlay('gameOverScreen');
    document.getElementById('puzzleHud').style.display = 'flex';
    document.getElementById('puzzleLayout').style.display = 'grid';

    buildPieceDots();
    updateHUD();

    // Use requestAnimationFrame so the grid is fully rendered before we measure it
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            buildPuzzle();
            startTimer();
        });
    });
}

function buildPieceDots() {
    const d = document.getElementById('pieceDots');
    d.innerHTML = '';
    for (let i = 0; i < TOTAL_PIECES; i++) {
        const dot = document.createElement('div');
        dot.className = 'piece-dot';
        dot.id = `dot-${i}`;
        d.appendChild(dot);
    }
}

function buildPuzzle() {
    const board = document.getElementById('ghostGrid');
    const boardParent = document.getElementById('puzzleBoard');
    const parentRect = boardParent.getBoundingClientRect();

    // Prefer the rendered size, but fall back to a sensible default
    const availW = Math.max(parentRect.width - 48, 320);
    const availH = Math.max(parentRect.height - 48, 240);
    const pieceW = Math.floor(availW / COLS);
    const pieceH = Math.floor(availH / ROWS);
    PuzzleGame.pieceW = pieceW;
    PuzzleGame.pieceH = pieceH;

    // Draw scene onto offscreen canvas
    const sc = document.createElement('canvas');
    sc.width = pieceW * COLS;
    sc.height = pieceH * ROWS;
    PuzzleGame.sceneCanvas = sc;
    const sctx = sc.getContext('2d');
    drawPuzzleScene(sctx, PuzzleGame.sceneName, sc.width, sc.height);

    // Slice into 12 pieces
    PuzzleGame.pieces = [];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const pc = document.createElement('canvas');
            pc.width = pieceW; pc.height = pieceH;
            const pctx = pc.getContext('2d');
            pctx.drawImage(sc, col * pieceW, row * pieceH, pieceW, pieceH, 0, 0, pieceW, pieceH);

            PuzzleGame.pieces.push({
                id: row * COLS + col,
                correctCol: col,
                correctRow: row,
                canvas: pc,
                isPlaced: false
            });
        }
    }

    // Shuffle pieces
    for (let i = PuzzleGame.pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [PuzzleGame.pieces[i], PuzzleGame.pieces[j]] = [PuzzleGame.pieces[j], PuzzleGame.pieces[i]];
    }

    buildGhostGrid(board, pieceW, pieceH);
    buildTray();
}

function buildGhostGrid(gridEl, pieceW, pieceH) {
    gridEl.innerHTML = '';
    gridEl.style.width = (pieceW * COLS) + 'px';
    gridEl.style.height = (pieceH * ROWS) + 'px';
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, ${pieceW}px)`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS}, ${pieceH}px)`;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'ghost-cell';
            cell.dataset.col = col;
            cell.dataset.row = row;
            cell.style.width = pieceW + 'px';
            cell.style.height = pieceH + 'px';
            cell.style.position = 'relative';
            cell.style.overflow = 'hidden';

            // Faint hint (15% opacity)
            const sc = PuzzleGame.sceneCanvas;
            const hintCanvas = document.createElement('canvas');
            hintCanvas.width = pieceW; hintCanvas.height = pieceH;
            const hctx = hintCanvas.getContext('2d');
            hctx.globalAlpha = 0.12;
            hctx.drawImage(sc, col * pieceW, row * pieceH, pieceW, pieceH, 0, 0, pieceW, pieceH);
            hintCanvas.style.position = 'absolute'; hintCanvas.style.inset = '0';
            cell.appendChild(hintCanvas);

            gridEl.appendChild(cell);
        }
    }
}

function buildTray() {
    const tray = document.getElementById('pieceTray');
    tray.innerHTML = '';
    PuzzleGame.pieces.forEach(piece => {
        if (!piece.isPlaced) {
            const wrapper = document.createElement('div');
            wrapper.className = 'tray-piece';
            wrapper.dataset.pieceId = piece.id;
            wrapper.style.width = '100%';
            wrapper.style.aspectRatio = `${PuzzleGame.pieceW}/${PuzzleGame.pieceH}`;

            const c = piece.canvas.cloneNode();
            c.getContext('2d').drawImage(piece.canvas, 0, 0);
            c.style.width = '100%'; c.style.height = '100%'; c.style.display = 'block';
            wrapper.appendChild(c);

            // Drag start
            wrapper.addEventListener('mousedown', e => startDrag(e, piece, wrapper));
            wrapper.addEventListener('touchstart', e => startTouchDrag(e, piece, wrapper), { passive: false });
            tray.appendChild(wrapper);
        }
    });
}

// ─── Drag & Drop ─────────────────────────────
function startDrag(e, piece, el) {
    if (!PuzzleGame.gameActive || PuzzleGame.paused) return;
    e.preventDefault();
    PuzzleGame.dragPiece = piece;
    const flying = document.getElementById('flyingPiece');
    flying.width = PuzzleGame.pieceW;
    flying.height = PuzzleGame.pieceH;
    flying.style.width = PuzzleGame.pieceW + 'px';
    flying.style.height = PuzzleGame.pieceH + 'px';
    flying.style.display = 'block';
    flying.getContext('2d').drawImage(piece.canvas, 0, 0);

    const rect = el.getBoundingClientRect();
    PuzzleGame.dragOffX = e.clientX - rect.left;
    PuzzleGame.dragOffY = e.clientY - rect.top;
    moveFlyingPiece(e.clientX, e.clientY);
    el.style.opacity = '0.3';
    PuzzleGame.dragEl = el;
}

function startTouchDrag(e, piece, el) {
    if (!PuzzleGame.gameActive || PuzzleGame.paused) return;
    e.preventDefault();
    const t = e.touches[0];
    startDrag({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => { } }, piece, el);
}

function onMouseMove(e) {
    if (!PuzzleGame.dragPiece) return;
    moveFlyingPiece(e.clientX, e.clientY);
    highlightHoveredCell(e.clientX, e.clientY);
}

function onTouchMove(e) {
    if (!PuzzleGame.dragPiece) return;
    e.preventDefault();
    const t = e.touches[0];
    moveFlyingPiece(t.clientX, t.clientY);
    highlightHoveredCell(t.clientX, t.clientY);
}

function moveFlyingPiece(cx, cy) {
    const el = document.getElementById('flyingPiece');
    const scale = PuzzleGame.pieceW > 200 ? 0.5 : 1.0;
    el.style.left = (cx - PuzzleGame.pieceW * scale / 2) + 'px';
    el.style.top = (cy - PuzzleGame.pieceH * scale / 2) + 'px';
    el.style.transform = `scale(${scale + 0.08})`;
    el.style.opacity = '0.92';
}

function highlightHoveredCell(cx, cy) {
    document.querySelectorAll('.ghost-cell').forEach(c => { c.classList.remove('hover-correct', 'hover-wrong'); });
    const cell = getCellAt(cx, cy);
    if (cell && PuzzleGame.dragPiece) {
        const isCorrect = (parseInt(cell.dataset.col) === PuzzleGame.dragPiece.correctCol &&
            parseInt(cell.dataset.row) === PuzzleGame.dragPiece.correctRow);
        cell.classList.add(isCorrect ? 'hover-correct' : 'hover-wrong');
    }
}

function getCellAt(cx, cy) {
    const cells = document.querySelectorAll('.ghost-cell:not(.placed)');
    for (const cell of cells) {
        const r = cell.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return cell;
    }
    return null;
}

function onMouseUp(e) {
    if (!PuzzleGame.dragPiece) return;
    dropPiece(e.clientX, e.clientY);
}

function onTouchEnd(e) {
    if (!PuzzleGame.dragPiece) return;
    const t = e.changedTouches[0];
    dropPiece(t.clientX, t.clientY);
}

function dropPiece(cx, cy) {
    const piece = PuzzleGame.dragPiece;
    const el = PuzzleGame.dragEl;
    document.querySelectorAll('.ghost-cell').forEach(c => c.classList.remove('hover-correct', 'hover-wrong'));

    const cell = getCellAt(cx, cy);
    if (cell && !cell.classList.contains('placed')) {
        const col = parseInt(cell.dataset.col);
        const row = parseInt(cell.dataset.row);
        if (col === piece.correctCol && row === piece.correctRow) {
            snapPiece(piece, cell, el);
        } else {
            returnToTray(el);
        }
    } else {
        returnToTray(el);
    }

    document.getElementById('flyingPiece').style.display = 'none';
    PuzzleGame.dragPiece = null;
    PuzzleGame.dragEl = null;
}

function snapPiece(piece, cell, trayEl) {
    piece.isPlaced = true;
    trayEl.remove();

    // Place piece canvas in cell
    const pc = piece.canvas.cloneNode();
    pc.getContext('2d').drawImage(piece.canvas, 0, 0);
    pc.style.width = '100%'; pc.style.height = '100%';
    pc.style.display = 'block'; pc.style.position = 'absolute'; pc.style.inset = '0';
    pc.classList.add('puzzle-piece-placed');
    cell.innerHTML = ''; cell.appendChild(pc);
    cell.classList.add('placed');

    // Green flash on cell
    cell.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.8)';
    setTimeout(() => { cell.style.boxShadow = ''; }, 600);

    // Particles
    const cr = cell.getBoundingClientRect();
    spawnParticles(cr.left + cr.width / 2, cr.top + cr.height / 2, '#10B981', 8);

    PuzzleGame.placedCount++;
    PuzzleGame.coinsEarned += 5;
    PuzzleGame.score += 10;
    updateHUD();
    document.getElementById(`dot-${piece.id}`).classList.add('done');

    if (PuzzleGame.placedCount === TOTAL_PIECES) {
        setTimeout(onPuzzleComplete, 300);
    }
}

function returnToTray(el) {
    if (el) el.style.opacity = '1';
}

// ─── Timer ───────────────────────────────────
function startTimer() {
    clearInterval(PuzzleGame.timerInterval);
    PuzzleGame.timerInterval = setInterval(() => {
        if (PuzzleGame.paused || !PuzzleGame.gameActive) return;
        PuzzleGame.timeLeft--;
        updateTimerBar();
        if (PuzzleGame.timeLeft <= 0) {
            clearInterval(PuzzleGame.timerInterval);
            onGameOver(false);
        }
    }, 1000);
}

function updateTimerBar() {
    const total = DIFF_TIMES[PuzzleGame.difficulty];
    const pct = PuzzleGame.timeLeft / total * 100;
    const bar = document.getElementById('timerBarFill');
    bar.style.width = pct + '%';
    bar.className = 'puzzle-timer-bar-fill' +
        (pct < 25 ? ' danger' : pct < 50 ? ' warning' : '');

    // Show countdown text for last 30s
    const ct = document.getElementById('countdownText');
    if (PuzzleGame.timeLeft <= 30) {
        ct.textContent = PuzzleGame.timeLeft;
        ct.classList.add('visible');
    } else {
        ct.classList.remove('visible');
    }
}

// ─── Hints ────────────────────────────────────
function useHint() {
    if (PuzzleGame.hintsLeft <= 0) return;
    PuzzleGame.hintsLeft--;
    PuzzleGame.hintsUsed++;
    document.getElementById('hintBtn').textContent = `💡 Hint (${PuzzleGame.hintsLeft})`;
    if (PuzzleGame.hintsLeft === 0) document.getElementById('hintBtn').disabled = true;

    // Find a random unplaced piece and highlight its correct cell
    const unplaced = PuzzleGame.pieces.filter(p => !p.isPlaced);
    if (unplaced.length === 0) return;
    const target = unplaced[Math.floor(Math.random() * unplaced.length)];
    const cells = document.querySelectorAll('.ghost-cell');
    cells.forEach(c => {
        if (parseInt(c.dataset.col) === target.correctCol && parseInt(c.dataset.row) === target.correctRow) {
            c.classList.add('hint-glow');
            setTimeout(() => c.classList.remove('hint-glow'), 2000);
        }
    });
}

// ─── Completion ───────────────────────────────
function onPuzzleComplete() {
    clearInterval(PuzzleGame.timerInterval);
    PuzzleGame.gameActive = false;
    PuzzleGame.timeTaken = Math.round((Date.now() - PuzzleGame.startTime) / 1000);

    // Time bonus
    const timeBonus = Math.floor(PuzzleGame.timeLeft / 10);
    PuzzleGame.coinsEarned += 20 + timeBonus;
    PuzzleGame.coinsEarned = Math.max(0, PuzzleGame.coinsEarned - PuzzleGame.hintsUsed * 5);
    PuzzleGame.score += 50;

    launchConfetti();
    setTimeout(() => showGameOver(true), 1200);
}

function onGameOver(completed) {
    clearInterval(PuzzleGame.timerInterval);
    PuzzleGame.gameActive = false;
    PuzzleGame.timeTaken = Math.round((Date.now() - PuzzleGame.startTime) / 1000);
    showGameOver(completed);
}

async function showGameOver(completed) {
    const mins = Math.floor(PuzzleGame.timeTaken / 60);
    const secs = PuzzleGame.timeTaken % 60;
    document.getElementById('goEmoji').textContent = completed ? '🎉' : '⏰';
    document.getElementById('goTitle').textContent = completed ? 'Puzzle Master! 🧩' : 'So Close! ⏰';
    document.getElementById('goTitle').className = 'overlay-title ' + (completed ? 'title-puzzle' : '');
    document.getElementById('goPieces').textContent = `${PuzzleGame.placedCount}/12`;
    document.getElementById('goTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('goHints').textContent = PuzzleGame.hintsUsed;

    // Animate coins
    let c = 0; const target = PuzzleGame.coinsEarned;
    const el = document.getElementById('goCoins');
    const iv = setInterval(() => {
        c = Math.min(c + Math.ceil(target / 30), target);
        el.textContent = c;
        if (c >= target) clearInterval(iv);
    }, 30);

    // Fun fact
    if (completed && FUN_FACTS[PuzzleGame.sceneName]) {
        document.getElementById('funFactCard').style.display = 'block';
        document.getElementById('funFactText').textContent = FUN_FACTS[PuzzleGame.sceneName];
    }

    showOverlay('gameOverScreen');
    document.getElementById('puzzleHud').style.display = 'none';

    // Save to DB
    await saveGameSession(currentUser.userId, 'puzzle-quest', {
        score: PuzzleGame.score,
        coinsEarned: PuzzleGame.coinsEarned,
        levelReached: PuzzleGame.placedCount
    });
}

// ─── Pause ───────────────────────────────────
function togglePause() {
    if (!PuzzleGame.gameActive) return;
    PuzzleGame.paused = !PuzzleGame.paused;
    if (PuzzleGame.paused) showOverlay('pauseScreen');
    else hideOverlay('pauseScreen');
}

// ─── HUD Update ──────────────────────────────
function updateHUD() {
    document.getElementById('piecesPlaced').textContent = PuzzleGame.placedCount;
    document.getElementById('coinsHud').textContent = PuzzleGame.coinsEarned;
}

// ─── DB Save ─────────────────────────────────
async function saveGameSession(userId, gameType, data) {
    try {
        if (!supabaseClient) return;
        const { data: user } = await supabaseClient.from('users').select('game_coins').eq('id', userId).single();
        const newCoins = (user?.game_coins || 0) + data.coinsEarned;
        await supabaseClient.from('users').update({ game_coins: newCoins }).eq('id', userId);
        await supabaseClient.from('game_sessions').insert([{
            user_id: userId, game_type: gameType,
            score: data.score, coins_earned: data.coinsEarned, level_reached: data.levelReached
        }]);
        // Update nav coin display
        const coinEl = document.getElementById('navCoins');
        if (coinEl) coinEl.textContent = newCoins;
    } catch (e) {
        console.warn('Save failed:', e);
        // LocalStorage backup
        const prev = parseInt(localStorage.getItem('eduplay_coins_backup') || '0');
        localStorage.setItem('eduplay_coins_backup', prev + data.coinsEarned);
    }
}

// ─── Particles & Confetti ────────────────────
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.style.cssText = `position:fixed;width:6px;height:6px;border-radius:50%;
      background:${color};left:${x}px;top:${y}px;pointer-events:none;z-index:100;`;
        document.body.appendChild(p);
        const angle = (i / count) * Math.PI * 2;
        const dist = 30 + Math.random() * 30;
        p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px) scale(0)`, opacity: 0 }
        ], { duration: 600, easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
    }
}

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
function showOverlay(id) {
    const el = document.getElementById(id);
    el.classList.add('active');
}

function hideOverlay(id) {
    const el = document.getElementById(id);
    el.classList.remove('active');
}
