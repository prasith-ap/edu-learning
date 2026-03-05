/**
 * EduPlay Living Mascot AI Companion System
 * Ollie the 🦉 Wise Owl - Powered by Groq API
 * Enhanced with Interactive Chat Interface
 */

// Initialize namespace
if (!window.eduplay) window.eduplay = {};
window.eduplay.mascot = {};

// Chat storage
window.eduplay.mascot._chatHistory = [];
window.eduplay.mascot._isChatOpen = false;

// ============================================
// FALLBACK MESSAGES
// ============================================

const FALLBACK_MESSAGES = {
  dashboard_load: [
    "Hey [name]! Ready for another adventure today? 🚀",
    "Welcome back [name]! The quizzes missed you! ⭐",
    "Great to see you [name]! Let's learn something awesome! 🦉",
    "Hi [name]! I've been keeping your seat warm! 🌟",
    "You're here [name]! Today's going to be amazing! 🎉",
    "Welcome [name]! Ready to keep your streak going? 🔥",
    "[name] you're back! I was hoping you'd stop by! 💫",
    "Perfect timing [name]! Let's do this! ✨"
  ],
  quiz_complete_high: [
    "Incredible [name]! You're on absolute fire! 🔥",
    "WOW [name]! That score is legendary! 🏆",
    "[name] you are a quiz champion! I'm so proud! 💫",
    "Outstanding [name]! Nothing can stop you now! ⭐",
    "That was PERFECT [name]! Absolutely stellar! 🌟",
    "[name]... that was AMAZING! You crushed it! 💥"
  ],
  quiz_complete_medium: [
    "Great effort [name]! You're getting stronger! 💪",
    "Good job [name]! A little more practice and you'll ace it! 🎯",
    "Nice work [name]! Every quiz makes you smarter! 🧠",
    "[name], you're improving so much! Keep going! 📈",
    "Solid work [name]! You've got this! 👍"
  ],
  quiz_complete_low: [
    "That was tricky [name] but you never gave up! That's what matters! 🌈",
    "Hey [name], hard ones make us stronger! Want to try another? 💪",
    "You're learning [name]! That's the whole point! Try again? 🦉",
    "[name], every expert was once a beginner! Let's try again! 🌱",
    "Nice try [name]! Mixing it up with another subject might help! 🎨"
  ],
  streak_milestone: [
    "[name]! [streak]-day streak?! You're unstoppable! 🔥",
    "WOW [name]! [streak] days straight! That's legendary dedication! 🏆",
    "[name], your [streak]-day streak is absolutely inspiring! 💫",
    "[name] hitting [streak] days straight! You're on fire! ⭐"
  ],
  level_up: [
    "[name] LEVEL UP! 🎉 You're reaching for the stars!",
    "[name] - New Level [currentLevel]?! LEGENDARY! 🏆",
    "🎊 [name], you've leveled up to [currentLevel]! Epic work! 🎊",
    "[name]! Level [currentLevel]! You're a true champion! 👑"
  ],
  mascot_click: [
    "Boo! Did I scare ya? Just checking in! 👀",
    "Hey [name]! Thanks for visiting! Ready to learn? 📚",
    "You know what's awesome? YOU are! Keep it up! 🌟",
    "I've got my eye on you, [name]! Ready to ace something? 🦅",
    "See a typo? That's not an error, it's a feature! Just kidding! 😄",
    "Psst... [name]... want a hint? Pick your toughest subject! 🤫",
    "[name]! Did you know owls can turn their heads 270°? Focus! 🔄"
  ]
};

// ============================================
// UTILITIES & ANIMATIONS
// ============================================

/**
 * Get DOM elements safely
 */
function getElements() {
  return {
    container: document.getElementById('mascotContainer'),
    bubble: document.getElementById('mascotBubble'),
    text: document.getElementById('mascotText'),
    emoji: document.getElementById('mascotEmoji')
  };
}

/**
 * Safely get Groq config
 */
