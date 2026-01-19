// Quiz JavaScript with Full Supabase Integration

console.log('📝 Quiz.js loaded');

// Check authentication
(async function() {
  console.log('🔒 Checking authentication...');
  if (window.eduplay && window.eduplay.checkAuth) {
    await window.eduplay.checkAuth();
  }
})();

// Quiz data for different modules
const quizData = {
  mathematics: {
    title: '🧮 Mathematics Quiz',
    questions: [
      { question: 'What is 15 + 27?', options: ['32', '42', '52', '62'], correct: 1 },
      { question: 'What is 8 × 7?', options: ['54', '56', '58', '60'], correct: 1 },
      { question: 'What is 100 - 45?', options: ['45', '50', '55', '60'], correct: 2 },
      { question: 'What is 12 ÷ 4?', options: ['2', '3', '4', '5'], correct: 1 },
      { question: 'What is the next number: 2, 4, 6, 8, __?', options: ['9', '10', '11', '12'], correct: 1 },
      { question: 'What is 25 + 35?', options: ['50', '55', '60', '65'], correct: 2 },
      { question: 'If you have 3 bags with 5 apples each, how many apples?', options: ['10', '12', '15', '18'], correct: 2 },
      { question: 'What is 9 × 9?', options: ['72', '81', '90', '99'], correct: 1 },
      { question: 'What is half of 50?', options: ['20', '25', '30', '35'], correct: 1 },
      { question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], correct: 2 }
    ]
  },
  english: {
    title: '📖 English Quiz',
    questions: [
      { question: 'What is the plural of "child"?', options: ['childs', 'children', 'childrens', 'childer'], correct: 1 },
      { question: 'Which word is a verb?', options: ['happy', 'run', 'beautiful', 'cat'], correct: 1 },
      { question: 'What is the opposite of "hot"?', options: ['warm', 'cool', 'cold', 'freezing'], correct: 2 },
      { question: 'Which sentence is correct?', options: ['She go to school', 'She goes to school', 'She going to school', 'She gone to school'], correct: 1 },
      { question: 'What is a synonym for "happy"?', options: ['sad', 'angry', 'joyful', 'tired'], correct: 2 },
      { question: 'Which word is an adjective?', options: ['quickly', 'run', 'beautiful', 'eat'], correct: 2 },
      { question: 'What is the past tense of "eat"?', options: ['eated', 'ate', 'eaten', 'eating'], correct: 1 },
      { question: 'Which word rhymes with "cat"?', options: ['dog', 'hat', 'cup', 'pen'], correct: 1 },
      { question: 'What is the plural of "mouse"?', options: ['mouses', 'mice', 'mouse', 'meese'], correct: 1 },
      { question: 'Which is a complete sentence?', options: ['Running fast', 'The dog barks', 'In the park', 'Very happy'], correct: 1 }
    ]
  },
  'general-knowledge': {
    title: '🌍 General Knowledge Quiz',
    questions: [
      { question: 'What is the largest planet in our solar system?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correct: 2 },
      { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: 2 },
      { question: 'What color is made by mixing red and blue?', options: ['Green', 'Purple', 'Orange', 'Brown'], correct: 1 },
      { question: 'How many days are in a week?', options: ['5', '6', '7', '8'], correct: 2 },
      { question: 'What do bees make?', options: ['Milk', 'Honey', 'Butter', 'Cheese'], correct: 1 },
      { question: 'Which animal is "King of the Jungle"?', options: ['Tiger', 'Elephant', 'Lion', 'Bear'], correct: 2 },
      { question: 'What is the capital of France?', options: ['London', 'Paris', 'Rome', 'Berlin'], correct: 1 },
      { question: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], correct: 1 },
      { question: 'What do plants need to make food?', options: ['Darkness', 'Sunlight', 'Snow', 'Wind'], correct: 1 },
      { question: 'Which season comes after winter?', options: ['Summer', 'Fall', 'Spring', 'Autumn'], correct: 2 }
    ]
  }
};

// Quiz state
let currentModule = '';
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let selectedAnswer = null;

// Initialize quiz
function initializeQuiz() {
  console.log('🎯 Initializing quiz...');
  
  const urlParams = new URLSearchParams(window.location.search);
  currentModule = urlParams.get('module') || 'mathematics';
  
  console.log('📚 Module:', currentModule);
  
  const moduleData = quizData[currentModule];
  if (!moduleData) {
    console.error('❌ Invalid module');
    window.location.href = 'dashboard.html';
    return;
  }
  
  currentQuestions = [...moduleData.questions];
  document.getElementById('quizTitle').textContent = moduleData.title;
  
  setTimeout(() => {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('quizContent').style.display = 'block';
    loadQuestion();
  }, 1500);
}

