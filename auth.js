const SUPABASE_URL = 'https://wtixqjwwmkpdtqqvnyef.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3L-_wUV4SgxWVWuouHzk2A_QhF5bRno';


// Wait for Supabase library to load
let supabaseClient = null;

// Initialize Supabase client
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded!');
    return null;
  }
  
  if (!supabaseClient) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase initialized');
    } catch (error) {
      console.error('❌ Error initializing Supabase:', error);
      return null;
    }
  }
  
  return supabaseClient;
}

// Session management
function setSession(userId) {
  window.name = 'eduplay_session:' + userId;
}

function getSessionId() {
  if (window.name && window.name.startsWith('eduplay_session:')) {
    return window.name.replace('eduplay_session:', '');
  }
  return null;
}

function clearSession() {
  window.name = '';
}

// Helper functions
function showError(message) {
  console.log('❌ Error:', message);
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
  }
}

function showSuccess(message) {
  console.log('✅ Success:', message);
  const successDiv = document.getElementById('successMessage');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 3000);
  }
}

function clearMessages() {
  const errorDiv = document.getElementById('errorMessage');
  const successDiv = document.getElementById('successMessage');
  if (errorDiv) errorDiv.classList.remove('show');
  if (successDiv) successDiv.classList.remove('show');
}

// Registration Handler
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearMessages();
    
    const client = initSupabase();
    if (!client) {
      showError('Failed to initialize. Please refresh the page.');
      return;
    }
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const age = document.getElementById('age').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!username || !email || !age || !password || !confirmPassword) {
      showError('Please fill in all fields!');
      return;
    }
    
    if (username.length < 3) {
      showError('Username must be at least 3 characters long!');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters long!');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match!');
      return;
    }
    
    try {
      console.log('🔍 Checking username...');
      
      // Check if username already exists
      const { data: existingUser, error: checkError } = await client
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        showError('Error checking username. Please try again.');
        console.error('Check error:', checkError);
        return;
      }
      
      if (existingUser) {
        showError('Username already taken! Please choose another one.');
        return;
      }
      
      console.log('📧 Creating account...');
      
      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await client.auth.signUp({
        email: email,
        password: password,
      });
      
      if (signUpError) {
        showError(signUpError.message);
        console.error('Sign up error:', signUpError);
        return;
      }
      
      if (!authData.user) {
        showError('Failed to create account. Please try again.');
        return;
      }
      
      console.log('👤 Creating profile...');
      
      // Create user profile
      const { error: profileError } = await client
        .from('users')
        .insert([
          {
            id: authData.user.id,
            username: username,
            email: email,
            age: parseInt(age),
            total_points: 0,
            quizzes_completed: 0
          }
        ]);
      
      if (profileError) {
        showError('Error creating profile: ' + profileError.message);
        console.error('Profile error:', profileError);
        return;
      }
      
      console.log('🎉 Registration successful!');
      showSuccess('🎉 Account created successfully! Redirecting to login...');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      showError('An error occurred: ' + error.message);
    }
  });
}

// Login Handler
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearMessages();
    
    console.log('=== LOGIN START ===');
    
    const client = initSupabase();
    if (!client) {
      showError('Failed to initialize. Please refresh the page.');
      return;
    }
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('Login attempt for:', username);
    
    if (!username || !password) {
      showError('Please enter both username and password!');
      return;
    }
    
    try {
      // Step 1: Get user's email from username
      console.log('🔍 Looking up user...');
      const { data: userData, error: userError } = await client
        .from('users')
        .select('email, id, username')
        .eq('username', username)
        .maybeSingle();
      
      console.log('User lookup result:', { found: !!userData, error: userError });
      
      if (userError || !userData) {
        showError('Invalid username or password!');
        console.error('User lookup error:', userError);
        return;
      }
      
      console.log('✅ User found:', userData.email);
      
      // Step 2: Sign in with email and password
      console.log('🔐 Authenticating...');
      const { data: authData, error: signInError } = await client.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });
      
      console.log('Auth result:', { 
        success: !!authData?.user, 
        error: signInError?.message 
      });
      
      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        showError('Invalid username or password!');
        return;
      }
      
      if (!authData || !authData.user) {
        showError('Login failed. Please try again.');
        return;
      }
      
      console.log('✅ Login successful!');
      
      // Step 3: Set session
      setSession(authData.user.id);
      
      showSuccess('🎮 Login successful! Redirecting to dashboard...');
      
      setTimeout(() => {
        console.log('🔄 Redirecting...');
        window.location.href = 'dashboard.html';
      }, 1500);
      
      console.log('=== LOGIN END ===');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      showError('An error occurred: ' + error.message);
    }
  });
}

// Logout Handler
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', async function() {
    const client = initSupabase();
    if (client) {
      await client.auth.signOut();
    }
    clearSession();
    window.location.href = 'index.html';
  });
}

// Check if user is logged in
async function checkAuth() {
  const protectedPages = ['dashboard.html', 'progress.html', 'quiz.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    const client = initSupabase();
    if (!client) {
      window.location.href = 'login.html';
      return false;
    }
    
    const { data: { user }, error } = await client.auth.getUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    
    setSession(user.id);
  }
  return true;
}

// Get current user data
async function getCurrentUser() {
  try {
    const client = initSupabase();
    if (!client) return null;
    
    const { data: { user }, error: authError } = await client.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    // Get user profile and stats
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
      return null;
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

// Update user stats
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
        quizzes_completed: stats.quizzesCompleted
      })
      .eq('id', user.id);
    
    if (error) {
      console.error('Error updating stats:', error);
    }
    
  } catch (error) {
    console.error('Error in updateUserStats:', error);
  }
}

// Save quiz result
async function saveQuizResult(quizData) {
  try {
    const client = initSupabase();
    if (!client) return;
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    
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
          date: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('Error saving quiz history:', error);
    }
    
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

// Save badge
async function saveBadge(badgeData) {
  try {
    const client = initSupabase();
    if (!client) return;
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    
    const { data: existingBadge } = await client
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .eq('badge_id', badgeData.id)
      .maybeSingle();
    
    if (existingBadge) return;
    
    const { error } = await client
      .from('badges')
      .insert([
        {
          user_id: user.id,
          badge_id: badgeData.id,
          name: badgeData.name,
          icon: badgeData.icon,
          description: badgeData.description
        }
      ]);
    
    if (error) {
      console.error('Error saving badge:', error);
    }
    
  } catch (error) {
    console.error('Error in saveBadge:', error);
  }
}

// Export functions
window.eduplay = {
  getCurrentUser,
  updateUserStats,
  checkAuth,
  saveQuizResult,
  saveBadge,
  getSupabase: initSupabase
};

console.log('✅ Auth.js loaded successfully');