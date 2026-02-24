// Quiz JavaScript - Questions loaded from Supabase
// Shows 10 randomly shuffled questions per session from a pool of 30

console.log('📝 Quiz.js loaded');

// Quiz state
let currentModule = '';
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let selectedAnswer = null;

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick n random items from arr (non-destructive) */
function pickRandom(arr, n) {
  return shuffleArray([...arr]).slice(0, n);
}

// ─── Supabase Loader ──────────────────────────────────────────────────────────

async function loadQuestionsFromSupabase(module) {
  console.log('🔄 Loading questions from Supabase for module:', module);

  const client = window.eduplay ? window.eduplay.getSupabase() : null;
  if (!client) {
    throw new Error('Supabase client not available. Please refresh the page.');
  }

  const { data, error } = await client
    .from('quiz_questions')
    .select('question, options, correct_index')
    .eq('module', module)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ Error loading questions:', error);
    throw new Error('Failed to load quiz questions. Please try again.');
  }

  if (!data || data.length === 0) {
    throw new Error('No questions found for this module. Please run the SQL seed first.');
  }

  console.log(`✅ Loaded ${data.length} questions from Supabase`);

  // Normalise: options may be JSON array from Supabase
  return data.map(row => ({
    question: row.question,
    options: Array.isArray(row.options) ? row.options : JSON.parse(row.options),
    correct: row.correct_index
  }));
}

// ─── Module meta (titles / colours) ──────────────────────────────────────────

const MODULE_META = {
  mathematics: { title: 'Mathematics Quiz', emoji: '🔢' },
  english: { title: 'English Quiz', emoji: '📚' },
  'general-knowledge': { title: 'General Knowledge Quiz', emoji: '🌍' }
};

// ─── Initialize Quiz ──────────────────────────────────────────────────────────

