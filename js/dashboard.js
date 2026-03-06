// Initialize authentication state purely from Supabase
(async () => {
  if (typeof checkAuth === "function") {
    await checkAuth();
  }
})();

/**
 * EduPlay Dashboard - Magical Sky Kingdom Hub
 * Orchestrates animations, background systems, and real-time data from Supabase.
 */

// Global State
let currentUser = null;
const STAR_COUNT = 60;
const CLOUD_COUNT = 4;
const EMOJIS = ["🌈", "⭐", "🎈", "🦋", "🌸", "💫", "🎊", "🌙", "✨", "🎯"];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Living Background immediately (z-index 0)
  initLivingBackground();

  // 2. Fetch User Data from Supabase
  await loadUserData();

  // 3. Orchestrate Entrance Sequence (Section 1)
  initPageEntrance();

  // Set active navbar link
  setActiveNavLink();

  // 4. Global Interactive Listeners
  window.addEventListener('click', (e) => {
    if (window.eduplayTheme) window.eduplayTheme.spawnClickRipple(e.clientX, e.clientY);
  });
  if (window.eduplayTheme) window.eduplayTheme.initMouseParallax();
});

/* ─── SECTION 1: PAGE ENTRANCE SEQUENCE ─── */

function initPageEntrance() {
  const isShown = sessionStorage.getItem('eduplay_intro_shown');
  const introDuration = 3200;

  if (isShown) {
    // Skip intro, show instantly
    document.body.style.opacity = '1';
    document.body.style.transition = 'none';
    return;
  }

  // Step 1: Fade body in (0ms)
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.6s ease';
    document.body.style.opacity = '1';
  }, 0);

  // Step 2: Clouds slide in (400ms)
  setTimeout(() => {
    const clouds = document.querySelectorAll('.cloud');
    clouds.forEach((cloud, i) => {
      cloud.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      cloud.style.transform = 'translateX(0)';
    });
  }, 400);

  // Step 3: Navbar slides down (800ms)
  setTimeout(() => {
    const nav = document.getElementById('mainNav');
    if (nav) {
      nav.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      nav.style.transform = 'translateY(0)';
    }
  }, 800);

  // Step 4: Hero section rises (1000ms)
  setTimeout(() => {
    const hero = document.getElementById('heroSection');
    if (hero) {
      hero.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
      hero.style.transform = 'translateY(0)';
      hero.style.opacity = '1';
    }
  }, 1000);

  // Step 5: Stats chips pop in (1400ms)
  setTimeout(() => {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        card.style.animation = 'chipPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        card.style.opacity = '1';
      }, i * 150);
    });
  }, 1400);

  // Step 6: Subject cards fly in (1800ms)
  setTimeout(() => {
    const subjects = document.querySelectorAll('.subject-card');
    subjects.forEach((card, i) => {
      setTimeout(() => {
        card.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease';
        card.style.transform = 'translateY(0) rotate(0)';
        card.style.opacity = '1';
      }, i * 150);
    });
  }, 1800);

  // Step 7: Final fade / idle start (2400ms)
  setTimeout(() => {
    sessionStorage.setItem('eduplay_intro_shown', 'true');
    checkAndShowDailyTip();
  }, 2400);
}

/* ─── SECTION 2: LIVING BACKGROUND ─── */

function initLivingBackground() {
  if (window.eduplayTheme) {
    window.eduplayTheme.initLivingBackground();
  }
}

/* ─── SECTION 11: DATA LOGIC ─── */

