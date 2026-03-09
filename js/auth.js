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
function showError(message, type = 'error') {
  console.error('Error:', message);

  // Owl mascot reaction
  reactOwlError(type);

  // Try styled inline message first
  const existing = document.querySelector('.auth-inline-msg');
  if (existing) existing.remove();

  const colors = {
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#EF4444', icon: '❌' },
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', text: '#10B981', icon: '✅' },
    info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#93C5FD', icon: '💡' }
  };
  const c = colors[type] || colors.error;

  // Find a good insertion point (before submit button)
  const submitBtn = document.querySelector('#registerBtn, #loginBtn, [type=submit]');
  if (submitBtn && submitBtn.parentElement) {
    const msg = document.createElement('div');
    msg.className = 'auth-inline-msg';
    msg.style.cssText = `
      background:${c.bg}; border:1.5px solid ${c.border}; border-radius:16px;
      padding:12px 18px; color:${c.text}; font-family:'Nunito',sans-serif;
      font-weight:700; font-size:0.9rem; margin:10px 0;
      display:flex; align-items:center; gap:8px;
      animation: slideInMsg 0.3s ease;
    `;
    msg.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
    submitBtn.parentElement.insertBefore(msg, submitBtn);

    const delay = type === 'success' ? 3000 : type === 'info' ? 0 : 5000;
    if (delay > 0) setTimeout(() => msg.remove(), delay);
    return;
  }

  // Fallback: legacy div
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.style.display = 'block';
    setTimeout(() => { errorDiv.classList.add('hidden'); errorDiv.style.display = 'none'; }, 5000);
  }
}

function showSuccess(message) {
  console.log('Success:', message);
  showError(message, 'success');
  const successDiv = document.getElementById('successMessage');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    successDiv.style.display = 'block';
    setTimeout(() => { successDiv.classList.add('hidden'); successDiv.style.display = 'none'; }, 3000);
  }
}

function clearMessages() {
  document.querySelectorAll('.auth-inline-msg').forEach(el => el.remove());
  const errorDiv = document.getElementById('errorMessage');
  const successDiv = document.getElementById('successMessage');
  if (errorDiv) { errorDiv.classList.add('hidden'); errorDiv.style.display = 'none'; }
  if (successDiv) { successDiv.classList.add('hidden'); successDiv.style.display = 'none'; }
}

function reactOwlError(type) {
  const owl = document.getElementById('mascotEmoji');
  if (!owl) return;
  owl.textContent = type === 'success' ? '🎉' : '🙈';
  setTimeout(() => { owl.textContent = '🦉'; }, 1200);
}

function setLoadingState(isLoading, buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">🌀</span> Creating account...';
    btn.style.opacity = '0.8';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
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
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
  }
}