async function initializeQuiz() {
  console.log('🎯 Initializing quiz...');

  const urlParams = new URLSearchParams(window.location.search);
  currentModule = urlParams.get('module') || 'mathematics';
  console.log('📚 Module:', currentModule);

  const meta = MODULE_META[currentModule];
  if (!meta) {
    console.error('❌ Invalid module:', currentModule);
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('quizTitle').textContent = meta.title;

  try {
    const allQuestions = await loadQuestionsFromSupabase(currentModule);

    // Pick 10 random shuffled questions from the pool of 30
    currentQuestions = pickRandom(allQuestions, 10);

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    loadQuestion();

  } catch (err) {
    console.error('❌ Quiz initialization failed:', err);
    document.getElementById('loadingScreen').innerHTML = `
      <div style="color: var(--error); padding: 32px; text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 16px;">⚠️</div>
        <p style="font-weight: 600;">${err.message}</p>
        <a href="dashboard.html" class="btn btn-outline" style="margin-top: 16px;">Back to Dashboard</a>
      </div>`;
  }
}

// ─── Load Question ─────────────────────────────────────────────────────────────

function loadQuestion() {
  if (currentQuestionIndex >= currentQuestions.length) {
    showResults();
    return;
  }

  const question = currentQuestions[currentQuestionIndex];
  selectedAnswer = null;

  const progress = (currentQuestionIndex / currentQuestions.length) * 100;
  document.getElementById('progressBar').style.width = progress + '%';
  document.getElementById('questionCounter').textContent =
    `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
  document.getElementById('questionText').textContent = question.question;

  const optionsContainer = document.getElementById('optionsContainer');
  optionsContainer.innerHTML = question.options.map((option, index) =>
    `<button class="option-btn" onclick="selectAnswer(${index})">${option}</button>`
  ).join('');

  document.getElementById('feedbackSection').style.display = 'none';
}

// ─── Select Answer ────────────────────────────────────────────────────────────

function selectAnswer(index) {
  if (selectedAnswer !== null) return;

  selectedAnswer = index;
  const question = currentQuestions[currentQuestionIndex];
  const isCorrect = index === question.correct;

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === question.correct) btn.classList.add('correct');
    else if (i === index && !isCorrect) btn.classList.add('incorrect');
    if (i === index) btn.classList.add('selected');
  });

  if (isCorrect) {
    correctAnswers++;
    score += 10;
  }

  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
  showFeedback(isCorrect);
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

function showFeedback(isCorrect) {
  const feedbackSection = document.getElementById('feedbackSection');
  const feedbackMessage = document.getElementById('feedbackMessage');

  if (isCorrect) {
    feedbackMessage.innerHTML = '🎉 <strong>Correct!</strong> Well done!';
    feedbackMessage.style.color = 'var(--success)';
  } else {
    const correctOption = currentQuestions[currentQuestionIndex].options[
      currentQuestions[currentQuestionIndex].correct
    ];
    feedbackMessage.innerHTML = `❌ <strong>Oops!</strong> The correct answer was: <em>${correctOption}</em>`;
    feedbackMessage.style.color = 'var(--error)';
  }

  feedbackSection.style.display = 'block';
}

// Next question button
document.getElementById('nextBtn').addEventListener('click', function () {
  currentQuestionIndex++;
  loadQuestion();
});

// ─── Results ──────────────────────────────────────────────────────────────────

async function showResults() {
  console.log('📊 Showing results...');

  document.getElementById('quizContent').style.display = 'none';
  document.getElementById('resultsScreen').style.display = 'block';

  const totalQuestions = currentQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  document.getElementById('finalScore').textContent = score;
  document.getElementById('correctCount').textContent = `${correctAnswers}/${totalQuestions}`;
  document.getElementById('percentage').textContent = percentage + '%';

  // Result title based on score
  let icon = '🎉';
  let title = 'Quiz Complete!';

  if (percentage === 100) {
    icon = '🏆'; title = 'Perfect Score! Amazing!';
  } else if (percentage >= 80) {
    icon = '⭐'; title = 'Excellent Work!';
  } else if (percentage >= 60) {
    icon = '👍'; title = 'Good Job!';
  } else if (percentage >= 40) {
    icon = '💪'; title = 'Keep Practicing!';
  } else {
    icon = '📚'; title = "Don't Give Up!";
  }

  // Update result title (icon + title in one element)
  document.getElementById('resultTitle').textContent = `${icon} ${title}`;

  // Save results to Supabase
  await saveQuizResults(score, correctAnswers, totalQuestions, percentage);

  // Check for achievements
  await checkAchievements(percentage);
}

// ─── Save Results ─────────────────────────────────────────────────────────────

async function saveQuizResults(finalScore, correct, total, percentage) {
  console.log('💾 Saving quiz results to Supabase...');

  if (!window.eduplay || !window.eduplay.saveQuizResult) {
    console.error('❌ eduplay not available');
    return;
  }

  try {
    await window.eduplay.saveQuizResult({
      module: currentModule,
      score: finalScore,
      correct: correct,
      total: total,
      percentage: percentage
    });
    console.log('✅ Quiz results saved successfully');
  } catch (error) {
    console.error('❌ Error saving quiz results:', error);
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────────

async function checkAchievements(percentage) {
  console.log('🎖️ Checking achievements...');

  const achievementDiv = document.getElementById('achievementNotification');
  const achievements = [];

  if (percentage === 100) {
    achievements.push('🏆 Perfect Score Achievement Unlocked!');
  } else if (percentage >= 90) {
    achievements.push('⭐ High Scorer Achievement Unlocked!');
  }

  if (window.eduplay && window.eduplay.getCurrentUser) {
    try {
      const user = await window.eduplay.getCurrentUser();
      if (user && user.stats) {
        const quizCount = (user.stats.quizzesCompleted || 0) + 1; // +1 because this quiz just finished

        if (quizCount === 1) achievements.push('🌟 First Steps Badge Earned!');
        else if (quizCount === 5) achievements.push('🎓 Quiz Master Badge Earned!');
        else if (quizCount === 10) achievements.push('⭐ Dedicated Learner Badge Earned!');

        const totalPoints = (user.stats.totalPoints || 0) + score;
        if (totalPoints >= 500 && (totalPoints - score) < 500) {
          achievements.push('💎 Point Collector Badge Earned!');
        }
      }
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
    }
  }

  if (achievements.length > 0) {
    achievementDiv.innerHTML = `
      <div style="background: var(--bg-blue-light); border: 1px solid var(--primary-light);
                  border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">🎊 Achievements!</div>
        ${achievements.map(a => `<div style="margin: 4px 0;">${a}</div>`).join('')}
      </div>`;
    achievementDiv.style.display = 'block';
    console.log('🎉 Achievements unlocked:', achievements);
  }
}

// ─── Retake ───────────────────────────────────────────────────────────────────

function retakeQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  correctAnswers = 0;
  selectedAnswer = null;

  document.getElementById('resultsScreen').style.display = 'none';
  document.getElementById('loadingScreen').innerHTML = '<p>Shuffling new questions...</p>';
  document.getElementById('loadingScreen').style.display = 'block';
  document.getElementById('quizContent').style.display = 'none';

  // Re-load and re-shuffle questions for a fresh set
  loadQuestionsFromSupabase(currentModule).then(allQuestions => {
    currentQuestions = pickRandom(allQuestions, 10);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    loadQuestion();
  }).catch(err => {
    console.error('Error reloading questions:', err);
    // Fallback: just replay existing questions reshuffled
    currentQuestions = shuffleArray([...currentQuestions]);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    loadQuestion();
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  console.log('🎯 Quiz page initialized');
  initializeQuiz();
});

console.log('✅ Quiz.js ready');