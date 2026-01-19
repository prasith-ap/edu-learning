// Progress JavaScript with Supabase Integration

console.log('📊 Progress.js loaded');

// Check authentication
(async function() {
  console.log('🔒 Checking authentication...');
  if (window.eduplay && window.eduplay.checkAuth) {
    await window.eduplay.checkAuth();
  }
})();

// Module names mapping
const moduleNames = {
  'mathematics': '🧮 Mathematics',
  'english': '📖 English',
  'general-knowledge': '🌍 General Knowledge'
};

// Load progress data from Supabase
async function loadProgressData() {
  console.log('📈 Loading progress data...');
  
  try {
    const user = window.eduplay ? await window.eduplay.getCurrentUser() : null;
    
    if (!user) {
      console.log('❌ No user found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }
    
    console.log('✅ User loaded:', user.username);
    
    // Update user info in navbar
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
      userInfo.textContent = `👤 ${user.username}`;
    }
    
    // Get stats
    const stats = user.stats || {
      totalPoints: 0,
      quizzesCompleted: 0,
      history: []
    };
    
    console.log('📊 Stats:', stats);
    
    // Update summary stats
    document.getElementById('totalPoints').textContent = stats.totalPoints || 0;
    document.getElementById('totalQuizzes').textContent = stats.quizzesCompleted || 0;
    
    // Calculate average accuracy
    let avgAccuracy = 0;
    if (stats.history && stats.history.length > 0) {
      const totalAccuracy = stats.history.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0);
      avgAccuracy = Math.round(totalAccuracy / stats.history.length);
    }
    document.getElementById('avgCorrect').textContent = avgAccuracy + '%';
    
    // Load quiz history
    loadQuizHistory(stats.history || []);
    
  } catch (error) {
    console.error('❌ Error loading progress data:', error);
    document.getElementById('historyContainer').innerHTML = `
      <div class="error-message">
        <p>Error loading your progress. Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Load quiz history
function loadQuizHistory(history) {
  console.log('📚 Loading quiz history:', history.length, 'quizzes');
  
  const historyContainer = document.getElementById('historyContainer');
  
  if (!history || history.length === 0) {
    historyContainer.innerHTML = `
      <div class="no-badges">
        <p>No quiz history yet. Start taking quizzes to see your progress!</p>
        <br>
        <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  
  // Sort history by date (most recent first)
  const sortedHistory = [...history].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  console.log('✅ Sorted history:', sortedHistory.length, 'items');
  
  // Generate history HTML
  historyContainer.innerHTML = sortedHistory.map((quiz) => {
    const date = new Date(quiz.date);
    const formattedDate = formatDate(date);
    const moduleName = moduleNames[quiz.module] || quiz.module;
    
    // Determine performance grade
    let gradeIcon = '📚';
    let gradeText = 'Keep Learning';
    let gradeClass = '';
    
    if (quiz.percentage === 100) {
      gradeIcon = '🏆';
      gradeText = 'Perfect!';
      gradeClass = 'perfect';
    } else if (quiz.percentage >= 80) {
      gradeIcon = '⭐';
      gradeText = 'Excellent';
      gradeClass = 'excellent';
    } else if (quiz.percentage >= 60) {
      gradeIcon = '👍';
      gradeText = 'Good';
      gradeClass = 'good';
    } else if (quiz.percentage >= 40) {
      gradeIcon = '💪';
      gradeText = 'Keep Trying';
      gradeClass = 'okay';
    }
    
    return `
      <div class="history-item ${gradeClass}">
        <div class="history-info">
          <h3>${moduleName}</h3>
          <p>${formattedDate}</p>
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
          <div class="history-stat">
            <div class="history-stat-value">${gradeIcon}</div>
            <div class="history-stat-label">${gradeText}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Format date to relative time
function formatDate(date) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Initialize progress page
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎯 Progress page initialized');
  await loadProgressData();
});

console.log('✅ Progress.js ready');