// Dashboard JavaScript with Supabase Integration

console.log('📊 Dashboard.js loaded');

// Badge definitions with emojis
const BADGES = {
  'first_quiz': { name: 'First Steps', emoji: '🌟', description: 'Complete your first quiz' },
  'quiz_master_5': { name: 'Quiz Master', emoji: '🎓', description: 'Complete 5 quizzes' },
  'perfect_score': { name: 'Perfect!', emoji: '💯', description: 'Get 100% on a quiz' },
  'high_scorer': { name: 'High Scorer', emoji: '🏆', description: 'Score 90%+ on a quiz' },
  'math_whiz': { name: 'Math Whiz', emoji: '🔢', description: 'Complete 3 math quizzes' },
  'word_master': { name: 'Word Master', emoji: '📖', description: 'Complete 3 English quizzes' },
  'knowledge_seeker': { name: 'Knowledge Seeker', emoji: '🌍', description: 'Complete 3 GK quizzes' },
  'dedicated_learner': { name: 'Dedicated', emoji: '⭐', description: 'Complete 10 quizzes' },
  'point_collector': { name: 'Point Collector', emoji: '💎', description: 'Earn 500 points' }
};

// Load user data from Supabase
async function loadUserData() {
  console.log('Loading user data...');
  try {
    const user = window.eduplay ? await window.eduplay.getCurrentUser() : null;
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Welcome message
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${user.username} 👋`;

    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = user.username;

    const stats = user.stats || { totalPoints: 0, badges: [], quizzesCompleted: 0, history: [] };

    // Stats
    document.getElementById('totalPoints').textContent = stats.totalPoints || 0;
    document.getElementById('badgesCount').textContent = (stats.badges || []).length;
    document.getElementById('quizzesCompleted').textContent = stats.quizzesCompleted || 0;

    // Average score
    let avgScore = 0;
    if (stats.history && stats.history.length > 0) {
      avgScore = Math.round(stats.history.reduce((s, q) => s + (q.percentage || 0), 0) / stats.history.length);
    }
    document.getElementById('avgScore').textContent = avgScore + '%';

    // Per-module best scores
    updateModuleProgress(stats.history || []);

    // Badges
    renderBadges(stats.badges || []);

    // Check for new badges
    await checkAndAwardBadges(user);

  } catch (error) {
    console.error('❌ Error loading user data:', error);
    window.location.href = 'login.html';
  }
}

// Show best score bar under each module card
function updateModuleProgress(history) {
  const modules = {
    'mathematics': { prefix: 'math' },
    'english': { prefix: 'english' },
    'general-knowledge': { prefix: 'gk' }
  };

  Object.entries(modules).forEach(([mod, cfg]) => {
    const attempts = history.filter(h => h.module === mod);
    if (attempts.length === 0) return;

    const best = Math.max(...attempts.map(h => h.percentage || 0));
    const bar = document.getElementById(`${cfg.prefix}-progress`);
    const fill = document.getElementById(`${cfg.prefix}-progress-fill`);
    const label = document.getElementById(`${cfg.prefix}-best`);

    if (bar && fill && label) {
      bar.style.display = 'block';
      fill.style.width = best + '%';
      label.style.display = 'block';
      label.textContent = `Best: ${best}% — ${attempts.length} attempt${attempts.length > 1 ? 's' : ''}`;
    }
  });
}

// Render badge grid
function renderBadges(badges) {
  const container = document.getElementById('badgesContainer');
  if (!container) return;

  if (!badges || badges.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; color:#666; padding:20px;">
        <div style="font-size:2rem; margin-bottom:8px;">🎯</div>
        <p style="margin:0;">Complete quizzes to earn your first badge!</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="badges-grid">
      ${badges.map(badge => {
    const def = BADGES[badge.badge_id || badge.id] || {};
    const emoji = def.emoji || badge.icon || '🏅';
    const name = def.name || badge.name || 'Badge';
    return `
          <div class="badge-item" title="${def.description || name}">
            <div class="badge-icon-emoji">${emoji}</div>
            <div class="badge-name">${name}</div>
          </div>`;
  }).join('')}
    </div>`;
}

// Check and award new badges
async function checkAndAwardBadges(user) {
  const stats = user.stats || {};
  const currentBadges = (stats.badges || []).map(b => b.badge_id || b.id);
  const newBadges = [];
  const h = stats.history || [];

  if (stats.quizzesCompleted >= 1 && !currentBadges.includes('first_quiz')) newBadges.push({ ...BADGES.first_quiz, id: 'first_quiz' });
  if (stats.quizzesCompleted >= 5 && !currentBadges.includes('quiz_master_5')) newBadges.push({ ...BADGES.quiz_master_5, id: 'quiz_master_5' });
  if (stats.quizzesCompleted >= 10 && !currentBadges.includes('dedicated_learner')) newBadges.push({ ...BADGES.dedicated_learner, id: 'dedicated_learner' });
  if (stats.totalPoints >= 500 && !currentBadges.includes('point_collector')) newBadges.push({ ...BADGES.point_collector, id: 'point_collector' });

  if (h.length > 0) {
    if (h.some(q => q.percentage === 100) && !currentBadges.includes('perfect_score')) newBadges.push({ ...BADGES.perfect_score, id: 'perfect_score' });
    if (h.some(q => q.percentage >= 90) && !currentBadges.includes('high_scorer')) newBadges.push({ ...BADGES.high_scorer, id: 'high_scorer' });
    if (h.filter(q => q.module === 'mathematics').length >= 3 && !currentBadges.includes('math_whiz')) newBadges.push({ ...BADGES.math_whiz, id: 'math_whiz' });
    if (h.filter(q => q.module === 'english').length >= 3 && !currentBadges.includes('word_master')) newBadges.push({ ...BADGES.word_master, id: 'word_master' });
    if (h.filter(q => q.module === 'general-knowledge').length >= 3 && !currentBadges.includes('knowledge_seeker')) newBadges.push({ ...BADGES.knowledge_seeker, id: 'knowledge_seeker' });
  }

  if (newBadges.length > 0 && window.eduplay?.saveBadge) {
    for (const badge of newBadges) {
      await window.eduplay.saveBadge(badge);
    }
    // Reload to reflect new badges
    await loadUserData();
  }
}

// Start quiz
function startQuiz(module) {
  window.location.href = `quiz.html?module=${module}`;
}

// Init
document.addEventListener('DOMContentLoaded', async function () {
  await loadUserData();
});

console.log('✅ Dashboard.js ready');