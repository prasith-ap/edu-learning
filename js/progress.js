// Progress JavaScript with Supabase Integration

console.log('📊 Progress.js loaded');

const modulesMeta = {
  'mathematics': { label: 'Mathematics', emoji: '🔢', color: '#1976D2', bg: '#E3F2FD' },
  'english': { label: 'English', emoji: '📖', color: '#7B1FA2', bg: '#F3E5F5' },
  'general-knowledge': { label: 'General Knowledge', emoji: '🌍', color: '#388E3C', bg: '#E8F5E9' }
};

// ─── Main Loader ──────────────────────────────────────────────────────────────

async function loadProgressData() {
  try {
    const user = window.eduplay ? await window.eduplay.getCurrentUser() : null;
    if (!user) { window.location.href = 'login.html'; return; }

    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = user.username;

    const stats = user.stats || { totalPoints: 0, quizzesCompleted: 0, history: [] };
    const history = stats.history || [];

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

  } catch (error) {
    console.error('❌ Error loading progress data:', error);
    document.getElementById('historyContainer').innerHTML =
      `<p style="color:var(--error);text-align:center;">Error loading data. Please refresh.</p>`;
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
          <div class="best-score-label">No attempts yet</div>
          <a href="dashboard.html" class="btn btn-outline" style="font-size:0.8rem;padding:6px 16px;margin-top:8px;">Start Quiz</a>
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
        <div class="best-score-label">Best accuracy · ${bestPoints} pts</div>
        <span class="best-score-grade" style="background:${gradeBg};color:${gradeColor};">${gradeLabel}</span>
        <div class="attempts-note">${attempts.length} attempt${attempts.length !== 1 ? 's' : ''} total</div>
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
          <div class="module-icon-sm">${meta.emoji}</div>
          <div class="module-bar-wrap">
            <div class="module-name">${meta.label}</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:0%;"></div></div>
            <div class="module-meta">Not attempted — <a href="dashboard.html">Start Quiz →</a></div>
          </div>
          <div class="module-pct" style="color:#ccc;">—</div>
        </div>`;
    }

    const best = Math.max(...attempts.map(h => h.percentage || 0));
    const avg = Math.round(attempts.reduce((s, h) => s + (h.percentage || 0), 0) / attempts.length);

    return `
      <div class="module-row">
        <div class="module-icon-sm">${meta.emoji}</div>
        <div class="module-bar-wrap">
          <div class="module-name">${meta.label}</div>
          <div class="mini-bar">
            <div class="mini-bar-fill" style="width:${best}%; background:${meta.color};"></div>
          </div>
          <div class="module-meta">Best: <strong>${best}%</strong> &nbsp;|&nbsp; Avg: ${avg}% &nbsp;|&nbsp; ${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}</div>
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
      <div style="text-align:center; padding:32px; color:#666;">
        <div style="font-size:2.5rem; margin-bottom:12px;">📝</div>
        <p style="margin:0 0 16px;">No quizzes taken yet!</p>
        <a href="dashboard.html" class="btn btn-primary">Start Your First Quiz</a>
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

    let itemClass = quiz.percentage === 100 ? 'perfect' : quiz.percentage >= 80 ? 'excellent' : quiz.percentage >= 60 ? 'good' : '';

    return `
      <div class="history-item ${itemClass}">
        <div class="history-info">
          <h3>${meta.emoji} ${meta.label}</h3>
          <p>${date}</p>
        </div>
        <div class="history-stats">
          <div class="history-stat">
            <div class="history-stat-value">${quiz.score}</div>
            <div class="history-stat-label">Points</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${quiz.correct}/${quiz.total}</div>
            <div class="history-stat-label">Correct</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${quiz.percentage}%</div>
            <div class="history-stat-label">Accuracy</div>
          </div>
        </div>
        <span class="grade-chip ${gradeClass}">${gradeEmoji} ${gradeLabel}</span>
      </div>`;
  }).join('');
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
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  await loadProgressData();
});

console.log('✅ Progress.js ready');