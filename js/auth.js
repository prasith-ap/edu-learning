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

/**
 * Session Management using localStorage for persistent login
 */
const SessionManager = {
  set: (userId, email, username) => {
    localStorage.setItem('eduplay_user_id', userId);
    localStorage.setItem('eduplay_email', email || '');
    localStorage.setItem('eduplay_username', username || '');
    localStorage.setItem('eduplay_session_timestamp', Date.now().toString());
    console.log('💾 Session saved to localStorage');
  },

  get: () => {
    return localStorage.getItem('eduplay_user_id');
  },

  getEmail: () => {
    return localStorage.getItem('eduplay_email');
  },

  getUsername: () => {
    return localStorage.getItem('eduplay_username');
  },

  clear: () => {
    console.log('🗑️ Clearing session from localStorage');
    localStorage.removeItem('eduplay_user_id');
    localStorage.removeItem('eduplay_email');
    localStorage.removeItem('eduplay_username');
    localStorage.removeItem('eduplay_session_timestamp');
  },

  isValid: () => {
    const userId = localStorage.getItem('eduplay_user_id');
    const timestamp = localStorage.getItem('eduplay_session_timestamp');

    if (!userId || !timestamp) return false;

    // Check if session is less than 30 days old
    const sessionAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    errorDiv.style.display = 'block'; // Ensure it's visible if hidden class isn't enough

    // Auto-hide after 5 seconds
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

    // Auto-hide after 3 seconds
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
    button.dataset.originalText = button.textContent; // Use textContent for cleaner text
    button.textContent = 'Processing...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Submit';
  }
}

/**
 * Form Validation
 */
const Validator = {
  username: (username) => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  },

  email: (email) => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (password) => {
    if (!password || password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  },

  age: (age) => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum)) {
      return 'Please select your age';
    }
    if (ageNum < 6 || ageNum > 12) {
      return 'Age must be between 6 and 12';
    }
    return null;
  }
};

/**
 * Registration Handler
 */
function initializeRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    console.log('✅ Register form found, initializing...');
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMessages();

      const submitBtn = e.target.querySelector('button[type="submit"]');
      showLoading(submitBtn, true);

      const client = initSupabase();
      if (!client) {
        showLoading(submitBtn, false);
        return;
      }

      // Get form values
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const age = document.getElementById('age').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validate inputs
      const usernameError = Validator.username(username);
      if (usernameError) {
        showError(usernameError);
        showLoading(submitBtn, false);
        return;
      }

      const emailError = Validator.email(email);
      if (emailError) {
        showError(emailError);
        showLoading(submitBtn, false);
        return;
      }

      const ageError = Validator.age(age);
      if (ageError) {
        showError(ageError);
        showLoading(submitBtn, false);
        return;
      }

      const passwordError = Validator.password(password);
      if (passwordError) {
        showError(passwordError);
        showLoading(submitBtn, false);
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match!');
        showLoading(submitBtn, false);
        return;
      }

      try {
        console.log('🔍 Checking username availability...');

        // Check if username exists
        const { data: existingUser, error: checkError } = await client
          .from('users')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error('Error checking username availability');
        }

        if (existingUser) {
          showError('Username already taken! Please choose another one.');
          showLoading(submitBtn, false);
          return;
        }

        console.log('📧 Creating account...');

        // Sign up with Supabase Auth
        const { data: authData, error: signUpError } = await client.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              username: username,
              age: parseInt(age)
            }
          }
        });

        if (signUpError) throw signUpError;

        if (!authData.user) {
          throw new Error('Failed to create account');
        }

        console.log('👤 Creating user profile...');

        // Wait a short moment to ensure auth user is propagated
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create user profile in users table with retry logic
        let profileCreated = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!profileCreated && retryCount < maxRetries) {
          try {
            const { error: profileError } = await client
              .from('users')
              .insert([
                {
                  id: authData.user.id,
                  username: username,
                  email: email,
                  age: parseInt(age),
                  total_points: 0,
                  quizzes_completed: 0,
                  created_at: new Date().toISOString()
                }
              ]);

            if (profileError) {
              // If it's the FK violation, it might be timing, so we retry
              if (profileError.code === '23503') { // foreign_key_violation
                console.warn(`Retry ${retryCount + 1}/${maxRetries}: Auth user not ready yet...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s and retry
                retryCount++;
                continue;
              }
              throw profileError;
            }

            profileCreated = true;
          } catch (err) {
            if (retryCount >= maxRetries - 1) throw err;
            console.warn(`Retry ${retryCount + 1}/${maxRetries} failed:`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
          }
        }

        if (!profileCreated) {
          throw new Error('Failed to create user profile after multiple attempts. Please try logging in.');
        }

        console.log('🎉 Registration successful!');
        showSuccess('Account created successfully! Redirecting to login...');

        // Clear form
        e.target.reset();

        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);

      } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'An error occurred during registration. Please try again.');
      } finally {
        showLoading(submitBtn, false);
      }
    });
  }
}

// Initialize register form when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRegisterForm);
} else {
  initializeRegisterForm();
}

/**
 * Login Handler
 */
function initializeLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('✅ Login form found, initializing...');
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMessages();

      const submitBtn = e.target.querySelector('button[type="submit"]');
      showLoading(submitBtn, true);

      const client = initSupabase();
      if (!client) {
        showLoading(submitBtn, false);
        return;
      }

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showError('Please enter both username and password!');
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
          window.location.href = 'dashboard.html';
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

// Initialize login form when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLoginForm);
} else {
  initializeLoginForm();
}

/**
 * Logout Handler
 */
function initializeLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();

      try {
        const client = initSupabase();
        if (client) {
          await client.auth.signOut();
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        SessionManager.clear();
        window.location.href = 'index.html';
      }
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
  const protectedPages = ['dashboard.html', 'progress.html', 'quiz.html', 'courses.html', 'profile.html'];
  const publicPages = ['login.html', 'register.html', 'index.html'];
  const currentPage = window.location.pathname.split('/').pop();

  const client = initSupabase();
  if (!client) {
    if (protectedPages.includes(currentPage)) {
      window.location.href = 'login.html';
    }
    return false;
  }

  try {
    const { data: { user }, error } = await client.auth.getUser();

    if (user && !error) {
      // User is logged in - update session with latest user data
  
      SessionManager.set(user.id, user.email, user.user_metadata?.username || '');

      // If on public/auth pages and logged in, redirect to dashboard
      if (publicPages.includes(currentPage)) {
       
        window.location.href = 'dashboard.html';
        return false;
      }

      return true;
    } else {
      // Check if we have a saved session in localStorage
      if (SessionManager.isValid()) {

        // Session is valid, user should be on protected pages
        if (publicPages.includes(currentPage)) {
          window.location.href = 'dashboard.html';
          return false;
        }
        return true;
      }

      // No valid session
      console.log('❌ No valid session found');
      SessionManager.clear();

      if (protectedPages.includes(currentPage)) {
        console.log('🔒 Not authenticated, redirecting to login');
        window.location.href = 'login.html';
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error('Auth check error:', error);

    // Even if there's an error, check saved session
    if (SessionManager.isValid()) {
      console.log('⚠️ Error checking auth but valid session found in localStorage');
      if (!protectedPages.includes(currentPage)) {
        return true;
      }
      return true;
    }

    SessionManager.clear();

    if (protectedPages.includes(currentPage)) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
}

/**
 * Get current user data
 * @returns {Promise<Object|null>} User data or null
 */
async function getCurrentUser() {
  try {
    const client = initSupabase();
    if (!client) return null;

    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      // Try to get from localStorage as fallback
      const userId = SessionManager.get();
      const username = SessionManager.getUsername();
      const email = SessionManager.getEmail();

      if (userId && username) {
        console.log('📦 Returning cached user from localStorage');
        return {
          id: userId,
          username: username,
          email: email,
          stats: {
            totalPoints: 0,
            badges: [],
            quizzesCompleted: 0,
            history: []
          }
        };
      }

      return null;
    }

    // Get user profile with related data from Supabase
    const { data: profile, error: profileError } = await client
      .from('users')
      .select(`
        *,
        badges (*),
        quiz_history (*)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Return basic user info even if profile fetch fails
      return {
        id: user.id,
        username: user.user_metadata?.username || '',
        email: user.email,
        stats: {
          totalPoints: 0,
          badges: [],
          quizzesCompleted: 0,
          history: []
        }
      };
    }

    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      age: profile.age,
      stats: {
        totalPoints: profile.total_points || 0,
        badges: profile.badges || [],
        quizzesCompleted: profile.quizzes_completed || 0,
        history: profile.quiz_history || []
      }
    };

  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Update user stats
 * @param {Object} stats - Stats to update
 */
async function updateUserStats(stats) {
  try {
    const client = initSupabase();
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { error } = await client
      .from('users')
      .update({
        total_points: stats.totalPoints,
        quizzes_completed: stats.quizzesCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating stats:', error);
    }

  } catch (error) {
    console.error('Error in updateUserStats:', error);
  }
}

/**
 * Save quiz result
 * @param {Object} quizData - Quiz result data
 */
async function saveQuizResult(quizData) {
  try {
    const client = initSupabase();
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Save quiz history
    const { error } = await client
      .from('quiz_history')
      .insert([
        {
          user_id: user.id,
          module: quizData.module,
          score: quizData.score,
          correct: quizData.correct,
          total: quizData.total,
          percentage: quizData.percentage,
          time_taken: quizData.timeTaken || null,
          date: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error saving quiz history:', error);
      return;
    }

    // Update user stats
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await updateUserStats({
        totalPoints: currentUser.stats.totalPoints + quizData.score,
        quizzesCompleted: currentUser.stats.quizzesCompleted + 1
      });
    }

  } catch (error) {
    console.error('Error saving quiz result:', error);
  }
}

/**
 * Save badge
 * @param {Object} badgeData - Badge data
 */
async function saveBadge(badgeData) {
  try {
    const client = initSupabase();
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Check if badge already exists
    const { data: existingBadge } = await client
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .eq('badge_id', badgeData.id)
      .maybeSingle();

    if (existingBadge) return;

    // Save new badge
    const { error } = await client
      .from('badges')
      .insert([
        {
          user_id: user.id,
          badge_id: badgeData.id,
          name: badgeData.name,
          icon: badgeData.icon,
          description: badgeData.description,
          earned_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error saving badge:', error);
    }

  } catch (error) {
    console.error('Error in saveBadge:', error);
  }
}

/**
 * Export public API
 */
window.eduplay = {
  getCurrentUser,
  updateUserStats,
  checkAuth,
  saveQuizResult,
  saveBadge,
  getSupabase: initSupabase,
  session: SessionManager
};

/**
 * Initialize auth on page load
 */
function initializeAuth() {
  console.log('🔐 Initializing authentication...');

  // Check auth status when DOM is ready with a small delay to ensure script loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('📄 DOM loaded, checking authentication...');
      // Small delay to ensure all scripts are loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      await checkAuth();
      console.log('✅ Authentication check complete');
    });
  } else {
    // DOM already loaded - use setTimeout for safety
    setTimeout(async () => {
      console.log('📄 DOM already loaded, checking authentication...');
      await checkAuth();
      console.log('✅ Authentication check complete');
    }, 100);
  }
}

// Initialize auth when script loads
if (typeof window !== 'undefined') {
  // Ensure auth initializes even if called multiple times
  if (!window.eduplay_auth_initialized) {
    window.eduplay_auth_initialized = true;
    initializeAuth();
  }
}

console.log('✅ Authentication module loaded successfully');