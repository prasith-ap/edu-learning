/**
 * Authentication Module for EduPlay
 * Handles user registration, login, logout, and session management
 */

// Supabase client instance
let supabaseClient = null;

/**
 * Initialize Supabase client
 * @returns {Object|null} Supabase client instance
 */
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    showError('Failed to load authentication service. Please refresh the page.');
    return null;
  }

  if (!window.CONFIG) {
    showError('Configuration error. Please check config.js file.');
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = window.supabase.createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY
      );
    } catch (error) {
      showError('Failed to initialize authentication service.');
      return null;
    }
  }

  return supabaseClient;
}

// NOTE: Do NOT call initSupabase() here at top-level.
// It may run before `window.supabase` CDN script has loaded.
// checkAuth() and other async functions will call it themselves.

/**
 * Global Auth State Change Listener (Fix 5)
 * This ensures that cross-tab logouts and expired sessions are handled properly.
 */
// Deferred auth state change listener — runs after DOM is ready so CDN is loaded
document.addEventListener('DOMContentLoaded', () => {
  const client = initSupabase();
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      // Only trigger on explicit logout/deletion, not on transient null during page init
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Session ended — clear everything
        SessionManager.clear();
        sessionStorage.clear();

        // If on a protected page, redirect to login
        const path = window.location.pathname;
        const isProtected =
          path.includes('dashboard') ||
          path.includes('quiz') ||
          path.includes('progress') ||
          path.includes('games') ||
          path.includes('math-blaster') ||
          path.includes('word-bubble') ||
          path.includes('puzzle-quest') ||
          path.includes('memory-flip') ||
          path.includes('speed-typer') ||
          path.includes('profile');

        if (isProtected) {
          // Safe relative navigation
          if (path.includes('/games/')) {
            window.location.replace('../login.html');
          } else {
            window.location.replace('login.html');
          }
        }
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('Session token refreshed');
      }
    });
  }
});

/**
 * Session Management using localStorage for caching user info (Fix 4)
 * DO NOT use isValid() as a primary auth check. Rely on Supabase getSession() instead.
 */