function getGroqConfig() {
  if (!window.EDUPLAY_CONFIG) {
    console.warn('Mascot: EDUPLAY_CONFIG not found');
    return null;
  }
  return {
    endpoint: window.EDUPLAY_CONFIG.GROQ_ENDPOINT,
    model: window.EDUPLAY_CONFIG.GROQ_MODEL,
    apiKey: window.EDUPLAY_CONFIG.GROQ_API_KEY
  };
}

/**
 * Play animation on mascot emoji
 */
function playMascotAnimation(trigger) {
  const { emoji } = getElements();
  if (!emoji) return;

  emoji.classList.remove('animation-active');
  void emoji.offsetWidth; // Trigger reflow
  emoji.classList.add('animation-active');

  let animationClass = 'mascot-bounce';
  switch (trigger) {
    case 'quiz_complete_high':
      animationClass = 'mascot-jump';
      break;
    case 'quiz_complete_low':
      animationClass = 'mascot-shake';
      break;
    case 'level_up':
      animationClass = 'mascot-spin';
      break;
    case 'long_absence':
      animationClass = 'mascot-wave';
      break;
    case 'mascot_click':
      animationClass = 'mascot-wiggle';
      break;
    default:
      animationClass = 'mascot-bounce';
  }

  emoji.classList.add(animationClass);
  setTimeout(() => {
    emoji.classList.remove(animationClass, 'animation-active');
  }, 1000);
}

/**
 * Show loading state with pulsing dots
 */
function showLoadingState() {
  const { bubble, text } = getElements();
  if (!bubble || !text) return;

  bubble.classList.add('visible');
  text.innerHTML = '<span class="pulse-dots">.</span><span class="pulse-dots">.</span><span class="pulse-dots">.</span>';
}

/**
 * Hide bubble and clear timeout
 */
function hideBubble() {
  const { bubble } = getElements();
  if (!bubble) return;

  if (window.eduplay.mascot._dismissTimeout) {
    clearTimeout(window.eduplay.mascot._dismissTimeout);
    window.eduplay.mascot._dismissTimeout = null;
  }

  bubble.classList.remove('visible');
}

// ============================================
// TYPEWRITER REVEAL
// ============================================

/**
 * Typewriter text reveal animation
 */
window.eduplay.mascot.typewriterReveal = function (element, text, speed = 40) {
  if (!element) return;

  const { emoji } = getElements();

  // Clear element
  element.textContent = '';

  // Start typing animation on emoji
  if (emoji) {
    emoji.classList.add('typing-animation');
  }

  // Split into characters
  const chars = text.split('');
  let index = 0;

  const interval = setInterval(() => {
    if (index < chars.length) {
      element.textContent += chars[index];
      index++;
    } else {
      clearInterval(interval);
      // Stop typing animation
      if (emoji) {
        emoji.classList.remove('typing-animation');
      }
    }
  }, speed);
};

// ============================================
// GROQ MESSAGE GENERATION
// ============================================

/**
 * Generate personalized mascot message from Groq API
 */