async function loadUserData() {
  console.log('🔄 Loading user data from eduplay API...');

  // stats is defined at function scope so the mascot setTimeout can access it
  let stats = { totalPoints: 0, badges: [], quizzesCompleted: 0, history: [] };

  try {
    if (!window.eduplay) {
      console.error('❌ EduPlay API not found on window object!');
      return;
    }

    currentUser = await window.eduplay.getCurrentUser();
    console.log('👤 Current User Data:', currentUser);

    if (!currentUser) {
      console.warn('⚠️ getCurrentUser() returned null — session may still be loading. Skipping render.');
      return;
    }

    // Correctly map data from the nested .stats object provided by auth.js
    stats = currentUser.stats || stats;

    renderStats(stats);
    renderBadges(stats.badges, stats);
    updateModuleCards(stats.history);
    initDailyChallenge(stats.history);

    // Username and Avatar (direct on currentUser)
    document.getElementById('navUsername').textContent = currentUser.username || 'Explorer';
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${currentUser.username || 'Explorer'}! 👋`;

    const initials = (currentUser.username || 'EX').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('navAvatar');
    if (avatarEl) avatarEl.textContent = initials;

    // Level Update
    const level = calculateLevel(stats.totalPoints || 0);
    const lPill = document.getElementById('levelBadgePill');
    if (lPill) {
      lPill.textContent = level.label;
      lPill.className = `level-badge ${level.class}`;
    }

    // Coins are already fetched and displayed by auth.js updateNavCoins via checkAuth
    // No need to create a second Supabase client here

    // ── Parent View Init ──────────────────────────────────────
    if (window.ParentView) {
      try {
        // Get or create Supabase client
        let sb = window._dashboardSupabase;
        if (!sb && window.supabase && window.CONFIG) {
          sb = window.supabase.createClient(
            window.CONFIG.SUPABASE_URL,
            window.CONFIG.SUPABASE_ANON_KEY
          );
          window._dashboardSupabase = sb;
        }
        const userId = currentUser.id || currentUser.auth_id;
        if (sb && userId) {
          // Compute badges from stats for parent view
          const pvBadges = (stats.badges && stats.badges.length > 0)
            ? stats.badges
            : computeBadgesFromStats(stats);
          ParentView.init(sb, userId, currentUser, stats.history || [], pvBadges);
        }
      } catch (pvErr) {
        console.warn('ParentView init failed:', pvErr);
      }
    }

    // ── Stella Dashboard Card ───────────────────────────────────
    try {
      const userId = currentUser.id || currentUser.auth_id;
      if (userId && window.loadStellaProgress) {
        window.loadStellaProgress(userId).then(progress => {
          const levelNames = ['', 'Beginner', 'Explorer', 'Adventurer', 'Champion', 'Master'];
          const lvl = progress?.current_level || 0;
          const lvlEl = document.getElementById('dashStellaLevel');
          if (lvlEl) {
            lvlEl.textContent = lvl > 0
              ? `Level ${lvl}: ${levelNames[lvl] || ''}`
              : 'Start your first session!';
          }
          const sessEl = document.getElementById('dashStellaSessions');
          if (sessEl) {
            sessEl.textContent = progress ? `${progress.total_sessions} session${progress.total_sessions !== 1 ? 's' : ''}` : '0 sessions';
          }
          const wordsEl = document.getElementById('dashStellaWords');
          if (wordsEl) {
            const wc = Array.isArray(progress?.words_learned) ? progress.words_learned.length : 0;
            wordsEl.textContent = `📚 ${wc} word${wc !== 1 ? 's' : ''}`;
          }
        }).catch(() => { });
      }
    } catch (e) {
      console.warn('Stella card load failed:', e);
    }

  } catch (err) {
    console.error('❌ Error in loadUserData:', err);
  }

  // ═══════════════════════════════════════════════════════════
  // MASCOT AI COMPANION - WELCOME MESSAGE
  // ═══════════════════════════════════════════════════════════
  setTimeout(async () => {
    const weakSubjects = calculateWeakSubjects(stats);
    const strongSubjects = calculateStrongSubjects(stats);
    const daysSinceLastLogin = calculateDaysSinceLastLogin(stats);

    if (window.eduplay && window.eduplay.mascot && currentUser) {
      window.eduplay.mascot.speak({
        trigger: 'dashboard_load',
        username: currentUser.username || 'Friend',
        streak: calculateStreak(stats.history) || 0,
        totalPoints: stats.totalPoints || 0,
        daysSinceLastLogin: daysSinceLastLogin,
        weakSubjects: weakSubjects,
        strongSubjects: strongSubjects,
        quizzesCompleted: stats.quizzesCompleted || 0,
        currentLevel: calculateLevel(stats.totalPoints || 0).label
      });
    }
  }, 1000); // Delay to let page settle
}

function renderStats(stats) {
  animateCountUp(document.getElementById('totalPoints'), stats.totalPoints || 0, 1200);
  // Badges count is set by renderBadges after computing from stats
  animateCountUp(document.getElementById('quizzesCompleted'), stats.quizzesCompleted || 0, 1200);

  // Calculate avg score: use history if available, otherwise estimate from total_points/quizzes
  let avg = 0;
  if (stats.history && stats.history.length > 0) {
    const totalPercentage = stats.history.reduce((acc, h) => acc + (h.percentage || 0), 0);
    avg = Math.round(totalPercentage / stats.history.length);
  } else if (stats.quizzesCompleted > 0 && stats.totalPoints > 0) {
    // Estimate: points per quiz out of 100 (10 questions × 10pts each)
    const pointsPerQuiz = stats.totalPoints / stats.quizzesCompleted;
    avg = Math.min(100, Math.round(pointsPerQuiz));
  }

  const avgEl = document.getElementById('avgScore');
  if (avgEl) {
    if (avg > 0) {
      animateCountUp(avgEl, avg, 1200, '%');
    } else {
      avgEl.textContent = '--';
    }
  }

  if (stats.history && stats.history.length > 0) {
    const streak = calculateStreak(stats.history);
    const indicator = document.getElementById('streakIndicator');
    if (indicator && streak >= 1) {
      indicator.querySelector('span').textContent = streak;
      indicator.style.display = 'block';
    }
  }
}

/**
 * Compute badges from user stats since user_badges table doesn't exist.
 * Returns an array of badge objects based on points/quizzes.
 */
function computeBadgesFromStats(stats) {
  const badges = [];
  const points = stats.totalPoints || 0;
  const quizzes = stats.quizzesCompleted || 0;

  if (quizzes >= 1) badges.push({ name: 'First Quest', emoji: '🎯' });
  if (quizzes >= 5) badges.push({ name: 'Quiz Explorer', emoji: '🧭' });
  if (quizzes >= 10) badges.push({ name: 'Quiz Master', emoji: '👑' });
  if (quizzes >= 20) badges.push({ name: 'Learning Legend', emoji: '🏆' });
  if (points >= 100) badges.push({ name: 'Point Collector', emoji: '⭐' });
  if (points >= 500) badges.push({ name: 'Star Learner', emoji: '🌟' });
  if (points >= 1000) badges.push({ name: 'Knowledge Hero', emoji: '🦸' });
  if (points >= 2000) badges.push({ name: 'Grand Champion', emoji: '🥇' });

  return badges;
}

function renderBadges(badgesFromDB, stats) {
  const container = document.getElementById('badgesContainer');
  if (!container) return;

  // Use DB badges if available, otherwise compute from stats
  const badges = (badgesFromDB && badgesFromDB.length > 0)
    ? badgesFromDB
    : computeBadgesFromStats(stats || {});

  // Update badge count on the stat card
  const badgeCountEl = document.getElementById('badgesCount');
  if (badgeCountEl) badgeCountEl.textContent = badges.length;

  if (badges.length > 0) {
    container.innerHTML = '';
    badges.forEach(b => {
      const item = document.createElement('div');
      item.className = 'badge-item';
      item.innerHTML = `
        <span class="badge-emoji">${b.emoji || b.icon || '🏅'}</span>
        <span class="badge-name">${b.name}</span>
      `;
      container.appendChild(item);
    });
  }
}

function updateModuleCards(history) {
  if (!history) return;

  const modules = {
    'mathematics': { badge: 'math-best-badge', progress: 'math-progress', fill: 'math-progress-fill' },
    'english': { badge: 'english-best-badge', progress: 'english-progress', fill: 'english-progress-fill' },
    'general-knowledge': { badge: 'gk-best-badge', progress: 'gk-progress', fill: 'gk-progress-fill' }
  };

  Object.keys(modules).forEach(mod => {
    const modHistory = history.filter(h => h.module === mod);
    if (modHistory.length > 0) {
      const best = Math.max(...modHistory.map(h => h.percentage || 0));

      const badge = document.getElementById(modules[mod].badge);
      badge.textContent = `Best: ${best}%`;
      badge.style.display = 'block';

      const prog = document.getElementById(modules[mod].progress);
      prog.style.display = 'block';

      const fill = document.getElementById(modules[mod].fill);
      setTimeout(() => {
        fill.style.width = best + '%';
      }, 2000);
    }
  });
}

function initDailyChallenge(history) {
  const today = new Date().toISOString().split('T')[0];
  const todayCorrect = history ? history
    .filter(h => h.date.startsWith(today))
    .reduce((acc, h) => acc + (h.correct || 0), 0) : 0;

  const count = Math.min(todayCorrect, 5);
  document.getElementById('challengeProgressText').textContent = `${count}/5 correct today ⭐`;
  document.getElementById('challengeProgressBarFill').style.width = (count * 20) + '%';
}

/* ─── UTILITIES ─── */

function calculateLevel(pts) {
  if (pts >= 1000) return { label: '👑 Legend', class: 'lvl-legend' };
  if (pts >= 600) return { label: '🔥 Fire Champion', class: 'lvl-champion' };
  if (pts >= 300) return { label: '🚀 Space Cadet', class: 'lvl-cadet' };
  if (pts >= 100) return { label: '⭐ Rising Star', class: 'lvl-star' };
  return { label: '🌱 Sprout Explorer', class: 'lvl-sprout' };
}

function animateCountUp(el, target, duration, suffix = '') {
  if (!el) return;
  let start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // easeOutExpo
    const value = progress === 1 ? target : Math.floor(target * (1 - Math.pow(2, -10 * progress)));
    el.textContent = value + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

function calculateStreak(history) {
  if (!history || history.length === 0) return 0;

  const dates = [...new Set(history.map(h => h.date.split('T')[0]))].sort().reverse();
  let streak = 0;
  let today = new Date().toISOString().split('T')[0];

  // Check if the most recent quiz was today or yesterday
  let current = new Date(dates[0]);
  let now = new Date(today);
  const diffDays = Math.ceil(Math.abs(now - current) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0; // Streak broken

  for (let i = 0; i < dates.length - 1; i++) {
    let d1 = new Date(dates[i]);
    let d2 = new Date(dates[i + 1]);
    const diff = Math.ceil(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak + 1;
}

function spawnClickRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  ripple.style.left = (x - 10) + 'px';
  ripple.style.top = (y - 10) + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function initMouseParallax() {
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;

    // Parallax for floating elements
    document.querySelectorAll('.floating-emoji').forEach((el, i) => {
      const factor = (i % 3 + 1) * 0.5; // Foreground moves more
      el.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  });
}

function checkAndShowDailyTip() {
  const tips = [
    "💡 Tip: Try General Knowledge today for variety!",
    "💡 Tip: Take a break every 3 quizzes to stretch! 🧘",
    "💡 Tip: Read the hints! They're super helpful. 💡",
    "💡 Tip: You earn more points on high streaks! 🔥",
    "💡 Tip: English quizzes help build your vocabulary! 📚"
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  // Basic toast - assuming existing toast logic if not create simple one
  console.log('Daily Tip:', tip);
}

// Global start function
window.startQuiz = function (module) {
  console.log(`🚀 Starting adventure for: ${module}`);
  sessionStorage.setItem('currentModule', module);

  // Show a quick transition effect
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';

  setTimeout(() => {
    // PASS via URL for maximum reliability
    window.location.href = `quiz.html?module=${module}`;
  }, 400);
};

// Programmatic listener attachment for Subject Cards
function initSubjectButtons() {
  const mathCard = document.getElementById('mathCard');
  if (mathCard) {
    const btn = mathCard.querySelector('.start-btn');
    if (btn) btn.addEventListener('click', () => window.startQuiz('mathematics'));
  }

  const englishCard = document.getElementById('englishCard');
  if (englishCard) {
    const btn = englishCard.querySelector('.start-btn');
    if (btn) btn.addEventListener('click', () => window.startQuiz('english'));
  }

  const gkCard = document.getElementById('gkCard');
  if (gkCard) {
    const btn = gkCard.querySelector('.start-btn');
    if (btn) btn.addEventListener('click', () => window.startQuiz('general-knowledge'));
  }
}

/* ─── HELPER FUNCTIONS FOR MASCOT SYSTEM ─── */

function calculateDaysSinceLastLogin(stats) {
  const history = stats.history || [];
  if (history.length === 0) return 999;

  const lastQuizDate = new Date(history[history.length - 1].date || history[history.length - 1].created_at);
  const today = new Date();
  const diffTime = Math.abs(today - lastQuizDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculateWeakSubjects(stats) {
  const modules = {};
  const history = stats.history || [];

  history.forEach(q => {
    const mod = q.module || 'general';
    if (!modules[mod]) {
      modules[mod] = { total: 0, count: 0 };
    }
    modules[mod].total += q.percentage || 0;
    modules[mod].count++;
  });

  return Object.entries(modules)
    .map(([name, data]) => ({ name, avg: data.total / data.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 2)
    .map(s => s.name);
}

function calculateStrongSubjects(stats) {
  const modules = {};
  const history = stats.history || [];

  history.forEach(q => {
    const mod = q.module || 'general';
    if (!modules[mod]) {
      modules[mod] = { total: 0, count: 0 };
    }
    modules[mod].total += q.percentage || 0;
    modules[mod].count++;
  });

  return Object.entries(modules)
    .map(([name, data]) => ({ name, avg: data.total / data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2)
    .map(s => s.name);
}

// Call button init safely
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSubjectButtons);
} else {
  initSubjectButtons();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  console.log('👋 Logging out...');
  if (window.eduplay) window.eduplay.session.clear();
  window.location.href = 'login.html';
});

/* ============================================
   ACTIVE LINK DETECTION
   ============================================ */
function setActiveNavLink() {
  const currentPage = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && currentPage.includes(href.replace('.html', ''))) {
      link.classList.add('active');
    }
  });
}

/* ============================================
   COIN VALUE UPDATE WITH ANIMATION
   ============================================ */
function updateNavCoins(newValue, animate = true) {
  const chip = document.getElementById('navCoinsChip');
  const valueEl = document.getElementById('navCoinsValue');

  if (!chip || !valueEl) return;

  valueEl.textContent = newValue;

  if (animate) {
    chip.classList.remove('coin-added');
    void chip.offsetWidth; // Force reflow to restart animation
    chip.classList.add('coin-added');
    setTimeout(() => chip.classList.remove('coin-added'), 400);
  }
}