// Load current question
function loadQuestion() {
  if (currentQuestionIndex >= currentQuestions.length) {
    showResults();
    return;
  }
  
  const question = currentQuestions[currentQuestionIndex];
  selectedAnswer = null;
  
  const progress = ((currentQuestionIndex) / currentQuestions.length) * 100;
  document.getElementById('progressBar').style.width = progress + '%';
  document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
  document.getElementById('questionText').textContent = question.question;
  
  const optionsContainer = document.getElementById('optionsContainer');
  optionsContainer.innerHTML = question.options.map((option, index) => 
    `<button class="option-btn" onclick="selectAnswer(${index})">${option}</button>`
  ).join('');
  
  document.getElementById('feedbackSection').style.display = 'none';
}

// Select answer
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
  
  showFeedback(isCorrect);
}

// Show feedback
function showFeedback(isCorrect) {
  const feedbackSection = document.getElementById('feedbackSection');
  const feedbackMessage = document.getElementById('feedbackMessage');
  
  if (isCorrect) {
    feedbackMessage.textContent = '🎉 Correct! Well done!';
    feedbackMessage.className = 'feedback-message correct';
  } else {
    feedbackMessage.textContent = '❌ Oops! That\'s not quite right.';
    feedbackMessage.className = 'feedback-message incorrect';
  }
  
  feedbackSection.style.display = 'block';
}

// Next question
document.getElementById('nextBtn').addEventListener('click', function() {
  currentQuestionIndex++;
  loadQuestion();
});

// Show results
async function showResults() {
  console.log('📊 Showing results...');
  
  document.getElementById('quizContent').style.display = 'none';
  document.getElementById('resultsScreen').style.display = 'block';
  
  const totalQuestions = currentQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  document.getElementById('finalScore').textContent = score;
  document.getElementById('correctCount').textContent = `${correctAnswers}/${totalQuestions}`;
  document.getElementById('percentage').textContent = percentage + '%';
  
  let icon = '🎉';
  let title = 'Quiz Complete!';
  
  if (percentage === 100) {
    icon = '🏆';
    title = 'Perfect Score! Amazing!';
  } else if (percentage >= 80) {
    icon = '⭐';
    title = 'Excellent Work!';
  } else if (percentage >= 60) {
    icon = '👍';
    title = 'Good Job!';
  } else if (percentage >= 40) {
    icon = '💪';
    title = 'Keep Practicing!';
  } else {
    icon = '📚';
    title = 'Don\'t Give Up!';
  }
  
  document.getElementById('resultIcon').textContent = icon;
  document.getElementById('resultTitle').textContent = title;
  
  // Save results to Supabase
  await saveQuizResults(score, correctAnswers, totalQuestions, percentage);
  
  // Check for achievements
  await checkAchievements(percentage);
}

// Save quiz results to Supabase
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

// Check achievements
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
        const quizCount = user.stats.quizzesCompleted || 0;
        
        if (quizCount === 1) {
          achievements.push('🌟 First Steps Badge Earned!');
        } else if (quizCount === 5) {
          achievements.push('🎓 Quiz Master Badge Earned!');
        } else if (quizCount === 10) {
          achievements.push('⭐ Dedicated Learner Badge Earned!');
        }
        
        const totalPoints = user.stats.totalPoints || 0;
        if (totalPoints >= 500 && totalPoints < 510) {
          achievements.push('💎 Point Collector Badge Earned!');
        }
      }
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
    }
  }
  
  if (achievements.length > 0) {
    achievementDiv.innerHTML = achievements.join('<br>');
    achievementDiv.style.display = 'block';
    console.log('🎉 Achievements:', achievements);
  }
}

// Retake quiz
function retakeQuiz() {
  currentQuestionIndex = 0;
  score = 0;
  correctAnswers = 0;
  selectedAnswer = null;
  
  document.getElementById('resultsScreen').style.display = 'none';
  document.getElementById('quizContent').style.display = 'block';
  
  loadQuestion();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 Quiz page initialized');
  initializeQuiz();
});

console.log('✅ Quiz.js ready');