window.eduplay.mascot.generateMascotMessage = async function (context) {
  const config = getGroqConfig();
  if (!config || !config.endpoint || !config.apiKey) {
    console.warn('Mascot: Groq config incomplete, using fallback');
    return null;
  }

  // Build user prompt based on trigger
  let userPrompt = buildUserPrompt(context);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are Ollie, a wise and enthusiastic owl mascot for EduPlay,
a learning platform for children aged 6-12. Your job is to 
encourage and motivate children in 1-2 short sentences.

Rules:
- Always use the child's name naturally
- Be warm, excited, and encouraging — never negative
- Reference their actual performance data specifically
- End with either a question, action suggestion, or emoji
- Maximum 35 words total
- Simple vocabulary for ages 6-12
- Never mention you are an AI
- Sound like an excited friend, not a teacher
- Vary your opening so you never start the same way twice`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.85,
        max_tokens: 120
      })
    });

    if (!response.ok) {
      console.warn('Mascot: Groq API error, using fallback');
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (message) {
      return message;
    }

    return null;
  } catch (error) {
    console.warn('Mascot: API call failed:', error);
    return null;
  }
};

/**
 * Build user prompt based on context trigger
 */
function buildUserPrompt(context) {
  const { username, trigger, score, percentage, module, streak, totalPoints,
    daysSinceLastLogin, weakSubjects = [], strongSubjects = [],
    quizzesCompleted, currentLevel } = context;

  switch (trigger) {
    case 'dashboard_load':
      return `Child: ${username}
Days since last login: ${daysSinceLastLogin}
Current streak: ${streak} days
Total points: ${totalPoints}
Level: ${currentLevel}
Weak subjects: ${weakSubjects.join(', ') || 'none identified'}
Strong subjects: ${strongSubjects.join(', ') || 'all areas'}
Quizzes completed: ${quizzesCompleted}

Generate a personalised welcome message.
If daysSinceLastLogin > 3: acknowledge their return warmly.
If streak > 3: celebrate the streak.
If weakSubjects exists: gently suggest practicing it.
If quizzesCompleted === 0: encourage them to try their first quiz.`;

    case 'quiz_complete':
      return `Child: ${username}
Subject just completed: ${module}
Score: ${score} points
Accuracy: ${percentage}%
Current streak: ${streak}
Strong at: ${strongSubjects.join(', ') || 'growing in everything'}
Weak at: ${weakSubjects.join(', ') || 'none identified'}

Generate post-quiz feedback.
If percentage >= 90: be extremely celebratory and specific.
If percentage >= 70: be proud and suggest trying harder next time.
If percentage >= 50: be encouraging, mention improvement.
If percentage < 50: be gentle, focus on effort not score, suggest they try a different subject for variety.`;

    case 'streak_milestone':
      return `Child: ${username} just reached a ${streak}-day login streak.
Total points: ${totalPoints}
Generate a short streak celebration message.`;

    case 'level_up':
      return `Child: ${username} just reached level: ${currentLevel}
Total points: ${totalPoints}
Generate a level-up celebration — make it feel epic but age-appropriate.`;

    case 'mascot_click':
      return `Child: ${username} just clicked on the mascot owl for a chat.
Current streak: ${streak}
Level: ${currentLevel}
Generate a fun, random greeting or encouragement.
Vary widely — can be a fun fact, a joke, or a pep talk.`;

    default:
      return `Child: ${username}\nGenerate a friendly greeting.`;
  }
}

/**
 * Get random fallback message for trigger
 */
function getFallbackMessage(trigger, context) {
  let messageKey = trigger;

  // Map quiz_complete to high/medium/low based on percentage
  if (trigger === 'quiz_complete') {
    const percentage = context.percentage || 0;
    if (percentage >= 80) {
      messageKey = 'quiz_complete_high';
    } else if (percentage >= 50) {
      messageKey = 'quiz_complete_medium';
    } else {
      messageKey = 'quiz_complete_low';
    }
  }

  const messages = FALLBACK_MESSAGES[messageKey] || FALLBACK_MESSAGES.dashboard_load;
  const message = messages[Math.floor(Math.random() * messages.length)];

  // Replace [name] with username
  return message.replace(/\[name\]/g, context.username)
    .replace(/\[streak\]/g, context.streak)
    .replace(/\[currentLevel\]/g, context.currentLevel);
}

// ============================================
// MAIN SPEAK FUNCTION
// ============================================

/**
 * Main entry point: make mascot speak with AI-generated message
 */
window.eduplay.mascot.speak = async function (context) {
  const { bubble, text, emoji } = getElements();

  if (!bubble || !text) {
    console.warn('Mascot: DOM elements not found');
    return;
  }

  // Show loading state
  showLoadingState();

  // Try to get Groq message, fall back if needed
  let message = await window.eduplay.mascot.generateMascotMessage(context);

  if (!message) {
    message = getFallbackMessage(context.trigger, context);
  }

  // Reveal message with typewriter effect
  window.eduplay.mascot.typewriterReveal(text, message, 40);

  // Play animation based on trigger
  playMascotAnimation(context.trigger);

  // Auto-dismiss after 7 seconds
  if (window.eduplay.mascot._dismissTimeout) {
    clearTimeout(window.eduplay.mascot._dismissTimeout);
  }

  window.eduplay.mascot._dismissTimeout = setTimeout(() => {
    hideBubble();
    window.eduplay.mascot._dismissTimeout = null;
  }, 7000);
};

/**
 * Dismiss mascot bubble
 */
window.eduplay.mascot.dismiss = function () {
  hideBubble();
};

/**
 * Initialize mascot system (call after page load)
 */
window.eduplay.mascot.init = function () {
  const { emoji } = getElements();

  if (!emoji) {
    console.warn('Mascot: Emoji element not found, skipping init');
    return;
  }

  // Add click listener to emoji - OPEN CHAT
  emoji.addEventListener('click', () => {
    window.eduplay.mascot.openChat();
  });

  console.log('Mascot system initialized');
};

/**
 * Open interactive chat window
 */
window.eduplay.mascot.openChat = function () {
  if (window.eduplay.mascot._isChatOpen) return; // Already open

  window.eduplay.mascot._isChatOpen = true;

  createChatWindow();
  sendGreetingMessage();
};

/**
 * Create chat modal window
 */
function createChatWindow() {
  // Check if already exists
  if (document.getElementById('mascotChatWindow')) {
    return;
  }

  const chatWindow = document.createElement('div');
  chatWindow.id = 'mascotChatWindow';
  chatWindow.className = 'mascot-chat-window';

  chatWindow.innerHTML = `
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="chat-header-content">
          <span class="chat-mascot-emoji">🦉</span>
          <div class="chat-header-text">
            <h3>Ollie's Chat</h3>
            <p class="chat-status">Online & Ready! 💫</p>
          </div>
        </div>
        <button class="chat-close" onclick="window.eduplay.mascot.closeChat()">✕</button>
      </div>

      <!-- Chat Messages Area -->
      <div class="chat-messages" id="chatMessages">
        <!-- Messages will appear here -->
      </div>

      <!-- Chat Input -->
      <div class="chat-input-container">
        <input 
          type="text" 
          id="chatInput" 
          class="chat-input" 
          placeholder="Say something to Ollie... 💬"
          onkeypress="if(event.key==='Enter') window.eduplay.mascot.sendMessage()"
        >
        <button class="chat-send-btn" onclick="window.eduplay.mascot.sendMessage()">
          <span>Send</span>
          <span class="send-emoji">✈️</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(chatWindow);

  // Focus input after animation
  setTimeout(() => {
    const input = document.getElementById('chatInput');
    if (input) input.focus();
  }, 300);
}

