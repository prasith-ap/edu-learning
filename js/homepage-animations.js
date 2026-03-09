/* =========================================================
   EduPlay Homepage Animations — COMPLETE REWRITE v2 (JS)
   File: js/homepage-animations.js
   Pure vanilla JS. Zero external libraries.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const PRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Set body background immediately
  document.body.style.background =
    'linear-gradient(180deg,#1a1a6e 0%,#3d1a78 30%,#7b2fa0 60%,#c561a0 85%,#ffa07a 100%)';

  // Remove any leftover elements from previous sessions
  ['#ep-bg', '#ep-star-game', '#ep-score', '#ep-mood', '#ep-chase-lane', '#ep-car',
    '#ep-mute-top-btn', '#ep-mascot-btn', '#ep-doors'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.remove();
    });

  // ── Boot sequence ────────────────────────────────────────
  initCanvasBg(PRM);
  initMoodSelector();
  initStarGame(PRM);
  if (!PRM) initTomAndJerry();
  if (!PRM) initSupercar();
  initVoiceSystem(PRM);
  if (!PRM) initDoors();
  if (!PRM) setTimeout(initConfetti, 800);
  initStats();
});

// ==========================================================
// PART 1 — Immersive Background Canvas
// ==========================================================
function initCanvasBg(PRM) {
  const canvas = document.createElement('canvas');
  canvas.id = 'ep-bg';
  document.body.insertBefore(canvas, document.body.firstChild);

  if (PRM) return; // static gradient only

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;

  // Pre-declare arrays before resize uses them
  const stars = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2, i
  }));
  const fireflies = Array.from({ length: 15 }, () => ({
    x: Math.random(), y: 0.7 + Math.random() * 0.3,
    r: 2, phase: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2
  }));
  const clouds = Array.from({ length: 3 }, () => ({
    x: Math.random(), y: 0.6 + Math.random() * 0.2, w: 120 + Math.random() * 80
  }));
  const shootingStars = Array.from({ length: 8 }, () => ({
    active: false, timer: 300 + Math.random() * 500,
    x: 0, y: 0, len: 60 + Math.random() * 50, opacity: 0,
    color: ['#FFD700', '#FF6B9D', '#6C63FF'][Math.floor(Math.random() * 3)]
  }));

  const resize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const now = Date.now();

    // Moon
    const moonR = 45 + Math.sin(now / 1100) * 3;
    ctx.save();
    ctx.shadowBlur = 40; ctx.shadowColor = '#FFE566';
    ctx.fillStyle = '#FFF5CC';
    ctx.beginPath();
    ctx.arc(W - 150, 120, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stars (twinkle)
    stars.forEach(s => {
      ctx.globalAlpha = 0.2 + (Math.sin(now / 400 + s.i) + 1) / 2 * 0.8;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Shooting stars
    shootingStars.forEach(s => {
      if (!s.active) {
        if ((s.timer -= 1) <= 0) {
          s.active = true;
          s.x = Math.random() * W * 0.6;
          s.y = Math.random() * H * 0.4;
          s.opacity = 1;
        }
      } else {
        s.x += 8; s.y += 4; s.opacity -= 0.017;
        if (s.opacity <= 0) {
          s.active = false; s.timer = 400 + Math.random() * 600;
        } else {
          ctx.save();
          ctx.globalAlpha = s.opacity;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.len, s.y - s.len / 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // Fireflies
    fireflies.forEach(f => {
      f.x += (f.vx + (Math.random() - 0.5) * 0.15) / W;
      f.y += (f.vy + (Math.random() - 0.5) * 0.10) / H;
      if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0;
      if (f.y < 0.5) f.y = 0.5; if (f.y > 1) f.y = 0.98;
      ctx.fillStyle = '#CCFF66';
      ctx.globalAlpha = 0.25 + (Math.sin(now / 400 + f.phase) + 1) / 2 * 0.75;
      ctx.beginPath();
      ctx.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Horizon clouds
    ctx.fillStyle = 'rgba(255,160,120,0.3)';
    clouds.forEach(c => {
      c.x -= 0.2 / W;
      if (c.x * W < -300) c.x = (W + 100) / W;
      const cx = c.x * W, cy = c.y * H, r = c.w / 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 1.2, cy - r * 0.5, r * 1.2, 0, Math.PI * 2);
      ctx.arc(cx + r * 2.4, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// ==========================================================
// PART 3 — Mood Selector
// ==========================================================
function initMoodSelector() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  hero.style.position = 'relative';

  const wrap = document.createElement('div');
  wrap.id = 'ep-mood';

  const moods = [
    { icon: '😊', grad: 'linear-gradient(180deg,#FF6B35,#F7C59F)' },
    { icon: '😴', grad: 'linear-gradient(180deg,#2C3E7A,#5B8FD4)' },
    { icon: '🚀', grad: 'linear-gradient(180deg,#1a1a6e,#00C853)' }
  ];
  moods.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'ep-mood-btn';
    btn.textContent = m.icon;
    btn.onclick = () => {
      document.body.style.background = m.grad;
      wrap.querySelectorAll('.ep-mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    wrap.appendChild(btn);
  });
  hero.appendChild(wrap);
}

// ==========================================================
// PART 2 — Star Collector Mini-Game
// ==========================================================
let _gameScore = 0;

function initStarGame(PRM) {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Ensure hero is relatively positioned with enough height
  hero.style.position = 'relative';
  if (hero.clientHeight < 400) hero.style.minHeight = '520px';

  // HUD — always present
  const hud = document.createElement('div');
  hud.id = 'ep-score';
  hud.textContent = '⭐ 0 stars';
  document.body.appendChild(hud);

  if (PRM) return;

  const layer = document.createElement('div');
  layer.id = 'ep-star-game';
  hero.appendChild(layer);

  function spawnStar() {
    const star = document.createElement('div');
    star.className = 'ep-star';
    // Constrain to right half so hero text on left is never overlapped
    star.style.left = (52 + Math.random() * 42) + '%';
    star.style.top = (12 + Math.random() * 70) + '%';
    const dur = (2 + Math.random() * 2).toFixed(2);
    const del = (Math.random() * 1.5).toFixed(2);
    star.style.animationDuration = dur + 's';
    star.style.animationDelay = del + 's';

    star.onclick = () => {
      star.style.animation = 'starPop 0.4s ease-out forwards';
      star.style.pointerEvents = 'none';
      _gameScore++;
      hud.textContent = `⭐ ${_gameScore} star${_gameScore !== 1 ? 's' : ''}`;
      _playDing();
      _spawnParticles(star, layer, hero);
      if (_gameScore % 5 === 0) _triggerCelebration();
      setTimeout(() => { if (star.parentNode) star.remove(); spawnStar(); }, 1500);
    };
    layer.appendChild(star);
  }

  for (let i = 0; i < 8; i++) setTimeout(spawnStar, i * 280);
}

function _spawnParticles(star, layer, hero) {
  const sr = star.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const cx = sr.left - hr.left + 16;
  const cy = sr.top - hr.top + 16;
  const cols = ['#FFD700', '#FF6B9D', '#6C63FF', '#00D4AA', '#FF8C42', '#00B894'];
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'ep-star-particle';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.background = cols[i % cols.length];
    const angle = (Math.PI * 2 / 6) * i;
    p.style.setProperty('--dx', Math.cos(angle) * 40 + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * 40 + 'px');
    layer.appendChild(p);
    setTimeout(() => p.remove(), 500);
  }
}

function _playDing() {
  if (localStorage.getItem('ep_muted') === 'true') return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    osc.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ac.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15);
    osc.start(); osc.stop(ac.currentTime + 0.16);
  } catch (_) { }
}

function _triggerCelebration() {
  const hud = document.getElementById('ep-score');
  if (hud) { hud.classList.add('score-rainbow'); setTimeout(() => hud.classList.remove('score-rainbow'), 2000); }

  const txt = document.createElement('div');
  txt.className = 'amazing-text';
  txt.textContent = 'AMAZING! 🎉';
  document.body.appendChild(txt);
  setTimeout(() => txt.remove(), 2000);

  if (localStorage.getItem('ep_muted') !== 'true') {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [[523.25, 0], [659.25, 0.1], [783.99, 0.2]].forEach(([f, t]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0, ac.currentTime + t);
        g.gain.linearRampToValueAtTime(0.2, ac.currentTime + t + 0.05);
        g.gain.linearRampToValueAtTime(0, ac.currentTime + t + 0.5);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.55);
      });
    } catch (_) { }
  }
  for (let i = 0; i < 20; i++) _spawnConfettiPiece(true);
}

// ==========================================================
// PART 4 — Tom & Jerry Chase (Improved SVGs)
// ==========================================================
function initTomAndJerry() {
  const lane = document.createElement('div');
  lane.id = 'ep-chase-lane';

  // ── HIGH-DETAIL MOUSE (Jerry) SVG ──────────────────────── 
  const mouseSVG = `
<svg width="68" height="80" viewBox="0 0 68 80" xmlns="http://www.w3.org/2000/svg">
  <!-- Tail (curvy) -->
  <path d="M8 62 C-18 68 -14 30 4 18" fill="none" stroke="#AAAAAA" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Back leg B -->
  <rect class="mouse-leg mouse-leg-b" x="16" y="55" width="7" height="18" fill="#9E9E9E" rx="3.5"/>

  <!-- Body -->
  <ellipse cx="34" cy="47" rx="20" ry="17" fill="#B8B8B8"/>
  <!-- Belly -->
  <ellipse cx="34" cy="51" rx="14" ry="10" fill="#DEDEDE"/>

  <!-- Red backpack -->
  <rect x="10" y="35" width="14" height="18" fill="#EE2222" rx="3"/>
  <rect x="11" y="36" width="5" height="3" fill="#CC0000" rx="1"/>
  <line x1="24" y1="40" x2="30" y2="47" stroke="#EE2222" stroke-width="2.5"/>

  <!-- Front leg F -->
  <rect class="mouse-leg mouse-leg-f" x="34" y="56" width="7" height="18" fill="#9E9E9E" rx="3.5"/>

  <!-- Gold star in left hand (wiggles) -->
  <g class="mouse-star" style="transform-origin:12px 42px">
    <polygon points="12,32 14,38 21,38 16,42 18,48 12,44 6,48 8,42 3,38 10,38" fill="#FFD700" transform="scale(0.7)"/>
  </g>

  <!-- Head -->
  <circle cx="48" cy="28" r="20" fill="#B8B8B8"/>

  <!-- Left ear -->
  <circle cx="36" cy="14" r="10" fill="#B8B8B8"/>
  <circle cx="36" cy="14" r="6"  fill="#FFAAAA"/>
  <!-- Right ear -->
  <circle cx="58" cy="12" r="10" fill="#B8B8B8"/>
  <circle cx="58" cy="12" r="6"  fill="#FFAAAA"/>

  <!-- Eyes (big, expressive) -->
  <circle cx="44" cy="25" r="6"   fill="white"/>
  <circle cx="45" cy="25" r="3.5" fill="#2A2A2A"/>
  <circle cx="46" cy="23" r="1.2" fill="white"/>
  <circle cx="53" cy="26" r="6"   fill="white"/>
  <circle cx="54" cy="26" r="3.5" fill="#2A2A2A"/>
  <circle cx="55" cy="24" r="1.2" fill="white"/>

  <!-- Nose (pink ellipse) -->
  <ellipse cx="62" cy="31" rx="2.5" ry="1.5" fill="#FF9999"/>

  <!-- Cheeky smile -->
  <path d="M51 36 Q55 41 60 36" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Whiskers -->
  <line x1="63" y1="30" x2="80" y2="27" stroke="#888" stroke-width="1" stroke-linecap="round"/>
  <line x1="63" y1="33" x2="80" y2="33" stroke="#888" stroke-width="1" stroke-linecap="round"/>
</svg>`;

  // ── HIGH-DETAIL TOM (Cat) SVG ─────────────────────────── 
  const catSVG = `
<svg width="100" height="110" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
  <!-- Tail (cubic bezier) -->
  <g class="cat-tail" style="transform-origin:20px 72px">
    <path d="M20 72 C-12 100 -22 55 6 28" fill="none" stroke="#FF8C42" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- Back left leg -->
  <rect class="cat-leg cat-leg-b" x="32" y="84" width="10" height="24" fill="#E07830" rx="5"/>

  <!-- Body -->
  <ellipse cx="53" cy="65" rx="30" ry="26" fill="#FF8C42"/>
  <!-- Belly -->
  <ellipse cx="53" cy="70" rx="21" ry="17" fill="#FFD4A8"/>

  <!-- Front legs -->
  <rect class="cat-leg cat-leg-f" x="40" y="66" width="9" height="24" fill="#FF8C42" rx="4.5"/>
  <rect class="cat-leg cat-leg-b" x="60" y="66" width="9" height="24" fill="#FF8C42" rx="4.5"/>

  <!-- Back right leg -->
  <rect class="cat-leg cat-leg-f" x="62" y="84" width="10" height="24" fill="#E07830" rx="5"/>

  <!-- Head -->
  <circle cx="68" cy="38" r="28" fill="#FF8C42"/>

  <!-- Pointed ears with inner pink -->
  <polygon points="48,28 53,10 66,22"  fill="#FF8C42"/>
  <polygon points="51,26 53,13 63,22"  fill="#FFB3BA"/>
  <polygon points="74,18 85,5  90,24"  fill="#FF8C42"/>
  <polygon points="76,19 84,8  87,22"  fill="#FFB3BA"/>

  <!-- Eyes (wide and angry) -->
  <circle cx="76" cy="32" r="7"   fill="white"/>
  <circle cx="77" cy="32" r="4.5" fill="#1A1A1A"/>
  <circle cx="78" cy="30" r="1.5" fill="white"/>

  <circle cx="60" cy="34" r="7"   fill="white"/>
  <circle cx="61" cy="34" r="4.5" fill="#1A1A1A"/>
  <circle cx="62" cy="32" r="1.5" fill="white"/>

  <!-- VERY angry eyebrows (sharp inward V) -->
  <line x1="54" y1="24" x2="66" y2="29" stroke="#8B0000" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="84" y1="22" x2="72" y2="28" stroke="#8B0000" stroke-width="3.5" stroke-linecap="round"/>

  <!-- Nose (pink triangle) -->
  <polygon points="68,40 73,40 70.5,44" fill="#FF9999"/>

  <!-- Snarl/open mouth with teeth -->
  <path d="M62 48 Q68 58 76 48" fill="#1A1A1A"/>
  <rect x="64" y="48" width="5" height="5" fill="white" rx="1"/>
  <rect x="70" y="48" width="5" height="5" fill="white" rx="1"/>

  <!-- Whiskers right -->
  <line x1="73" y1="41" x2="95" y2="37" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="74" y1="44" x2="97" y2="44" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="73" y1="47" x2="95" y2="51" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Whiskers left -->
  <line x1="64" y1="41" x2="42" y2="37" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="63" y1="44" x2="40" y2="44" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="64" y1="47" x2="42" y2="51" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

  lane.innerHTML = `
    <div class="ep-chase-char" id="ep-mouse">
      <div class="chase-bubble">😄 CATCH ME!</div>
      ${mouseSVG}
    </div>
    <div class="ep-chase-char" id="ep-cat">
      <div class="chase-bubble">😾 GOTCHA!</div>
      ${catSVG}
    </div>
  `;
  document.body.appendChild(lane);

  const mouse = document.getElementById('ep-mouse');
  const cat = document.getElementById('ep-cat');
  const mouseBubble = mouse.querySelector('.chase-bubble');
  const catBubble = cat.querySelector('.chase-bubble');

  let mouseX = -90, catX = -290, catSpeed = 2.7, frame = 0;

  setInterval(() => {
    catBubble.classList.add('show-bubble');
    setTimeout(() => catBubble.classList.remove('show-bubble'), 1200);
  }, 5000);
  setInterval(() => {
    mouseBubble.classList.add('show-bubble');
    setTimeout(() => mouseBubble.classList.remove('show-bubble'), 1200);
  }, 6000);

  function chase() {
    frame++;
    if (frame % 1200 === 0) {
      catSpeed = 4.0;
      document.body.classList.add('shaking');
      setTimeout(() => { catSpeed = 2.7; document.body.classList.remove('shaking'); }, 2000);
    }
    mouseX += 3.1;
    catX += catSpeed;
    if (mouseX > window.innerWidth + 120) { mouseX = -90; catX = -290; }
    mouse.style.transform = `translateX(${mouseX}px)`;
    cat.style.transform = `translateX(${catX}px)`;
    requestAnimationFrame(chase);
  }
  requestAnimationFrame(chase);
}

// ==========================================================
// PART 5 — Supercar (320×130px, full detail)
// ==========================================================
function initSupercar() {
  const car = document.createElement('div');
  car.id = 'ep-car';

  car.innerHTML = `
    <div class="ep-hl-cone"></div>
    <svg width="320" height="130" viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#FF2D55"/>
          <stop offset="100%" stop-color="#990018"/>
        </linearGradient>
        <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#FFE566"/>
          <stop offset="100%" stop-color="#CC8800"/>
        </radialGradient>
        <linearGradient id="windowGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="rgba(180,230,255,0.9)"/>
          <stop offset="100%" stop-color="rgba(100,180,255,0.6)"/>
        </linearGradient>
      </defs>

      <!-- Neon underglow -->
      <ellipse class="ep-neon" cx="160" cy="124" rx="140" ry="9" fill="none" stroke="rgba(108,99,255,0.7)" stroke-width="4"/>
      <!-- Ground shadow -->
      <ellipse cx="160" cy="128" rx="148" ry="8" fill="rgba(0,0,0,0.2)"/>

      <!-- Exhaust flames -->
      <ellipse class="ep-flame" cx="38" cy="100" rx="16" ry="5" fill="#FF6600"/>
      <ellipse class="ep-flame" cx="33" cy="100" rx="12" ry="4" fill="#FF9900" style="animation-delay:.1s"/>
      <ellipse class="ep-flame" cx="28" cy="100" rx="8"  ry="3" fill="#FFDD00" style="animation-delay:.2s"/>

      <!-- Speed lines -->
      <g class="ep-speedline" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round">
        <line x1="-30" y1="50"  x2="-118" y2="50"  style="animation-delay:.10s"/>
        <line x1="-20" y1="65"  x2="-90"  y2="65"  style="animation-delay:.20s"/>
        <line x1="-40" y1="80"  x2="-85"  y2="80"  style="animation-delay:.30s"/>
        <line x1="-10" y1="95"  x2="-82"  y2="95"  style="animation-delay:.15s"/>
        <line x1="-30" y1="108" x2="-115" y2="108" style="animation-delay:.25s"/>
      </g>

      <!-- Spoiler -->
      <path d="M40 62 L50 28 L66 28 L60 56 Z" fill="#880015"/>

      <!-- Main car body -->
      <path d="M40 105 L262 105 C282 105 312 90 312 70
               C312 55 282 40 242 35
               C212 30 172 20 142 20
               C122 20 102 35 72 50
               C52 60 40 85 40 105 Z" fill="url(#carBody)"/>
      <!-- Body shine -->
      <path d="M142 22 C172 22 212 32 242 37
               C212 35 172 25 142 25
               C122 25 102 40 72 55 L62 62
               C82 45 122 22 142 22 Z" fill="rgba(255,255,255,0.3)"/>

      <!-- Door accent stripe + EDU sticker -->
      <path d="M142 60 L102 105 L122 105 L162 60 Z" fill="#6C63FF"/>
      <line x1="142" y1="60" x2="102" y2="105" stroke="#FFD700" stroke-width="1.2"/>
      <rect x="136" y="70" width="25" height="9" fill="white" rx="2" transform="rotate(-40 136 70)"/>
      <text x="137" y="77" font-size="5.5" fill="#6C63FF" font-weight="bold" font-family="sans-serif" transform="rotate(-40 137 77)">EDU</text>

      <!-- Windows -->
      <polygon points="146,22 188,32 214,48 154,48" fill="url(#windowGlass)" stroke="#5599BB" stroke-width="0.5"/>
      <polygon points="102,48 142,48 137,24 97,42"  fill="url(#windowGlass)" stroke="#5599BB" stroke-width="0.5"/>

      <!-- Rearview mirror -->
      <rect x="156" y="43" width="7" height="4" fill="#888" rx="1"/>

      <!-- Driver silhouette -->
      <ellipse cx="172" cy="38" rx="8" ry="12" fill="rgba(0,0,0,0.25)"/>

      <!-- Antenna + ball -->
      <line x1="110" y1="20" x2="105" y2="4" stroke="#888" stroke-width="1.5"/>
      <circle class="ep-antenna-ball" cx="105" cy="4" r="2.5" fill="#FF6B9D"/>

      <!-- Headlight -->
      <ellipse class="ep-hl" cx="300" cy="73" rx="5" ry="11" fill="#FFFFCC"/>
      <!-- Rear light -->
      <ellipse class="ep-rl" cx="40"  cy="65" rx="3" ry="8"  fill="#FF3300"/>

      <!-- Front wheel -->
      <g class="ep-wh" style="transform-origin:245px 108px">
        <circle cx="245" cy="108" r="28" fill="#1A1A1A"/>
        <circle cx="245" cy="108" r="18" fill="url(#rimGlow)"/>
        <line x1="227" y1="108" x2="263" y2="108" stroke="#FFD700" stroke-width="2.5"/>
        <line x1="236" y1="92"  x2="254" y2="124" stroke="#FFD700" stroke-width="2.5"/>
        <line x1="236" y1="124" x2="254" y2="92"  stroke="#FFD700" stroke-width="2.5"/>
        <circle cx="245" cy="108" r="6" fill="#CC8800"/>
      </g>

      <!-- Rear wheel -->
      <g class="ep-wh" style="transform-origin:75px 108px">
        <circle cx="75" cy="108" r="28" fill="#1A1A1A"/>
        <circle cx="75" cy="108" r="18" fill="url(#rimGlow)"/>
        <line x1="57"  y1="108" x2="93" y2="108" stroke="#FFD700" stroke-width="2.5"/>
        <line x1="66"  y1="92"  x2="84" y2="124" stroke="#FFD700" stroke-width="2.5"/>
        <line x1="66"  y1="124" x2="84" y2="92"  stroke="#FFD700" stroke-width="2.5"/>
        <circle cx="75" cy="108" r="6" fill="#CC8800"/>
      </g>
    </svg>
  `;

  document.body.appendChild(car);

  // Phase 1: Slide in from left
  setTimeout(() => {
    car.style.transition = 'left 2.2s cubic-bezier(0.22, 1, 0.36, 1)';
    car.style.left = 'calc(50vw - 160px)';

    // Phase 2: Bounce + horn sound
    setTimeout(() => {
      car.style.transition = '';
      car.style.animation = 'carBounce 0.7s ease-in-out forwards';
      _playCarHorn();

      // Phase 3: Idle hover
      setTimeout(() => {
        car.style.animation = 'carIdle 1.1s ease-in-out infinite alternate';
        car.classList.add('idling');

        // Phase 4: Drive off right
        setTimeout(() => {
          car.classList.remove('idling');
          car.style.animation = '';
          car.style.transition = 'left 1.3s ease-in';
          car.style.left = '115vw';
          setTimeout(() => (car.style.display = 'none'), 1450);
        }, 3200);
      }, 700);
    }, 2250);
  }, 120);
}

function _playCarHorn() {
  if (localStorage.getItem('ep_muted') === 'true') return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const tone = (f, t, d) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0, ac.currentTime + t);
      g.gain.linearRampToValueAtTime(0.1, ac.currentTime + t + 0.02);
      g.gain.setValueAtTime(0.1, ac.currentTime + t + d - 0.02);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + t + d);
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + d);
    };
    tone(520, 0, 0.13); tone(680, 0.13, 0.13); tone(520, 0.26, 0.09);
  } catch (_) { }
}

// ==========================================================
// PART 6 — ElevenLabs TTS + Mute // PART 10 — Mascot
// ==========================================================
async function _playTTS(text) {
  if (localStorage.getItem('ep_muted') === 'true') return;
  if (!window.CONFIG?.ELEVENLABS_API_KEY) return;
  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
      {
        method: 'POST',
        headers: { 'xi-api-key': window.CONFIG.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.35, similarity_boost: 0.92, style: 0.7, use_speaker_boost: true }
        })
      }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.volume = 0.85;
    await audio.play();
  } catch (_) { }
}

function initVoiceSystem(PRM) {
  const muteBtn = document.createElement('button');
  muteBtn.id = 'ep-mute-top-btn';
  const updateIcon = () => {
    muteBtn.textContent = localStorage.getItem('ep_muted') === 'true' ? '🔇' : '🔊';
  };
  updateIcon();
  muteBtn.onclick = () => {
    localStorage.setItem('ep_muted', String(localStorage.getItem('ep_muted') !== 'true'));
    updateIcon();
  };
  document.body.appendChild(muteBtn);

  if (!PRM) {
    setTimeout(() => {
      _playTTS(
        "Hey there superstar! Welcome to EduPlay, the most amazing learning adventure ever! " +
        "Collect the golden stars, explore our courses, and become the champion you were born to be. Let's go!"
      );
    }, 3500);
  }

  const mascot = document.createElement('button');
  mascot.id = 'ep-mascot-btn';
  mascot.textContent = '🐶';
  mascot.onclick = () => _playTTS("You collected some stars! You are incredible. Keep exploring and have fun!");
  document.body.appendChild(mascot);
}

// ==========================================================
// PART 7 — Subject Doors
// ==========================================================
function initDoors() {
  const old = document.getElementById('ep-doors');
  if (old) old.remove();

  let anchor = document.querySelector('#courses .container');
  if (!anchor) {
    const grid = document.querySelector('.card-grid');
    if (grid) anchor = grid.parentElement;
  }
  if (!anchor) return;

  const wrap = document.createElement('div');
  wrap.id = 'ep-doors';

  const doors = [
    { cls: 'door-math', label: '🔢 Math', floats: ['1+1', '×', '÷'], ci: 0 },
    { cls: 'door-eng', label: '📚 English', floats: ['A', 'B', 'C'], ci: 1 },
    { cls: 'door-sci', label: '🔬 Science', floats: ['⚗️', '🌍', '⚡'], ci: 2 }
  ];
  const chords = [
    [523.25, 659.25, 783.99], [587.33, 739.99, 880.00], [659.25, 830.61, 987.77]
  ];

  doors.forEach(d => {
    const cont = document.createElement('div');
    cont.className = 'ep-door-container';
    const door = document.createElement('div');
    door.className = `ep-door ${d.cls}`;

    const knob = document.createElement('div');
    knob.className = 'ep-door-knob';
    door.appendChild(knob);

    d.floats.forEach((sym, j) => {
      const f = document.createElement('div');
      f.className = 'ep-door-float';
      f.textContent = sym;
      f.style.animationDelay = (j * -1.1) + 's';
      door.appendChild(f);
    });

    door.appendChild(document.createTextNode(d.label));
    cont.appendChild(door);

    cont.onclick = () => {
      if (localStorage.getItem('ep_muted') === 'true') return;
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        chords[d.ci].forEach((f, j) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'sine'; o.frequency.value = f;
          o.connect(g); g.connect(ac.destination);
          g.gain.setValueAtTime(0, ac.currentTime + j * 0.2);
          g.gain.linearRampToValueAtTime(0.2, ac.currentTime + j * 0.2 + 0.1);
          g.gain.linearRampToValueAtTime(0, ac.currentTime + j * 0.2 + 0.6);
          o.start(ac.currentTime + j * 0.2); o.stop(ac.currentTime + j * 0.2 + 0.65);
        });
      } catch (_) { }
    };
    wrap.appendChild(cont);
  });

  const grid = anchor.querySelector('.card-grid');
  if (grid) anchor.insertBefore(wrap, grid);
  else anchor.insertBefore(wrap, anchor.firstChild);
}

// ==========================================================
// PART 8 — Confetti
// ==========================================================
const _CONFETTI_COLORS = ['#FF6B9D', '#FFD700', '#6C63FF', '#00D4AA', '#FF8C42', '#00B894'];

function initConfetti() {
  for (let i = 0; i < 70; i++) _spawnConfettiPiece(false);
}

function _spawnConfettiPiece(center) {
  const el = document.createElement('div');
  el.className = 'ep-confetti';
  const size = 6 + Math.random() * 9;
  el.style.width = size + 'px';
  el.style.height = (Math.random() > 0.5 ? size : size * 1.6) + 'px';
  if (Math.random() > 0.65) el.style.borderRadius = '50%';
  el.style.backgroundColor = _CONFETTI_COLORS[Math.floor(Math.random() * _CONFETTI_COLORS.length)];
  const dur = ((center ? 2 + Math.random() : 2.5 + Math.random() * 2)).toFixed(2) + 's';
  const delay = ((center ? Math.random() * 0.5 : Math.random())).toFixed(2) + 's';
  el.style.left = center ? '50%' : (Math.random() * 100) + 'vw';
  el.style.top = center ? '50%' : '-20px';
  el.style.animationDuration = dur;
  el.style.animationDelay = delay;
  el.style.animationTimingFunction = 'linear';
  el.style.animationFillMode = 'forwards';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5500);
}

// ==========================================================
// PART 9 — Stats Counter (IntersectionObserver + easeOutQuart)
// ==========================================================
function initStats() {
  const statEls = document.querySelectorAll('.text-center h3');
  if (!statEls.length) return;

  function easeOutQuart(x) { return 1 - Math.pow(1 - x, 4); }

  function animateStat(el, delay) {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d.]+)(.*)$/);
    if (!match) return;
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isFloat = raw.includes('.');
    setTimeout(() => {
      const dur = 1800;
      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const val = easeOutQuart(p) * target;
        el.textContent = (isFloat ? val.toFixed(1) : Math.floor(val)) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      }
      requestAnimationFrame(step);
    }, delay);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = Array.from(statEls).indexOf(e.target);
        animateStat(e.target, idx * 200);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => obs.observe(el));
}