const SessionManager = {
  set: (userId, email, username) => {
    localStorage.setItem('eduplay_user_id', userId);
    localStorage.setItem('eduplay_email', email || '');
    localStorage.setItem('eduplay_username', username || '');
    // 24 hour expiry for cache
    localStorage.setItem('eduplay_session_timestamp', Date.now().toString());
    console.log('💾 Session info cached securely');
  },

  get: () => localStorage.getItem('eduplay_user_id'),
  getEmail: () => localStorage.getItem('eduplay_email'),
  getUsername: () => localStorage.getItem('eduplay_username'),

  clear: () => {
    console.log('🗑️ Clearing session from caches');
    const keys = [
      'eduplay_user_id',
      'eduplay_email',
      'eduplay_username',
      'eduplay_session_timestamp',
      'eduplay_intro_shown',
      'eduplay_mood'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  },

  isValid: () => {
    // Only used to check if CACHED data is fresh enough (24 hours max)
    const userId = localStorage.getItem('eduplay_user_id');
    const timestamp = localStorage.getItem('eduplay_session_timestamp');
    if (!userId || !timestamp) return false;
    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return sessionAge < maxAge;
  }
};

/**
 * UI Helper Functions
 */
function showError(message) {
  console.error('Error:', message);
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.style.display = 'block';

    setTimeout(() => {
      errorDiv.classList.add('hidden');
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

function showSuccess(message) {
  console.log('Success:', message);
  const successDiv = document.getElementById('successMessage');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    successDiv.style.display = 'block';

    setTimeout(() => {
      successDiv.classList.add('hidden');
      successDiv.style.display = 'none';
    }, 3000);
  }
}

function clearMessages() {
  const errorDiv = document.getElementById('errorMessage');
  const successDiv = document.getElementById('successMessage');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
    errorDiv.style.display = 'none';
  }
  if (successDiv) {
    successDiv.classList.add('hidden');
    successDiv.style.display = 'none';
  }
}

function showLoading(button, isLoading) {
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = 'Processing...';
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
}

/**
 * User Registration
 */
function initializeRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    // Add real-time validation to password confirm
    const pwInput = document.getElementById('reg-password-input');
    const confirmInput = document.getElementById('reg-confirm-input');

    if (pwInput && confirmInput) {
      confirmInput.addEventListener('input', function () {
        if (this.value && this.value !== pwInput.value) {
          this.setCustomValidity("Passwords don't match");
          this.classList.add('invalid');
          this.classList.remove('valid');
        } else {
          this.setCustomValidity('');
          if (this.value) {
            this.classList.add('valid');
            this.classList.remove('invalid');
          }
        }
      });
    }

    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMessages();

      const submitBtn = document.getElementById('registerBtn');
      showLoading(submitBtn, true);

      // get inputs dynamically so it handles either simple ID or prefixed ID logic
      const uEl = document.getElementById('username') || document.getElementById('reg-username-input');
      const eEl = document.getElementById('email') || document.getElementById('reg-email-input');
      const aEl = document.getElementById('age') || document.getElementById('reg-age-input');
      const pEl = document.getElementById('password') || document.getElementById('reg-password-input');
      const cEl = document.getElementById('confirmPassword') || document.getElementById('reg-confirm-input');

      const username = uEl ? uEl.value.trim() : '';
      const email = eEl ? eEl.value.trim() : '';
      const ageStr = aEl ? aEl.value.trim() : '';
      const age = parseInt(ageStr);
      const password = pEl ? pEl.value : '';
      const confirmPassword = cEl ? cEl.value : '';

      // Validation
      if (!username || !email || !age || !password || !confirmPassword) {
        showError('Please fill in all fields!');

        if (!age) {
          const aErr = document.getElementById('ageError');
          if (aErr) aErr.classList.add('show');
        }

        showLoading(submitBtn, false);
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long!');
        showLoading(submitBtn, false);
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match!');
        showLoading(submitBtn, false);
        return;
      }

      const client = initSupabase();
      if (!client) {
        showLoading(submitBtn, false);
        return;
      }

      try {
        console.log('🔍 Checking if username exists...');

        const { data: existingUser, error: checkError } = await client
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (checkError) {
          console.error("Username check error:", checkError);
        }

        if (existingUser) {
          showError('That username is already taken. Please try another one!');
          showLoading(submitBtn, false);
          return;
        }

        console.log('✅ Username is available. Creating account...');

        // Check auth status first - sometimes leftover sessions break signup
        await client.auth.signOut();

        const { data: authData, error: signUpError } = await client.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              username: username,
              age: age
            }
          }
        });

        if (signUpError) {
          console.error('Signup error:', signUpError);
          if (signUpError.message && signUpError.message.includes('already registered')) {
            showError('An account with this email already exists! Try logging in.');
          } else if (signUpError.message && signUpError.message.includes('password')) {
            showError('Password is too weak. Please use a stronger password.');
          } else {
            showError(`Sign up failed: ${signUpError.message}`);
          }
          showLoading(submitBtn, false);
          return;
        }

        if (!authData || !authData.user) {
          showError('Sign up failed. Please try again.');
          showLoading(submitBtn, false);
          return;
        }

        console.log('✅ User created in auth system. ID:', authData.user.id);
        const userId = authData.user.id;

        // Try to create profile with retries
        let profileCreated = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!profileCreated && retryCount < maxRetries) {
          try {
            console.log(`👤 Attempting to create profile for ${username} (Attempt ${retryCount + 1})`);

            const { error: profileError } = await client
              .from('users')
              .upsert([
                {
                  id: userId,
                  username: username,
                  email: email,
                  age: age,
                  created_at: new Date().toISOString()
                }
              ], { onConflict: 'id' });

            if (profileError) {
              console.error(`Profile creation error (Attempt ${retryCount + 1}):`, profileError);

              if (profileError.code === '23505') {
                console.log('Profile already exists (duplicate key error), treating as success.');
                profileCreated = true;
                break;
              }

              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Waiting before retry ${retryCount + 1}...`);
                await new Promise(r => setTimeout(r, 1000 * retryCount));
              } else {
                throw new Error(`Could not save user profile after ${maxRetries} attempts: ` + profileError.message);
              }
            } else {
              console.log('✅ Profile created successfully!');
              profileCreated = true;
            }
          } catch (err) {
            console.error('Try/catch error saving user profile:', err);
            retryCount++;
            if (retryCount >= maxRetries) {
              showError(`Account created but profile setup failed: ${err.message}. Please contact support.`);
              showLoading(submitBtn, false);
              return;
            }
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }

        SessionManager.set(userId, email, username);

        // Success!
        showSuccess('Account created! Welcome to EduPlay! Redirecting...');

        // Wait a bit for animations then redirect
        setTimeout(() => {
          // If in magic flip view, redirect from login.html
          window.location.replace('dashboard.html');
        }, 2000);

      } catch (error) {
        console.error('Registration error:', error);
        showError('An error occurred during registration. Please try again.');
        showLoading(submitBtn, false);
      }
    });
  }
}

/**
 * User Login
 */
function initializeLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMessages();

      const submitBtn = document.getElementById('loginBtn');
      showLoading(submitBtn, true);

      const usernameEl = document.getElementById('username');
      const passwordEl = document.getElementById('password');

      const username = usernameEl ? usernameEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';

      if (!username || !password) {
        showError('Please enter both username and password!');
        showLoading(submitBtn, false);
        return;
      }

      const client = initSupabase();
      if (!client) {
        showLoading(submitBtn, false);
        return;
      }

      try {
        console.log('🔍 Looking up user...');

        // Get user's email from username
        const { data: userData, error: userError } = await client
          .from('users')
          .select('email, id, username')
          .eq('username', username)
          .maybeSingle();

        if (userError || !userData) {
          showError('Invalid username or password!');
          showLoading(submitBtn, false);
          return;
        }

        // Sign in with email and password
        const { data: authData, error: signInError } = await client.auth.signInWithPassword({
          email: userData.email,
          password: password,
        });

        if (signInError) {
          showError('Invalid username or password!');
          showLoading(submitBtn, false);
          return;
        }

        if (!authData || !authData.user) {
          showError('Login failed. Please try again.');
          showLoading(submitBtn, false);
          return;
        }

        // Set session with user data
        SessionManager.set(authData.user.id, userData.email, userData.username);

        showSuccess('Login successful! Redirecting to dashboard...');

        // Redirect to dashboard
        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 1500);

      } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
      } finally {
        showLoading(submitBtn, false);
      }
    });
  }
}

/**
 * Logout Handler (Fix 1 - COMPLETE FIX)
 */
async function performLogout(buttonEl) {
  try {
    // Step 1: Disable button
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = 'Logging out...';
    }

    const client = initSupabase();
    if (client) {
      // Step 2: Sign out from Supabase FIRST and AWAIT it
      const { error } = await client.auth.signOut();
      if (error) console.warn("Supabase signout returned error:", error);

      // Try again if still active
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        console.warn("Session still active after signOut, forcing again.");
        await client.auth.signOut();
      }
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Step 3: Clear all custom session storage
    SessionManager.clear();
    sessionStorage.clear();

    // Step 4: Clear Supabase's own localStorage keys
    // Known project ref: wtixqjwwmkpdtqqvnyef
    localStorage.removeItem('sb-wtixqjwwmkpdtqqvnyef-auth-token');

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Step 6: Navigate using replace() to wipe history
    if (window.location.pathname.includes('/games/')) {
      window.location.replace('../index.html');
    } else {
      window.location.replace('index.html');
    }
  }
}

function initializeLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    // remove purely visual href behaviour
    if (logoutBtn.tagName === 'A') {
      logoutBtn.href = "#";
    }
    logoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      await performLogout(this);
    });
  }
}

// Initialize logout button when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLogoutButton);
} else {
  initializeLogoutButton();
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
async function checkAuth() {
  // Wait up to 5 seconds for Supabase to load from CDN (race condition fix)
  let client = null;
  for (let i = 0; i < 10; i++) {
    client = initSupabase();
    if (client) break;
    await new Promise(r => setTimeout(r, 500)); // wait 500ms between retries
  }

  if (!client) {
    console.error('Supabase CDN failed to load after retries. Cannot authenticate.');
    // Do not redirect — just return false. Let the page decide what to do.
    return false;
  }

  // Get actual Supabase session
  let session = null;
  let error = null;
  try {
    const result = await client.auth.getSession();
    session = result.data?.session;
    error = result.error;
  } catch (e) {
    console.error('getSession threw error:', e);
    return false;
  }

  // Determine current page
  const currentPath = window.location.pathname;
  const isProtectedPage =
    currentPath.includes('dashboard') ||
    currentPath.includes('quiz') ||
    currentPath.includes('progress') ||
    currentPath.includes('games') ||
    currentPath.includes('math-blaster') ||
    currentPath.includes('word-bubble') ||
    currentPath.includes('puzzle-quest') ||
    currentPath.includes('memory-flip') ||
    currentPath.includes('speed-typer') ||
    currentPath.includes('courses') ||
    currentPath.includes('profile');

  const isAuthPage =
    currentPath.includes('login') ||
    currentPath.includes('register');

  // Route logic based purely on Supabase session
  if (!session || error) {
    if (isProtectedPage) {
      SessionManager.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
      console.log('🔒 No session, redirecting to login');
      if (currentPath.includes('/games/')) {
        window.location.replace('../login.html');
      } else {
        window.location.replace('login.html');
      }
      return false;
    }
    return false;
  }

  // Logged in
  if (isAuthPage) {
    window.location.replace('dashboard.html');
    return false;
  }

  // Protected or public page — cache user info and update coins
  const user = session.user;
  if (user) {
    SessionManager.set(user.id, user.email, user.user_metadata?.username || '');
    updateNavCoins(user.email);
  }
  return true;
}

/**
 * Update the coin display in the navbar
 */
async function updateNavCoins(identifier) {
  const coinEl = document.getElementById('navCoins');
  if (!coinEl || !identifier) return;

  try {
    const client = initSupabase();
    if (!client) return;

    // Determine if identifier is an email or ID
    const queryCol = identifier.includes('@') ? 'email' : 'id';

    const { data } = await client.from('users').select('game_coins').eq(queryCol, identifier).single();
    if (data && data.game_coins !== undefined) {
      coinEl.textContent = data.game_coins;
      // Expose globally for quick access in games.html
      window.eduplay_current_coins = data.game_coins;
    }
  } catch (error) {
    console.warn("Failed to fetch nav coins:", error);
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null
 */
async function getCurrentUser() {
  // Wait up to 5 seconds for Supabase CDN to load
  let client = null;
  for (let i = 0; i < 10; i++) {
    client = initSupabase();
    if (client) break;
    await new Promise(r => setTimeout(r, 500));
  }
  if (!client) return null;

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (!session || sessionError) return null;

    // Try fetching full profile from users table
    let user = null;
    const { data: userData, error: userError } = await client
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.warn('Could not fetch user profile from DB, using session fallback:', userError?.message);
      // Fallback: build a minimal user object from auth session so dashboard still works
      user = {
        id: session.user.id,
        email: session.user.email,
        username: session.user.user_metadata?.username || session.user.email.split('@')[0],
        total_points: 0,
        quizzes_completed: 0,
        game_coins: 0
      };
    } else {
      user = userData;
    }

    // Attach stats (gracefully skip if quiz_results/user_badges tables don't exist)
    let historyData = [];
    let badgesData = [];

    try {
      const { data: h } = await client
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      historyData = h || [];
    } catch (e) { /* table may not exist */ }

    try {
      const { data: b } = await client
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);
      badgesData = b || [];
    } catch (e) { /* table may not exist */ }

    user.stats = {
      totalPoints: user.total_points || 0,
      quizzesCompleted: user.quizzes_completed || 0,
      history: historyData,
      badges: badgesData
    };

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Save quiz results
 * Accepts either an object {module, score, correct, total, percentage, streak_max, lifelines_used}
 * or legacy params (subject, topic, score, total)
 */
async function saveQuizResult(arg1, topic, scoreArg, totalArg) {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('User not authenticated, cannot save quiz result');
    return false;
  }

  const client = initSupabase();
  try {
    let subject, score, total, percentage;

    // Handle object payload from quiz.js vs legacy arguments
    if (typeof arg1 === 'object') {
      subject = arg1.module;
      score = arg1.score;
      total = arg1.total;
      percentage = arg1.percentage || Math.round((score / total) * 100) || 0;
    } else {
      subject = arg1;
      score = scoreArg;
      total = totalArg;
      percentage = Math.round((score / total) * 100) || 0;
    }

    const { error } = await client
      .from('quiz_results')
      .insert([
        {
          user_id: user.id,
          module: subject, // DB column might be named module
          score: score,
          total_questions: total,
          percentage: percentage
        }
      ]);

    if (error) {
      console.error('Error saving quiz result to DB:', error);
      return false;
    }

    await updateUserStats(user.id, subject, score);
    return true;
  } catch (error) {
    console.error('Save quiz result exception:', error);
    return false;
  }
}

/**
 * Helper to update user stats after a quiz
 */
async function updateUserStats(userId, subject, scorePointsToAdd) {
  const client = initSupabase();
  try {
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('quizzes_completed, subject_scores, total_points')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const quizzesCompleted = (user.quizzes_completed || 0) + 1;
    // Map scorePointsToAdd directly, fallback to 0 using actual column total_points
    const totalScore = (user.total_points || 0) + (scorePointsToAdd || 0);
    const subjectScores = user.subject_scores || {};

    if (subject) {
      subjectScores[subject.toLowerCase()] = (subjectScores[subject.toLowerCase()] || 0) + (scorePointsToAdd || 0);
    }

    const { error: updateError } = await client
      .from('users')
      .update({
        quizzes_completed: quizzesCompleted,
        total_points: totalScore,
        subject_scores: subjectScores,
        last_active: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Check for badges based on quizzes completed or score
    if (quizzesCompleted >= 1) await saveBadge(userId, 'First Quiz', '🏅');
    if (quizzesCompleted >= 5) await saveBadge(userId, 'Quiz Master', '👑');
    // For perfect score we might need percentage, but for now we look at points per question (e.g. >= 100 is high score)
    if (scorePointsToAdd >= 100) await saveBadge(userId, 'Highest Scorer', '⭐');

  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

/**
 * Save a badge to user profile
 */
async function saveBadge(userId, name, icon) {
  const client = initSupabase();
  try {
    // Check if user already has badge
    const { data: existingBadges, error: badgeError } = await client
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name);

    if (badgeError) throw badgeError;

    // Create badge if they don't have it
    if (!existingBadges || existingBadges.length === 0) {
      const { error: insertError } = await client
        .from('user_badges')
        .insert([{ user_id: userId, name: name, icon: icon }]);

      if (insertError) throw insertError;
      console.log(`Earned badge: ${name} ${icon}`);

      // Optional: trigger subtle UI notification
      if (typeof window.showNotification === 'function') {
        window.showNotification(`You earned a new badge: ${name} ${icon}`, 'success');
      }
    }
  } catch (error) {
    console.error('Error saving badge:', error);
  }
}

// Export functions for global use
window.initSupabase = initSupabase;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.saveQuizResult = saveQuizResult;
window.performLogout = performLogout;
window.updateNavCoins = updateNavCoins;
window.SessionManager = SessionManager;

if (!window.eduplay) window.eduplay = {};
window.eduplay.getCurrentUser = getCurrentUser;
window.eduplay.checkAuth = checkAuth;
window.eduplay.initSupabase = initSupabase;
window.eduplay.saveQuizResult = saveQuizResult;
window.eduplay.session = SessionManager;