/**
 * Send greeting message based on user performance
 */
async function sendGreetingMessage() {
  const userData = window.eduplay?.currentUser || {};
  const username = userData.username || 'Friend';
  const stats = userData.stats || {};

  // Delay for chat to appear
  await new Promise(r => setTimeout(r, 300));

  // Build greeting based on performance
  let greeting = '';

  const quizzesCompleted = stats.quizzesCompleted || 0;
  const totalPoints = stats.totalPoints || 0;
  const history = stats.history || [];

  if (quizzesCompleted === 0) {
    greeting = `Hey ${username}! 👋 I'm Ollie! Ready to take your first quiz? You've got this! 🚀`;
  } else if (quizzesCompleted === 1) {
    greeting = `Welcome ${username}! 🎉 I see you completed your first quiz! That's awesome! Let's keep the momentum! 💪`;
  } else if (totalPoints > 1000) {
    greeting = `🌟 ${username}! You're an absolute STAR! ${totalPoints} points?! That's incredible! How can I help you today? 🏆`;
  } else if (history.length > 0) {
    const avgScore = Math.round(
      history.reduce((sum, q) => sum + (q.percentage || 0), 0) / history.length
    );
    if (avgScore >= 80) {
      greeting = `${username}! Your average is ${avgScore}%! 🌟 You're crushing it! What would you like to chat about?`;
    } else if (avgScore >= 60) {
      greeting = `Hey ${username}! You're doing great with ${avgScore}% average! 📈 Keep practicing, you're on your way! 💫`;
    } else {
      greeting = `${username}! I believe in you! 💛 Every quiz makes you smarter. What can I help you with today?`;
    }
  } else {
    greeting = `Hi ${username}! 🦉 I'm Ollie, your learning buddy! Ask me anything or tell me about your day! 😊`;
  }

  addChatMessage('ollie', greeting);
}