// Add spin keyframe once
if (!document.getElementById('auth-spin-style')) {
  const s = document.createElement('style');
  s.id = 'auth-spin-style';
  s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes slideInMsg{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(s);
}

/**
 * Insert user profile with exponential-backoff retry.
 * Fixes the FK race condition (23503 / 409) between auth.users commit and public.users insert.
 */
async function insertProfileWithRetry(client, userId, username, email, age) {
  const delays = [1500, 2000, 3000, 4000, 5000];

  for (let attempt = 1; attempt <= delays.length; attempt++) {
    // Wait before each attempt — gives auth.users row time to commit
    await new Promise(r => setTimeout(r, delays[attempt - 1]));
    console.log(`👤 Profile insert attempt ${attempt}/${delays.length}...`);

    // NOTE: Do NOT call getUser() here — when email confirmation is required,
    // there is no active session yet, so getUser() returns null and would
    // cause all retries to skip. We already have userId from authData.user.id.

    const { data, error } = await client
      .from('users')
      .insert({
        id: userId,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        age: parseInt(age),
        total_points: 0,
        quizzes_completed: 0,
        game_coins: 0
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`✅ Profile created on attempt ${attempt}`);
      return { success: true, data };
    }

    if (error) {
      console.warn(`Attempt ${attempt} error (${error.code}):`, error.message);
      if (error.code === '23505') {
        // Profile already exists — treat as success
        console.log('Profile already exists, treating as success.');
        return { success: true, data: null };
      }
      if (error.code !== '23503' && error.code !== '409' && error.code !== '42501') {
        // Non-retryable error (not FK violation / conflict / permission)
        console.error('Non-retryable profile insert error:', error);
        return { success: false, error };
      }
      // FK violation (23503) or conflict (409) — retry after delay
      console.log(`FK/conflict error, will retry...`);
    }
  }

  return { success: false, error: { message: 'Max retry attempts reached' } };
}


/**
 * Resend confirmation email with cooldown.
 */
async function handleResendEmail(email) {
  const btn = document.getElementById('resendEmailBtn');
  if (btn) { btn.disabled = true; btn.textContent = '📨 Sending...'; }

  const client = initSupabase();
  if (!client) return;

  const { error } = await client.auth.resend({
    type: 'signup',
    email: email,
    options: { emailRedirectTo: window.location.origin + '/html/dashboard.html' }
  });

  if (!error) {
    if (btn) {
      let secs = 60;
      btn.textContent = `Resend in ${secs}s`;
      const iv = setInterval(() => {
        secs--;
        if (btn) btn.textContent = `Resend in ${secs}s`;
        if (secs <= 0) {
          clearInterval(iv);
          if (btn) { btn.disabled = false; btn.textContent = '📧 Resend Email'; }
        }
      }, 1000);
    }
    showError('Email sent! Check your inbox 📬', 'success');
  } else {
    if (btn) { btn.disabled = false; btn.textContent = '📧 Resend Email'; }
    showError('Could not resend. Try again in a moment.');
  }
}

/**
 * Show the email-confirmation-pending UI inside the form.
 */
function showEmailConfirmationUI(email, formEl) {
  // Hide all form children except a new card
  Array.from(formEl.children).forEach(el => el.style.display = 'none');

  const card = document.createElement('div');
  card.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-primary,#fff);';
  card.innerHTML = `
    <div style="font-size:64px;animation:float 3s ease-in-out infinite;">📧</div>
    <h2 style="font-family:'Baloo 2',cursive;font-size:1.5rem;font-weight:900;margin:16px 0 8px;">
      Check your email! 📬
    </h2>
    <p style="font-family:'Nunito',sans-serif;font-size:0.95rem;margin:0 0 16px;opacity:0.9;">
      We sent a confirmation link to:<br>
      <strong style="color:#a78bfa;">${email}</strong><br><br>
      Click the link to activate your account! 🚀
    </p>
    <p style="font-size:0.85rem;opacity:0.6;margin:0 0 12px;">Didn't receive it? Check your spam folder or:</p>
    <button id="resendEmailBtn"
      onclick="handleResendEmail('${email}')"
      style="background:linear-gradient(135deg,#6C63FF,#FF6B9D);color:#fff;
             border:none;border-radius:50px;padding:12px 28px;
             font-family:'Baloo 2',cursive;font-size:1rem;font-weight:800;
             cursor:pointer;margin-bottom:12px;">
      📧 Resend Email
    </button><br>
    <a href="login.html" style="color:#a78bfa;font-size:0.9rem;font-family:'Nunito',sans-serif;">
      ← Back to Login
    </a>
  `;
  formEl.appendChild(card);
}

/**
 * Handle email confirmation tokens in URL (called on every page load).
 */
async function handleEmailConfirmation() {
  const client = initSupabase();
  if (!client) return;

  // Method 1: code in query params (PKCE flow — newer Supabase)
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    try {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        window.history.replaceState({}, '', window.location.pathname);
        SessionManager.set(data.session.user.id, data.session.user.email,
          data.session.user.user_metadata?.username || '');
        const dashPath = window.location.pathname.includes('/html/')
          ? 'dashboard.html' : 'html/dashboard.html';
        window.location.replace(dashPath);
        return;
      }
    } catch (_) { /* not a code exchange page */ }
  }

  // Method 2: access_token in hash (implicit flow — older Supabase)
  const hash = window.location.hash;
  if (hash.includes('access_token') && hash.includes('type=signup')) {
    // Supabase SDK auto-handles hash tokens; just wait for session
    const { data } = await client.auth.getSession();
    if (data?.session) {
      const dashPath = window.location.pathname.includes('/html/')
        ? 'dashboard.html' : 'html/dashboard.html';
      window.location.replace(dashPath);
    }
  }
}

// Run email confirmation handler on every page load
(async () => { await handleEmailConfirmation(); })();

/**
 * User Registration — complete rewrite with retry + email confirm flow
 */
function initializeRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  // Real-time password match indicator
  const pwInput = document.getElementById('reg-password-input');
  const confirmInput = document.getElementById('reg-confirm-input');
  if (pwInput && confirmInput) {
    confirmInput.addEventListener('input', function () {
      if (this.value && this.value !== pwInput.value) {
        this.setCustomValidity("Passwords don't match");
        this.classList.add('invalid'); this.classList.remove('valid');
      } else {
        this.setCustomValidity('');
        if (this.value) { this.classList.add('valid'); this.classList.remove('invalid'); }
      }
    });
  }

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMessages();

    // ── STEP 1: Collect inputs ─────────────────────────────────────────────────
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

    // ── STEP 2: Validate ───────────────────────────────────────────────────────
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      showError('Username must be 3-50 characters: letters, numbers, underscore only.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address 📧');
      return;
    }
    if (!age || age < 6 || age > 12) {
      showError('Please select your age! 🎂');
      const aErr = document.getElementById('ageError');
      if (aErr) aErr.classList.add('show');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters 🔒');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match! 🔑');
      return;
    }

    setLoadingState(true, 'registerBtn');

    try {
      const client = initSupabase();
      if (!client) { setLoadingState(false, 'registerBtn'); return; }

      // ── STEP 3: Check username uniqueness ────────────────────────────────────
      console.log('🔍 Checking username availability...');
      const { data: existingUser, error: checkError } = await client
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        showError('Connection issue. Please try again 🌐');
        setLoadingState(false, 'registerBtn');
        return;
      }
      if (existingUser) {
        showError('That username is taken! Try another 😊');
        setLoadingState(false, 'registerBtn');
        return;
      }

      // ── STEP 4: Create Supabase Auth user ────────────────────────────────────
      console.log('🔐 Creating auth account...');
      await client.auth.signOut(); // clear any stale session

      const { data: authData, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { username, age: parseInt(age) },
          emailRedirectTo: window.location.origin + '/html/dashboard.html'
        }
      });

      if (signUpError) {
        const msg = signUpError.message || '';
        if (msg.includes('already registered') || signUpError.code === 'email_exists')
          showError('That email is already registered! Try logging in 📧');
        else if (signUpError.code === 'weak_password')
          showError('Password too weak! Use 6+ characters 🔒');
        else if (signUpError.code === 'email_address_invalid')
          showError('Invalid email address 📧');
        else
          showError(`Sign up failed: ${msg}`);
        setLoadingState(false, 'registerBtn');
        return;
      }

      if (!authData?.user) {
        showError('Registration failed. Please try again!');
        setLoadingState(false, 'registerBtn');
        return;
      }

      const userId = authData.user.id;
      console.log('✅ Auth user created. ID:', userId);

      // ── STEP 5: Insert profile with retry ────────────────────────────────────
      const profileResult = await insertProfileWithRetry(client, userId, username, email, age);

      setLoadingState(false, 'registerBtn');

      if (profileResult.success) {
        // Check email confirmation state
        if (authData.user.email_confirmed_at) {
          // Email confirmation disabled — go straight to dashboard
          SessionManager.set(userId, email, username);
          showError('Account created! Welcome to EduPlay! 🎉', 'success');
          setTimeout(() => window.location.replace('dashboard.html'), 1500);
        } else {
          // Normal flow — show confirmation pending UI
          showEmailConfirmationUI(email, registerForm);
        }
      } else {
        // Profile failed after all retries
        console.error('Profile creation failed:', profileResult.error);
        // Try to clean up auth user (best effort)
        try { await client.auth.admin?.deleteUser(userId); } catch (_) { }
        showError(
          'Account setup failed after multiple attempts. Please try again or contact support.'
        );
        // Show retry button
        const submitBtn = document.getElementById('registerBtn');
        if (submitBtn) {
          const retry = document.createElement('button');
          retry.textContent = '🔄 Try Again';
          retry.style.cssText = 'margin-top:10px;padding:10px 24px;border-radius:50px;border:none;background:#6C63FF;color:#fff;font-weight:700;cursor:pointer;';
          retry.onclick = () => { retry.remove(); registerForm.dispatchEvent(new Event('submit')); };
          submitBtn.parentElement.insertBefore(retry, submitBtn.nextSibling);
        }
      }

    } catch (err) {
      console.error('Unexpected registration error:', err);
      showError('Something went wrong. Please try again!');
      setLoadingState(false, 'registerBtn');
    }
  });
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
  if (!coinEl && !document.getElementById('navCoinsValue')) return;

  try {
    const client = initSupabase();
    if (!client) return;

    // Determine if identifier is an email or ID
    const queryCol = identifier.includes('@') ? 'email' : 'id';

    const { data } = await client.from('users').select('game_coins').eq(queryCol, identifier).single();
    if (data && data.game_coins !== undefined) {
      if (coinEl) coinEl.textContent = data.game_coins;

      const dashCoinEl = document.getElementById('navCoinsValue');
      if (dashCoinEl) dashCoinEl.textContent = data.game_coins;

      if (typeof window.animateNavCoins === 'function') {
        window.animateNavCoins(data.game_coins);
      }

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
