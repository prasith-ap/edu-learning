// Progress JavaScript with Supabase Integration

console.log('📊 Progress.js loaded');

const modulesMeta = {
  'mathematics': { label: 'Mathematics', emoji: '🔢', color: '#667EEA', bg: 'rgba(102, 126, 234, 0.1)' },
  'english': { label: 'English', emoji: '📖', color: '#FF6B9D', bg: 'rgba(255, 107, 157, 0.1)' },
  'general-knowledge': { label: 'General Knowledge', emoji: '🌍', color: '#FFD93D', bg: 'rgba(255, 217, 61, 0.1)' }
};

// ─── Main Loader ──────────────────────────────────────────────────────────────

async function loadProgressData() {
  try {
    const user = window.eduplay ? await window.eduplay.getCurrentUser() : null;
    if (!user) { window.location.href = 'login.html'; return; }

    // 0. Update Header UI
    const navUsername = document.getElementById('navUsername');
    if (navUsername) navUsername.textContent = user.username || 'Explorer';

    const initials = (user.username || 'EX').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = initials;

    const stats = user.stats || { totalPoints: 0, quizzesCompleted: 0, history: [] };
    const history = stats.history || [];

    // Fetch and display game coins in header
    try {
      const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      const userId = localStorage.getItem('eduplay_user_id');
      if (userId) {
        const { data: coinData } = await supabase
          .from('users')
          .select('game_coins')
          .eq('id', userId)
          .single();
        const coinEl = document.getElementById('navCoins');
        if (coinEl && coinData) coinEl.textContent = coinData.game_coins || 0;
        window.eduplay_current_coins = coinData?.game_coins || 0;
      }
    } catch (e) { console.warn('Coin fetch failed:', e); }

    // Top stats
    document.getElementById('totalPoints').textContent = stats.totalPoints || 0;
    document.getElementById('totalQuizzes').textContent = history.length || stats.quizzesCompleted || 0;

    const avgAccuracy = history.length
      ? Math.round(history.reduce((s, q) => s + (q.percentage || 0), 0) / history.length)
      : 0;
    document.getElementById('avgCorrect').textContent = avgAccuracy + '%';

    // Render all sections
    renderBestScores(history);
    renderModuleBreakdown(history);
    renderQuizHistory(history);
    if (typeof renderMoodCorrelation === 'function') {
      renderMoodCorrelation(history);
    }

  } catch (error) {
    console.error('❌ Error loading progress data:', error);
    const container = document.getElementById('historyContainer');
    if (container) {
      container.innerHTML = `<p style="color:var(--error);text-align:center;">Error loading data. Please refresh.</p>`;
    }
  }
}

// ─── Personal Best Cards ──────────────────────────────────────────────────────

function renderBestScores(history) {
  const container = document.getElementById('bestScores');
  if (!container) return;

  const order = ['mathematics', 'english', 'general-knowledge'];

  container.innerHTML = order.map(mod => {
    const meta = modulesMeta[mod];
    const attempts = history.filter(h => h.module === mod);

    if (attempts.length === 0) {
      return `
        <div class="best-card not-attempted">
          <div class="best-module-icon">${meta.emoji}</div>
          <div class="best-module-name">${meta.label}</div>
          <div class="best-score-big">—</div>
          <p style="color:rgba(255,255,255,0.6); margin-bottom:15px;">No attempts yet</p>
          <a href="dashboard.html" class="btn-astonishing primary">Start Quiz</a>
        </div>`;
    }

    const best = Math.max(...attempts.map(h => h.percentage || 0));
    const bestAttempt = attempts.find(h => h.percentage === best);
    const bestPoints = bestAttempt?.score || 0;

    // Grade label & colour
    let gradeLabel, gradeColor, gradeBg;
    if (best === 100) { gradeLabel = '🏆 Perfect!'; gradeColor = '#5a4000'; gradeBg = '#ffd700'; }
    else if (best >= 80) { gradeLabel = '⭐ Excellent'; gradeColor = '#00534d'; gradeBg = '#b2dfdb'; }
    else if (best >= 60) { gradeLabel = '👍 Good'; gradeColor = '#1b5e20'; gradeBg = '#c8e6c9'; }
    else if (best >= 40) { gradeLabel = '💪 Keep Going'; gradeColor = '#7c3d00'; gradeBg = '#ffe0b2'; }
    else { gradeLabel = '📚 Keep Trying'; gradeColor = '#555'; gradeBg = '#f5f5f5'; }

    return `
      <div class="best-card attempted" style="border-color:${meta.color};">
        <div class="best-module-icon">${meta.emoji}</div>
        <div class="best-module-name">${meta.label}</div>
        <div class="best-score-big" style="color:${meta.color};">${best}%</div>
        <div class="best-score-label" style="color:white; opacity:0.8;">Best: ${bestPoints} pts</div>
        <span class="best-score-grade" style="background:${gradeBg};color:${gradeColor}; padding:5px 15px; border-radius:20px; font-weight:800; margin:10px 0;">${gradeLabel}</span>
        <div class="attempts-note" style="color:rgba(255,255,255,0.6); font-size:0.85rem;">${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}</div>
      </div>`;
  }).join('');
}

// ─── Subject Breakdown Bars ───────────────────────────────────────────────────