/**
 * Send user message
 */
window.eduplay.mascot.sendMessage = async function () {
  const input = document.getElementById('chatInput');
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  // Add user message to chat
  addChatMessage('user', message);
  input.value = '';
  input.focus();

  // Show typing indicator
  addChatMessage('ollie', '🦉 typing...', true);

  // Get AI response
  const response = await getAIResponse(message);

  // Remove typing indicator and add response
  removeChatMessage('typing');
  addChatMessage('ollie', response);
};

/**
 * Add message to chat
 */
function addChatMessage(sender, text, isTyping = false) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${sender}-message`;
  if (isTyping) messageEl.id = 'typing';

  if (sender === 'ollie') {
    messageEl.innerHTML = `
      <div class="message-bubble ollie-bubble">
        <span class="bubble-emoji">🦉</span>
        <div class="bubble-text">${text}</div>
      </div>
    `;
  } else {
    messageEl.innerHTML = `
      <div class="message-bubble user-bubble">
        <div class="bubble-text">${text}</div>
        <span class="bubble-emoji">😊</span>
      </div>
    `;
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Remove message by ID
 */
function removeChatMessage(id) {
  const msg = document.getElementById(id);
  if (msg) msg.remove();
}

/**
 * Get AI response from Groq
 */
async function getAIResponse(userMessage) {
  const config = getGroqConfig();
  if (!config || !config.endpoint || !config.apiKey) {
    return getRandomEncouragement();
  }

  const userData = window.eduplay?.currentUser || {};
  const username = userData.username || 'Friend';
  const stats = userData.stats || {};

  const systemPrompt = `You are Ollie, a wise and helpful owl mascot for EduPlay, 
a learning platform for children aged 6-12. You're friendly, educational, and fun!
Your main job is to answer the child's questions, help them solve problems, and explain concepts clearly.

About ${username}:
- Quizzes completed: ${stats.quizzesCompleted || 0}
- Total points: ${stats.totalPoints || 0}
- Badges: ${stats.badges ? stats.badges.length : 0}

Rules:
- Answer their questions directly and correctly
- If they ask you to solve something, solve it and explain how
- Keep responses clear and informative enough to be helpful
- Use emojis frequently 😊✨🚀
- Be enthusiastic and encouraging
- Never be negative
- Use their name naturally
- Sound like a helpful tutor and fun friend
- Simple vocabulary for ages 6-12`;

  const userPrompt = `${username} says: "${userMessage}"

Respond as Ollie! Answer their query accurately, be helpful, educational, and fun!`;

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      return getRandomEncouragement();
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();
    return message || getRandomEncouragement();

  } catch (error) {
    console.warn('Mascot chat: API error:', error);
    return getRandomEncouragement();
  }
}

/**
 * Get random encouraging message
 */
function getRandomEncouragement() {
  const messages = [
    "That's awesome! 🌟 Keep up the great work!",
    "You're amazing! 💪 I believe in you!",
    "That's so cool! 🎉 Tell me more!",
    "Wow! You're such a star! ⭐ How did you do that?",
    "I love your energy! 🚀 Keep shining!",
    "You're doing fantastic! 🏆 You've got this!",
    "That makes me so happy! 💛 You're wonderful!",
    "Best answer ever! 🦉 You're brilliant!",
    "Yes yes yes! 🎊 Love the positivity!",
    "You're a hero! 🦸 Seriously amazing!"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Close chat window
 */
window.eduplay.mascot.closeChat = function () {
  const chatWindow = document.getElementById('mascotChatWindow');
  if (chatWindow) {
    chatWindow.classList.add('closing');
    setTimeout(() => {
      chatWindow.remove();
      window.eduplay.mascot._isChatOpen = false;
    }, 300);
  }
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.eduplay.mascot.init);
} else {
  window.eduplay.mascot.init();
}
