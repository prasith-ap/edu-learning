// Dashboard JavaScript with Supabase Integration

console.log('📊 Dashboard.js loaded');

// Check authentication immediately
(async function() {
  console.log('🔒 Checking authentication...');
  if (window.eduplay && window.eduplay.checkAuth) {
    await window.eduplay.checkAuth();
  }
})();

// Badge definitions
const BADGES = {
  'first_quiz': { name: 'First Steps', icon: '🌟', description: 'Complete your first quiz' },
  'quiz_master_5': { name: 'Quiz Master', icon: '🎓', description: 'Complete 5 quizzes' },
  'perfect_score': { name: 'Perfect!', icon: '💯', description: 'Get 100% on a quiz' },
  'high_scorer': { name: 'High Scorer', icon: '🏆', description: 'Score 90%+ on a quiz' },
  'math_whiz': { name: 'Math Whiz', icon: '🧮', description: 'Complete 3 math quizzes' },
  'word_master': { name: 'Word Master', icon: '📖', description: 'Complete 3 English quizzes' },
  'knowledge_seeker': { name: 'Knowledge Seeker', icon: '🌍', description: 'Complete 3 GK quizzes' },
  'dedicated_learner': { name: 'Dedicated', icon: '⭐', description: 'Complete 10 quizzes' },
  'point_collector': { name: 'Point Collector', icon: '💎', description: 'Earn 500 points' }
};

// Load user data from Supabase
async function loadUserData() {
  console.log('👤 Loading user data...');
  
  try {
    const user = window.eduplay ? await window.eduplay.getCurrentUser() : null;
    
    if (!user) {
      console.log('❌ No user found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }
    
    console.log('✅ User loaded:', user.username);
    
    // Update welcome message
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
      welcomeMsg.textContent = `🌟 Welcome back, ${user.username}! 🌟`;
    }
    
    // Update user info in navbar
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
      userInfo.textContent = `👤 ${user.username}`;
    }
    
    // Update stats
    const stats = user.stats || {
      totalPoints: 0,
      badges: [],
      quizzesCompleted: 0,
      history: []
    };
    
    console.log('📊 Stats:', stats);
    
    document.getElementById('totalPoints').textContent = stats.totalPoints || 0;
    document.getElementById('badgesCount').textContent = stats.badges ? stats.badges.length : 0;
    document.getElementById('quizzesCompleted').textContent = stats.quizzesCompleted || 0;
    
    // Calculate average score
    let avgScore = 0;
    if (stats.history && stats.history.length > 0) {
      const totalScore = stats.history.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0);
      avgScore = Math.round(totalScore / stats.history.length);
    }
    document.getElementById('avgScore').textContent = avgScore + '%';
    
    // Display badges
    await loadBadges(stats.badges || []);
    
    // Check and award new badges
    await checkAndAwardBadges(user);
    
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    window.location.href = 'login.html';
  }
}

// Load badges from Supabase
async function loadBadges(badges) {
  console.log('🏆 Loading badges:', badges.length);
  
  const badgesContainer = document.getElementById('badgesContainer');
  
  if (!badges || badges.length === 0) {
    badgesContainer.innerHTML = `
      <div class="no-badges">
        <p>Complete quizzes to earn your first badge! 🎯</p>
      </div>
    `;
    return;
  }
  
  badgesContainer.innerHTML = badges.map(badge => `
    <div class="badge-item" title="${badge.description || badge.name}">
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
    </div>
  `).join('');
  
  console.log('✅ Badges displayed:', badges.length);
}

// Check and award badges based on user progress
async function checkAndAwardBadges(user) {
  console.log('🎖️ Checking for new badges...');
  
  const stats = user.stats || {};
  const currentBadges = stats.badges || [];
  const badgeIds = currentBadges.map(b => b.badge_id || b.id);
  const newBadges = [];
  
  // Check quiz completion badges
  if (stats.quizzesCompleted >= 1 && !badgeIds.includes('first_quiz')) {
    newBadges.push({ ...BADGES.first_quiz, id: 'first_quiz' });
  }
  
  if (stats.quizzesCompleted >= 5 && !badgeIds.includes('quiz_master_5')) {
    newBadges.push({ ...BADGES.quiz_master_5, id: 'quiz_master_5' });
  }
  
  if (stats.quizzesCompleted >= 10 && !badgeIds.includes('dedicated_learner')) {
    newBadges.push({ ...BADGES.dedicated_learner, id: 'dedicated_learner' });
  }
  
  // Check points badge
  if (stats.totalPoints >= 500 && !badgeIds.includes('point_collector')) {
    newBadges.push({ ...BADGES.point_collector, id: 'point_collector' });
  }
  
  // Check performance badges
  if (stats.history && stats.history.length > 0) {
    const hasPerfectScore = stats.history.some(q => q.percentage === 100);
    if (hasPerfectScore && !badgeIds.includes('perfect_score')) {
      newBadges.push({ ...BADGES.perfect_score, id: 'perfect_score' });
    }
    
    const hasHighScore = stats.history.some(q => q.percentage >= 90);
    if (hasHighScore && !badgeIds.includes('high_scorer')) {
      newBadges.push({ ...BADGES.high_scorer, id: 'high_scorer' });
    }
    
    // Module-specific badges
    const mathQuizzes = stats.history.filter(q => q.module === 'mathematics').length;
    if (mathQuizzes >= 3 && !badgeIds.includes('math_whiz')) {
      newBadges.push({ ...BADGES.math_whiz, id: 'math_whiz' });
    }
    
    const englishQuizzes = stats.history.filter(q => q.module === 'english').length;
    if (englishQuizzes >= 3 && !badgeIds.includes('word_master')) {
      newBadges.push({ ...BADGES.word_master, id: 'word_master' });
    }
    
    const gkQuizzes = stats.history.filter(q => q.module === 'general-knowledge').length;
    if (gkQuizzes >= 3 && !badgeIds.includes('knowledge_seeker')) {
      newBadges.push({ ...BADGES.knowledge_seeker, id: 'knowledge_seeker' });
    }
  }
  
  // Save new badges to Supabase
  if (newBadges.length > 0) {
    console.log('🎉 New badges earned:', newBadges.length);
    
    if (window.eduplay && window.eduplay.saveBadge) {
      for (const badge of newBadges) {
        await window.eduplay.saveBadge(badge);
        console.log('✅ Badge saved:', badge.name);
      }
      
      // Reload user data to show new badges
      await loadUserData();
    }
  } else {
    console.log('✓ No new badges to award');
  }
  
  return newBadges;
}

// Start quiz function
function startQuiz(module) {
  console.log('🚀 Starting quiz:', module);
  window.location.href = `quiz.html?module=${module}`;
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎯 Dashboard initialized');
  await loadUserData();
});

console.log('✅ Dashboard.js ready');