function renderModuleBreakdown(history) {
  const container = document.getElementById('moduleBreakdown');
  if (!container) return;

  const order = ['mathematics', 'english', 'general-knowledge'];

  container.innerHTML = order.map(mod => {
    const meta = modulesMeta[mod];
    const attempts = history.filter(h => h.module === mod);

    if (attempts.length === 0) {
      return `
        <div class="module-row">
          <div class="module-bar-wrap">
            <div class="module-name">${meta.emoji} ${meta.label}</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:0%;"></div></div>
            <div class="module-meta">Not attempted — <a href="dashboard.html" style="color:var(--sun-gold);">Start Quiz →</a></div>
          </div>
          <div class="module-pct" style="color:#ccc;">—</div>
        </div>`;
    }

    const best = Math.max(...attempts.map(h => h.percentage || 0));
    const avg = Math.round(attempts.reduce((s, h) => s + (h.percentage || 0), 0) / attempts.length);

    return `
      <div class="module-row">
        <div class="module-bar-wrap">
          <div class="module-name">${meta.emoji} ${meta.label}</div>
          <div class="mini-bar">
            <div class="mini-bar-fill" style="width:${best}%; background:${meta.color};"></div>
          </div>
          <div class="module-meta">Best: <strong>${best}%</strong> &nbsp;|&nbsp; Avg: ${avg}% &nbsp;|&nbsp; ${attempts.length} attempts</div>
        </div>
        <div class="module-pct" style="color:${meta.color};">${best}%</div>
      </div>`;
  }).join('');
}

// ─── Quiz History List ────────────────────────────────────────────────────────

function renderQuizHistory(history) {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px; color:white;">
        <div style="font-size:2.5rem; margin-bottom:12px;">📝</div>
        <p style="margin:0 0 16px;">No quizzes taken yet!</p>
        <a href="dashboard.html" class="btn-astonishing primary">Start Your First Quiz</a>
      </div>`;
    return;
  }

  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(quiz => {
    const meta = modulesMeta[quiz.module] || { label: quiz.module, emoji: '📝' };
    const date = formatDate(new Date(quiz.date));

    let gradeClass, gradeLabel, gradeEmoji;
    if (quiz.percentage === 100) { gradeClass = 'grade-perfect'; gradeLabel = 'Perfect!'; gradeEmoji = '🏆'; }
    else if (quiz.percentage >= 80) { gradeClass = 'grade-excellent'; gradeLabel = 'Excellent'; gradeEmoji = '⭐'; }
    else if (quiz.percentage >= 60) { gradeClass = 'grade-good'; gradeLabel = 'Good'; gradeEmoji = '👍'; }
    else if (quiz.percentage >= 40) { gradeClass = 'grade-okay'; gradeLabel = 'Keep Trying'; gradeEmoji = '💪'; }
    else { gradeClass = 'grade-start'; gradeLabel = 'Keep Going'; gradeEmoji = '📚'; }

    return `
      <div class="history-item">
        <div class="history-info">
          <h3 style="margin:0; font-family:'Baloo 2', cursive;">${meta.emoji} ${meta.label}</h3>
          <p style="margin:5px 0 0; opacity:0.7;">${date}</p>
        </div>
        <div class="history-stats" style="display:flex; gap:20px;">
          <div class="history-stat">
            <div class="history-stat-value" style="font-weight:900; font-size:1.2rem;">${quiz.score}</div>
            <div class="history-stat-label" style="font-size:0.75rem; opacity:0.6;">Points</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value" style="font-weight:900; font-size:1.2rem;">${quiz.percentage}%</div>
            <div class="history-stat-label" style="font-size:0.75rem; opacity:0.6;">Accuracy</div>
          </div>
        </div>
        <span class="grade-chip ${gradeClass}" style="padding:5px 15px; border-radius:15px; font-weight:800;">${gradeEmoji} ${gradeLabel}</span>
      </div>`;
  }).join('');
}

function renderMoodCorrelation(history) {
  const container = document.getElementById('moodCorrelation');
  if (!container) return;
  // (Existing mood correlation logic if any, but let's keep it simple for now)
  container.innerHTML = `<p style="text-align:center; opacity:0.7;">Mood analysis coming soon! Keep learning! ✨</p>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  // 1. Theme Engine
  if (window.eduplayTheme) {
    window.eduplayTheme.initLivingBackground();
    window.eduplayTheme.initMouseParallax();
    window.addEventListener('click', (e) => window.eduplayTheme.spawnClickRipple(e.clientX, e.clientY));
  }

  // 2. Mascot Interaction
  const mascot = document.getElementById('mascotOwl');
  if (mascot) {
    mascot.addEventListener('click', () => {
      mascot.style.transform = 'scale(1.5) rotate(20deg)';
      setTimeout(() => mascot.style.transform = '', 300);
    });
  }

  // 3. Data Loading (Wait for it)
  await loadProgressData();

  // 4. Entrance Sequence (Smooth Fade)
  setTimeout(() => {
    const wrapper = document.getElementById('contentWrapper');
    if (wrapper) {
      wrapper.classList.add('active');
      console.log('✨ Adventure logs manifested!');
    }
  }, 300);
});

console.log('✅ Progress.js ready');