/**
 * EduPlay — Parent View Mode
 * js/parent-view.js
 *
 * Exports a global `ParentView` object with all logic:
 *   ParentView.init(supabase, userId, childData, quizHistory, badges)
 *   ParentView.handleNavbarClick()
 *   ParentView.exit()
 */

(function () {
    'use strict';

    // ── State ──────────────────────────────────────────────────────────────
    const PVState = {
        supabase: null,
        userId: null,
        childData: null,
        quizHistory: [],
        badges: [],
        stellaProgress: null,
        isActive: false,
        sessionStart: null,
        sessionTimerInterval: null,
        pinMode: null,         // 'setup' | 'entry'
        pinDigits: [],
        firstPIN: null,
        pinStep: null,         // 'ENTER_NEW' | 'CONFIRM_NEW' | 'SAVING' | 'DONE'
        wrongAttempts: 0,
        lockoutTimer: null,
        lockoutSeconds: 30,
        performanceChart: null,
        moodChart: null,
    };

    // ── SHA-256 PIN hashing ────────────────────────────────────────────────
    async function hashPIN(pin, userId) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + 'eduplay_parent_' + userId);
        const buffer = await crypto.subtle.digest('SHA-256', data);
        const array = Array.from(new Uint8Array(buffer));
        return array.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Supabase helpers ──────────────────────────────────────────────────
    async function getStoredPINHash() {
        try {
            const { data } = await PVState.supabase
                .from('users')
                .select('parent_pin')
                .eq('id', PVState.userId)
                .single();
            return data?.parent_pin ?? null;
        } catch { return null; }
    }

    async function savePINHash(hash) {
        await PVState.supabase
            .from('users')
            .update({ parent_pin: hash })
            .eq('id', PVState.userId);
    }

    async function logParentViewSession(durationSeconds) {
        try {
            await PVState.supabase.from('parent_view_sessions').insert({
                user_id: PVState.userId,
                duration_seconds: durationSeconds
            });
        } catch (e) { console.warn('PV session log failed', e); }
    }

    async function fetchStellaProgress() {
        try {
            const { data } = await PVState.supabase
                .from('user_english_progress')
                .select('*')
                .eq('user_id', PVState.userId)
                .single();
            return data ?? null;
        } catch { return null; }
    }

    // ── Session Storage helpers ────────────────────────────────────────────
    function saveSession() {
        sessionStorage.setItem('pv_active', 'true');
        sessionStorage.setItem('pv_expiry', String(Date.now() + 30 * 60 * 1000));
    }

    function clearSession() {
        sessionStorage.removeItem('pv_active');
        sessionStorage.removeItem('pv_expiry');
    }

    function isSessionActive() {
        const active = sessionStorage.getItem('pv_active');
        const expiry = parseInt(sessionStorage.getItem('pv_expiry') || '0', 10);
        return active === 'true' && Date.now() < expiry;
    }

    // ── PIN Overlay ────────────────────────────────────────────────────────
    function buildOverlayHTML() {
        return `
    <div class="pin-overlay" id="pinOverlay">
      <div class="pin-card">
        <span class="pin-emoji" id="pinEmoji">🔐</span>
        <h2 class="pin-title" id="pinTitle"></h2>
        <p class="pin-subtitle" id="pinSubtitle"></p>
        <div class="pin-dots-row" id="pinDotsRow">
          <div class="pin-dot" id="dot0"></div>
          <div class="pin-dot" id="dot1"></div>
          <div class="pin-dot" id="dot2"></div>
          <div class="pin-dot" id="dot3"></div>
        </div>
        <div class="pin-message" id="pinMessage"></div>
        <div class="pin-numpad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d =>
            `<button class="pin-key" data-digit="${d}">${d}</button>`
        ).join('')}
          <button class="pin-key pin-key-clear" id="pinClear">✕</button>
          <button class="pin-key" data-digit="0">0</button>
          <button class="pin-key pin-key-delete" id="pinDelete">⌫</button>
        </div>
        <button class="pin-close-btn" id="pinCloseBtn">✕ Cancel</button>
      </div>
    </div>`;
    }

    function buildParentViewHTML() {
        return `
    <div class="pv-overlay hidden" id="parentViewOverlay">
      <div class="pv-navbar">
        <span class="pv-brand">👨‍👩‍👧 Parent View — <strong id="pvChildName"></strong></span>
        <div class="pv-nav-right">
          <span class="pv-session-time" id="pvSessionTime">Session: 00:00</span>
          <button class="pv-exit-btn" id="pvExitBtn">✕ Exit Parent View</button>
        </div>
      </div>
      <div class="pv-content">
        <div class="pv-summary-strip" id="pvSummaryStrip"></div>
        <div class="pv-section" id="pvHeatmapSection"></div>
        <div class="pv-section" id="pvChartSection"></div>
        <div class="pv-section" id="pvAreasSection"></div>
        <div class="pv-section" id="pvMoodSection"></div>
        <div class="pv-section" id="pvStellaSection"></div>
        <div class="pv-section" id="pvBadgesSection"></div>
        <div class="pv-section pv-report-section" id="pvReportSection"></div>
      </div>
    </div>`;
    }

    function injectHTML() {
        if (!document.getElementById('pinOverlay')) {
            document.body.insertAdjacentHTML('beforeend', buildOverlayHTML());
        }
        if (!document.getElementById('parentViewOverlay')) {
            document.body.insertAdjacentHTML('beforeend', buildParentViewHTML());
        }
        // Wire up exit button
        const exitBtn = document.getElementById('pvExitBtn');
        if (exitBtn) exitBtn.addEventListener('click', ParentView.exit);
        attachPinListeners();
    }

    function attachPinListeners() {
        document.querySelectorAll('.pin-key[data-digit]').forEach(btn => {
            btn.addEventListener('click', () => handlePinDigit(btn.dataset.digit));
        });
        document.getElementById('pinDelete')?.addEventListener('click', handlePinDelete);
        document.getElementById('pinClear')?.addEventListener('click', handlePinClear);
        document.getElementById('pinCloseBtn')?.addEventListener('click', closePinOverlay);

        // Keyboard support
        document.addEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
        const overlay = document.getElementById('pinOverlay');
        if (!overlay?.classList.contains('visible')) return;
        if (e.key >= '0' && e.key <= '9') handlePinDigit(e.key);
        else if (e.key === 'Backspace') handlePinDelete();
        else if (e.key === 'Escape') closePinOverlay();
    }

    // ── PIN Digit Handling ─────────────────────────────────────────────────
    function handlePinDigit(digit) {
        if (PVState.pinDigits.length >= 4) return;
        const allKeys = document.querySelectorAll('.pin-key');
        allKeys.forEach(k => { if (k.disabled) return; });

        PVState.pinDigits.push(digit);
        updateDots();

        if (PVState.pinDigits.length === 4) {
            setTimeout(() => processPIN(), 120);
        }
    }

    function handlePinDelete() {
        PVState.pinDigits.pop();
        updateDots();
        setMessage('');
    }

    function handlePinClear() {
        PVState.pinDigits = [];
        updateDots();
        setMessage('');
    }

    function updateDots(color = null) {
        for (let i = 0; i < 4; i++) {
            const dot = document.getElementById(`dot${i}`);
            if (!dot) continue;
            dot.className = 'pin-dot';
            if (i < PVState.pinDigits.length) {
                dot.classList.add('filled');
                if (color) dot.classList.add(color);
            }
        }
    }

    function shakeDots(color = 'red') {
        const row = document.getElementById('pinDotsRow');
        updateDots(color);
        row.classList.add('shake');
        setTimeout(() => {
            row.classList.remove('shake');
            PVState.pinDigits = [];
            updateDots();
        }, 600);
    }

    function setMessage(msg, success = false) {
        const el = document.getElementById('pinMessage');
        if (!el) return;
        el.textContent = msg;
        el.className = 'pin-message' + (success ? ' success' : '');
    }

    function setNumpadDisabled(disabled) {
        document.querySelectorAll('.pin-key').forEach(k => k.disabled = disabled);
    }

    // ── PIN Flow ───────────────────────────────────────────────────────────
    async function processPIN() {
        const enteredPIN = PVState.pinDigits.join('');
        PVState.pinDigits = [];

        if (PVState.pinMode === 'entry') {
            await processEntryPIN(enteredPIN);
        } else {
            await processSetupPIN(enteredPIN);
        }
    }

    async function processEntryPIN(enteredPIN) {
        const storedHash = await getStoredPINHash();
        const enteredHash = await hashPIN(enteredPIN, PVState.userId);

        if (enteredHash === storedHash) {
            // Correct!
            updateDots('green');
            setTimeout(() => {
                saveSession();
                closePinOverlay();
                activateParentView();
            }, 300);
        } else {
            PVState.wrongAttempts++;
            shakeDots('red');

            if (PVState.wrongAttempts >= 3) {
                startLockout();
            } else {
                const left = 3 - PVState.wrongAttempts;
                setMessage(`Wrong PIN. ${left} tr${left === 1 ? 'y' : 'ies'} left.`);
                updateDots();
            }
        }
    }

    function startLockout() {
        setNumpadDisabled(true);
        PVState.wrongAttempts = 0;
        let remaining = PVState.lockoutSeconds;

        const update = () => {
            setMessage(`Too many tries. Try again in ${remaining}s`);
            if (remaining <= 0) {
                clearInterval(PVState.lockoutTimer);
                setNumpadDisabled(false);
                setMessage('');
                updateDots();
            }
            remaining--;
        };
        update();
        PVState.lockoutTimer = setInterval(update, 1000);
    }

    async function processSetupPIN(enteredPIN) {
        if (PVState.pinStep === 'ENTER_NEW') {
            PVState.firstPIN = enteredPIN;
            PVState.pinStep = 'CONFIRM_NEW';
            document.getElementById('pinSubtitle').textContent = 'Enter your PIN again to confirm';
            setMessage('Now confirm your PIN', true);
            updateDots();

        } else if (PVState.pinStep === 'CONFIRM_NEW') {
            const firstHash = await hashPIN(PVState.firstPIN, PVState.userId);
            const secondHash = await hashPIN(enteredPIN, PVState.userId);

            if (firstHash === secondHash) {
                // Match — save
                PVState.pinStep = 'SAVING';
                setMessage('Saving your PIN...', true);
                try {
                    await savePINHash(firstHash);
                    // Done
                    document.getElementById('pinEmoji').textContent = '✅';
                    document.getElementById('pinTitle').textContent = 'Parent View Ready!';
                    setMessage('Your PIN is set. Activating now...', true);
                    updateDots('green');
                    setTimeout(() => {
                        saveSession();
                        closePinOverlay();
                        activateParentView();
                    }, 1200);
                } catch {
                    setMessage('Save failed. Try again.');
                    PVState.pinStep = 'ENTER_NEW';
                }
            } else {
                // No match
                shakeDots('red');
                setTimeout(() => {
                    PVState.pinStep = 'ENTER_NEW';
                    document.getElementById('pinSubtitle').textContent = 'Choose a 4-digit PIN';
                    setMessage('PINs don\'t match! Try again');
                    PVState.firstPIN = null;
                    updateDots();
                }, 600);
            }
        }
    }

    // ── Show overlays ──────────────────────────────────────────────────────
    function showSetupOverlay() {
        PVState.pinMode = 'setup';
        PVState.pinStep = 'ENTER_NEW';
        PVState.pinDigits = [];
        PVState.firstPIN = null;

        document.getElementById('pinEmoji').textContent = '🔐';
        document.getElementById('pinTitle').textContent = 'Set Up Parent View';
        document.getElementById('pinSubtitle').textContent = 'Choose a 4-digit PIN';
        setMessage('');
        updateDots();
        setNumpadDisabled(false);
        showPinOverlay();
    }

    function showEntryOverlay() {
        PVState.pinMode = 'entry';
        PVState.wrongAttempts = 0;
        PVState.pinDigits = [];

        document.getElementById('pinEmoji').textContent = '🔐';
        document.getElementById('pinTitle').textContent = 'Parent View';
        document.getElementById('pinSubtitle').textContent = 'Enter your 4-digit PIN';
        setMessage('');
        updateDots();
        setNumpadDisabled(false);
        showPinOverlay();
    }

    function showPinOverlay() {
        const overlay = document.getElementById('pinOverlay');
        overlay.style.pointerEvents = 'all';
        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    function closePinOverlay() {
        const overlay = document.getElementById('pinOverlay');
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.style.pointerEvents = 'none'; }, 300);
        PVState.pinDigits = [];
        if (PVState.lockoutTimer) clearInterval(PVState.lockoutTimer);
        document.removeEventListener('keydown', onKeyDown);
    }

    // ── Activate Parent View ──────────────────────────────────────────────
    async function activateParentView() {
        PVState.isActive = true;
        PVState.sessionStart = Date.now();

        // Dim child dashboard
        const content = document.querySelector('.dashboard-main, main');
        if (content) content.classList.add('pv-dimmed');
        // Also dim nav, bg layers, footer
        document.querySelectorAll('.glass-nav, .grass-hills, .rainbow-arc, footer, .clouds-container, .floating-elements-container')
            .forEach(el => el.classList.add('pv-dimmed'));

        // Update navbar button
        const btn = document.getElementById('parentViewBtn');
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = '✓ Parent View ON';
        }

        // Fetch stella progress
        PVState.stellaProgress = await fetchStellaProgress();

        // Show overlay
        const overlay = document.getElementById('parentViewOverlay');
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('visible'));

        // Set child name
        document.getElementById('pvChildName').textContent = PVState.childData?.username || 'Your Child';

        // Start session timer
        startSessionTimer();

        // Render all sections
        renderSummaryStrip();
        renderHeatmap();
        renderPerformanceChart();
        renderAreas();
        renderMoodAnalysis();
        renderStellaProgress();
        renderBadgeTimeline();
        renderReportSection();
    }

    function startSessionTimer() {
        const el = document.getElementById('pvSessionTime');
        PVState.sessionTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - PVState.sessionStart) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            if (el) el.textContent = `Session: ${m}:${s}`;
        }, 1000);
    }

    // ── Analytics Helpers ─────────────────────────────────────────────────
    function calculateStreak(history) {
        if (!history || !history.length) return 0;
        const dates = [...new Set(
            history.map(q => {
                const d = new Date(q.created_at || q.date || Date.now());
                return d.toISOString().split('T')[0];
            })
        )].sort().reverse();

        let streak = 0;
        let today = new Date().toISOString().split('T')[0];
        const diffFirst = Math.abs(new Date(today) - new Date(dates[0])) / 86400000;
        if (diffFirst > 1) return 0;
        streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const diff = (new Date(dates[i]) - new Date(dates[i + 1])) / 86400000;
            if (Math.round(diff) === 1) streak++;
            else break;
        }
        return streak;
    }

    function calcOverallAccuracy(history) {
        if (!history || !history.length) return 0;
        const with_pct = history.filter(q => q.score_percentage != null);
        if (!with_pct.length) {
            const w_pct = history.filter(q => q.percentage != null);
            if (!w_pct.length) return 0;
            return Math.round(w_pct.reduce((a, q) => a + q.percentage, 0) / w_pct.length);
        }
        return Math.round(with_pct.reduce((a, q) => a + q.score_percentage, 0) / with_pct.length);
    }

    function getQuizPct(q) {
        return q.score_percentage ?? q.percentage ?? 0;
    }

    function getQuizDate(q) {
        return new Date(q.created_at || q.date || Date.now());
    }

    function getQuizModule(q) {
        return (q.module || q.quiz_type || '').toLowerCase().replace(/-/g, '_').replace(/\s/g, '_');
    }

    // ── Summary Strip ─────────────────────────────────────────────────────
    function renderSummaryStrip() {
        const h = PVState.quizHistory;
        const now = new Date();
        const weekAgo = new Date(now - 7 * 86400000);
        const twoWeeksAgo = new Date(now - 14 * 86400000);

        const weeklyQuizzes = h.filter(q => getQuizDate(q) >= weekAgo).length;
        const prevWeekQuizzes = h.filter(q => {
            const d = getQuizDate(q);
            return d >= twoWeeksAgo && d < weekAgo;
        }).length;
        const weeklyTrend = weeklyQuizzes >= prevWeekQuizzes ? '↑' : '↓';
        const weeklyMinutes = Math.round(weeklyQuizzes * 7);
        const overallAccuracy = calcOverallAccuracy(h);
        const streak = calculateStreak(h);

        let accColor = 'green';
        if (overallAccuracy < 60) accColor = 'red';
        else if (overallAccuracy < 80) accColor = 'amber';

        const strip = document.getElementById('pvSummaryStrip');
        strip.innerHTML = `
      <div class="pv-stat-card purple">
        <span class="pv-stat-icon">⏱️</span>
        <span class="pv-stat-value">~${weeklyMinutes}</span>
        <span class="pv-stat-label">mins this week</span>
      </div>
      <div class="pv-stat-card blue">
        <span class="pv-stat-icon">📝</span>
        <span class="pv-stat-value">${weeklyQuizzes}</span>
        <span class="pv-stat-label">quizzes this week ${weeklyTrend} vs last</span>
      </div>
      <div class="pv-stat-card ${accColor}">
        <span class="pv-stat-icon">🎯</span>
        <span class="pv-stat-value">${overallAccuracy}%</span>
        <span class="pv-stat-label">overall accuracy</span>
      </div>
      <div class="pv-stat-card orange">
        <span class="pv-stat-icon">🔥</span>
        <span class="pv-stat-value">${streak}</span>
        <span class="pv-stat-label">day learning streak</span>
      </div>
    `;
    }

    // ── Heatmap ───────────────────────────────────────────────────────────
    function renderHeatmap() {
        const h = PVState.quizHistory;
        const section = document.getElementById('pvHeatmapSection');
        const dateCounts = {};

        h.forEach(q => {
            const d = getQuizDate(q).toISOString().split('T')[0];
            dateCounts[d] = (dateCounts[d] || 0) + 1;
        });

        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        let cells = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 27; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const count = dateCounts[key] || 0;
            const cls = count === 0 ? 'pv-heat-0'
                : count === 1 ? 'pv-heat-1'
                    : count === 2 ? 'pv-heat-2'
                        : 'pv-heat-3';
            const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            cells += `<div class="pv-heat-cell ${cls}" title="${label}: ${count} quiz${count !== 1 ? 'zes' : ''}"></div>`;
        }

        section.innerHTML = `
      <h3 class="pv-section-title">📅 Activity — Last 28 Days</h3>
      <div class="pv-heat-day-labels">
        ${days.map(d => `<span class="pv-heat-day-label">${d}</span>`).join('')}
      </div>
      <div class="pv-heatmap-grid">${cells}</div>
      <div class="pv-heatmap-legend">
        <span>Less</span>
        <div class="pv-heat-legend-cell pv-heat-0"></div>
        <div class="pv-heat-legend-cell pv-heat-1"></div>
        <div class="pv-heat-legend-cell pv-heat-2"></div>
        <div class="pv-heat-legend-cell pv-heat-3"></div>
        <span>More</span>
      </div>
    `;
    }

    // ── Performance Chart ─────────────────────────────────────────────────
    function renderPerformanceChart() {
        const h = PVState.quizHistory;
        const section = document.getElementById('pvChartSection');

        const mathData = h.filter(q => getQuizModule(q).includes('math')).slice(-15);
        const englishData = h.filter(q => getQuizModule(q).includes('english')).slice(-15);
        const gkData = h.filter(q =>
            getQuizModule(q).includes('general') || getQuizModule(q).includes('gk')
        ).slice(-15);

        const toDataset = (arr, label, color) => ({
            label,
            data: arr.map((q, i) => ({ x: i, y: getQuizPct(q) })),
            borderColor: color,
            backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
            tension: 0.4,
            pointRadius: 4,
            fill: true,
        });

        // Trend generator
        const trendText = (data, label) => {
            if (data.length < 4) return '';
            const half = Math.floor(data.length / 2);
            const first = data.slice(0, half).reduce((s, q) => s + getQuizPct(q), 0) / half;
            const second = data.slice(half).reduce((s, q) => s + getQuizPct(q), 0) / (data.length - half);
            const diff = second - first;
            if (diff > 5) return `<span class="pv-trend-pill">📈 ${label}: improving!</span>`;
            if (diff < -5) return `<span class="pv-trend-pill">📉 ${label}: needs attention</span>`;
            return `<span class="pv-trend-pill">➡️ ${label}: steady</span>`;
        };

        const trends = [
            trendText(mathData, 'Mathematics'),
            trendText(englishData, 'English'),
            trendText(gkData, 'General Knowledge'),
        ].filter(Boolean).join('');

        section.innerHTML = `
      <h3 class="pv-section-title">📈 Score Progress Over Time</h3>
      <div class="pv-chart-container"><canvas id="pvPerfChart"></canvas></div>
      <div class="pv-trend-list">${trends || '<span class="pv-stat-label">Complete more quizzes to see trends!</span>'}</div>
    `;

        if (window.Chart) {
            if (PVState.performanceChart) PVState.performanceChart.destroy();
            const ctx = document.getElementById('pvPerfChart').getContext('2d');
            PVState.performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        toDataset(mathData, 'Mathematics', 'rgb(124, 58, 237)'),
                        toDataset(englishData, 'English', 'rgb(236, 72, 153)'),
                        toDataset(gkData, 'General Knowledge', 'rgb(59, 130, 246)'),
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 100, title: { display: true, text: 'Score %' } },
                        x: { type: 'linear', title: { display: true, text: 'Quiz #' } }
                    },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                            }
                        }
                    }
                }
            });
        } else {
            document.getElementById('pvPerfChart').parentElement.innerHTML =
                '<p class="pv-stat-label">Chart.js not loaded. Please add Chart.js CDN to your HTML.</p>';
        }
    }

    // ── Weak & Strong Areas ───────────────────────────────────────────────
    function renderAreas() {
        const h = PVState.quizHistory;
        const section = document.getElementById('pvAreasSection');

        const moduleAcc = {};
        h.forEach(q => {
            const m = getQuizModule(q) || 'general';
            if (!moduleAcc[m]) moduleAcc[m] = { total: 0, count: 0 };
            moduleAcc[m].total += getQuizPct(q);
            moduleAcc[m].count++;
        });

        if (!Object.keys(moduleAcc).length) {
            section.innerHTML = `<h3 class="pv-section-title">🎯 Strengths & Areas to Improve</h3>
        <p class="pv-stat-label">No quiz history yet. Start quizzing to see insights!</p>`;
            return;
        }

        const tips = {
            mathematics: '💡 Tip: Try 10 minutes of math puzzles daily',
            english: '💡 Tip: Reading together for 10 mins helps a lot!',
            general_knowledge: '💡 Tip: Watch fun educational videos together',
        };

        const sorted = Object.entries(moduleAcc)
            .map(([name, d]) => ({ name, acc: Math.round(d.total / d.count) }))
            .sort((a, b) => a.acc - b.acc);

        const weak = sorted.slice(0, Math.min(3, sorted.length));
        const strong = sorted.slice(-Math.min(3, sorted.length)).reverse();

        const formatName = n => n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const weakHTML = weak.map(a => `
      <div class="pv-area-card weak">
        <div class="pv-area-name">${formatName(a.name)}</div>
        <div class="pv-area-acc">Accuracy: ${a.acc}%</div>
        <div class="pv-progress-bar"><div class="pv-progress-fill" style="width:${a.acc}%"></div></div>
        <div class="pv-area-tip">${tips[a.name] || '💡 Tip: Practice makes perfect!'}</div>
      </div>`).join('');

        const strongHTML = strong.map(a => `
      <div class="pv-area-card strong">
        <div class="pv-area-name">${formatName(a.name)}</div>
        <div class="pv-area-acc">Accuracy: ${a.acc}%</div>
        <div class="pv-progress-bar"><div class="pv-progress-fill" style="width:${a.acc}%"></div></div>
        <div class="pv-area-tip">🌟 Keep it up!</div>
      </div>`).join('');

        section.innerHTML = `
      <h3 class="pv-section-title">🎯 Strengths & Areas to Improve</h3>
      <div class="pv-areas-grid">
        <div>
          <div class="pv-area-section-title" style="color:#EF4444">🔴 Could Improve</div>
          ${weakHTML}
        </div>
        <div>
          <div class="pv-area-section-title" style="color:#10B981">🟢 Doing Great</div>
          ${strongHTML}
        </div>
      </div>
    `;
    }

    // ── Mood Analysis ─────────────────────────────────────────────────────
    function renderMoodAnalysis() {
        const h = PVState.quizHistory;
        const section = document.getElementById('pvMoodSection');
        const withMood = h.filter(q => q.mood);

        if (withMood.length < 5) {
            section.innerHTML = `
        <h3 class="pv-section-title">😊 Mood & Learning Connection</h3>
        <p class="pv-stat-label">Mood tracking will appear here after more quizzes with mood data.</p>
      `;
            return;
        }

        const moodData = {};
        withMood.forEach(q => {
            if (!moodData[q.mood]) moodData[q.mood] = [];
            moodData[q.mood].push(getQuizPct(q));
        });

        const moodColors = {
            amazing: '#FFD93D', good: '#10B981', okay: '#3B82F6',
            not_great: '#F97316', tired: '#9CA3AF'
        };

        const labels = Object.keys(moodData);
        const avgs = labels.map(m => Math.round(
            moodData[m].reduce((a, b) => a + b, 0) / moodData[m].length
        ));
        const colors = labels.map(m => moodColors[m] || '#6B7280');
        const bestMood = labels[avgs.indexOf(Math.max(...avgs))];
        const childName = PVState.childData?.username || 'Your child';

        section.innerHTML = `
      <h3 class="pv-section-title">😊 Mood & Learning Connection</h3>
      <div class="pv-mood-chart-container"><canvas id="pvMoodChart"></canvas></div>
      <div class="pv-mood-insight">
        💡 ${childName} performs best when feeling <strong>${bestMood?.replace('_', ' ')}</strong>!
        Consider quiz timing around their energy levels.
      </div>
    `;

        if (window.Chart) {
            if (PVState.moodChart) PVState.moodChart.destroy();
            const ctx = document.getElementById('pvMoodChart').getContext('2d');
            PVState.moodChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Avg Score by Mood',
                        data: avgs,
                        backgroundColor: colors,
                        borderRadius: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Avg Score %' } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    // ── Nova Progress ──────────────────────────────────────────────────────
    function renderStellaProgress() {
        const np = PVState.stellaProgress;
        const section = document.getElementById('pvStellaSection');
        const childName = PVState.childData?.username || 'Your child';

        if (!np || np.total_sessions === 0) {
            section.innerHTML = `
        <h3 class="pv-section-title">✨ English Speaking Progress (Stella AI)</h3>
        <div class="pv-stella-empty">
          <p>Stella AI English Coach hasn't been used yet.</p>
          <p>Encourage ${childName} to try it!</p>
          <button class="pv-stella-learn-btn" onclick="ParentView.exit(); setTimeout(() => window.location.href='stella.html', 600)">
            Learn about Stella →
          </button>
        </div>
      `;
            return;
        }

        const levelNames = ['', 'Beginner', 'Explorer', 'Adventurer', 'Champion', 'Master'];
        const level = np.current_level || 1;
        const lvlName = levelNames[level] || 'Beginner';
        const wordsLearned = np.words_learned || [];
        const totalWords = Array.isArray(wordsLearned) ? wordsLearned.length : 0;
        const lastWords = (Array.isArray(wordsLearned) ? wordsLearned : []).slice(-8);

        const lastDate = np.last_session_date
            ? new Date(np.last_session_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
            : 'N/A';

        const sessionsForLevel = 5;
        const progressPct = Math.min(100, ((np.total_sessions % sessionsForLevel) / sessionsForLevel) * 100);

        const pillsHTML = lastWords.map(w =>
            `<span class="pv-word-pill">${typeof w === 'string' ? w : w.word || w}</span>`
        ).join('');

        section.innerHTML = `
      <h3 class="pv-section-title">✨ English Speaking Progress (Stella AI)</h3>
      <div class="pv-stella-grid">
        <div>
          <div class="pv-stella-level-badge">
            <span class="pv-stella-level-num">${level}</span>
            <span class="pv-stella-level-name">${lvlName}</span>
          </div>
          <div class="pv-stella-meta">
            <span>🗣️ ${np.total_sessions} conversation${np.total_sessions !== 1 ? 's' : ''}</span>
            <span>📅 Last chatted: ${lastDate}</span>
            <span>🔥 ${np.session_streak || 0} day streak</span>
          </div>
          <div class="pv-stella-prog-label">Progress to Level ${Math.min(5, level + 1)}:</div>
          <div class="pv-stella-prog-bar">
            <div class="pv-stella-prog-fill" style="width:${progressPct}%"></div>
          </div>
        </div>
        <div>
          <div class="pv-words-title">📚 Words Learned Recently</div>
          <div class="pv-words-pills">
            ${pillsHTML || '<span class="pv-stat-label">No words tracked yet</span>'}
          </div>
          <div class="pv-stella-total-words">📖 ${totalWords} total words learned</div>
        </div>
      </div>
    `;
    }

    // ── Badge Timeline ─────────────────────────────────────────────────────
    function renderBadgeTimeline() {
        const badges = PVState.badges;
        const section = document.getElementById('pvBadgesSection');

        if (!badges || badges.length === 0) {
            section.innerHTML = `
        <h3 class="pv-section-title">🏆 Achievements Earned</h3>
        <p class="pv-stat-label">No badges yet — complete quizzes to earn them!</p>
      `;
            return;
        }

        const sorted = [...badges].sort((a, b) =>
            new Date(a.earned_at || a.created_at || 0) - new Date(b.earned_at || b.created_at || 0)
        );

        const itemsHTML = sorted.map(b => {
            const date = b.earned_at || b.created_at
                ? new Date(b.earned_at || b.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
            return `
        <div class="pv-badge-item">
          <div class="pv-badge-dot"></div>
          <span class="pv-badge-emoji">${b.emoji || b.icon || '🏅'}</span>
          <div class="pv-badge-info">
            <div class="pv-badge-name">${b.name}</div>
            ${date ? `<div class="pv-badge-date">Earned on ${date}</div>` : ''}
          </div>
        </div>
      `;
        }).join('');

        section.innerHTML = `
      <h3 class="pv-section-title">🏆 Achievements Earned</h3>
      <div class="pv-badge-timeline">${itemsHTML}</div>
    `;
    }

    // ── Email Report ───────────────────────────────────────────────────────
    function renderReportSection() {
        const section = document.getElementById('pvReportSection');
        const childName = PVState.childData?.username || 'Your child';
        section.innerHTML = `
      <h3 class="pv-report-title">📊 Share Progress Report</h3>
      <p class="pv-report-sub">Email yourself a summary of ${childName}'s progress</p>
      <button class="pv-email-btn" id="pvEmailBtn">📧 Send Progress Report</button>
    `;
        document.getElementById('pvEmailBtn')?.addEventListener('click', generateAndEmailReport);
    }

    function generateAndEmailReport() {
        const h = PVState.quizHistory;
        const ud = PVState.childData;
        const np = PVState.stellaProgress;
        const badges = PVState.badges;

        const reportDate = new Date().toLocaleDateString();
        const childName = ud?.username || 'Your child';
        const totalPoints = ud?.stats?.totalPoints || ud?.total_points || 0;
        const quizzesTotal = ud?.stats?.quizzesCompleted || ud?.quizzes_completed || h.length;
        const overallAccuracy = calcOverallAccuracy(h);
        const streak = calculateStreak(h);
        const stellaLevel = np ? `Level ${np.current_level} — ${['', 'Beginner', 'Explorer', 'Adventurer', 'Champion', 'Master'][np.current_level]}` : 'Not started';

        const now = new Date();
        const weekAgo = new Date(now - 7 * 86400000);
        const weeklyQuizzes = h.filter(q => getQuizDate(q) >= weekAgo).length;
        const weeklyMins = weeklyQuizzes * 7;

        const moduleAcc = {};
        h.forEach(q => {
            const m = getQuizModule(q);
            if (!moduleAcc[m]) moduleAcc[m] = { total: 0, count: 0 };
            moduleAcc[m].total += getQuizPct(q);
            moduleAcc[m].count++;
        });

        const sorted = Object.entries(moduleAcc)
            .map(([n, d]) => ({ name: n, accuracy: Math.round(d.total / d.count) }))
            .sort((a, b) => a.accuracy - b.accuracy);

        const weakAreas = sorted.slice(0, 2);
        const strongAreas = sorted.slice(-2).reverse();

        const mathAcc = moduleAcc['mathematics'] ? Math.round(moduleAcc['mathematics'].total / moduleAcc['mathematics'].count) : 'N/A';
        const engAcc = moduleAcc['english'] ? Math.round(moduleAcc['english'].total / moduleAcc['english'].count) : 'N/A';
        const gkAcc = moduleAcc['general_knowledge'] ? Math.round(moduleAcc['general_knowledge'].total / moduleAcc['general_knowledge'].count) : 'N/A';

        const body = `EduPlay Progress Report for ${childName}
Generated: ${reportDate}
=====================================

SUMMARY
-------
Total Points: ${totalPoints}
Quizzes Completed: ${quizzesTotal}
Overall Accuracy: ${overallAccuracy}%
Learning Streak: ${streak} days
English Level (Stella AI): ${stellaLevel}

THIS WEEK
---------
Quizzes this week: ${weeklyQuizzes}
Time learning: ~${weeklyMins} minutes

SUBJECT PERFORMANCE
-------------------
Mathematics: ${mathAcc}${typeof mathAcc === 'number' ? '%' : ''}
English: ${engAcc}${typeof engAcc === 'number' ? '%' : ''}
General Knowledge: ${gkAcc}${typeof gkAcc === 'number' ? '%' : ''}

STRENGTHS
---------
${strongAreas.map(a => '✓ ' + a.name.replace(/_/g, ' ') + ': ' + a.accuracy + '%').join('\n')}

AREAS TO IMPROVE
----------------
${weakAreas.map(a => '• ' + a.name.replace(/_/g, ' ') + ': ' + a.accuracy + '%').join('\n')}

RECENT ACHIEVEMENTS
-------------------
${(badges || []).slice(-3).map(b => '🏆 ' + b.name).join('\n') || 'Keep quizzing to earn badges!'}

RECOMMENDATIONS
---------------
- Encourage daily 10-minute learning sessions
- Focus on: ${weakAreas[0]?.name?.replace(/_/g, ' ') || 'all subjects equally'}
- ${!np ? 'Try Stella AI English Coach for speaking practice' : 'Continue Stella AI sessions to reach Level ' + Math.min(5, (np.current_level || 1) + 1)}

---
Generated by EduPlay — Learning made fun!`;

        const subject = `${childName}'s EduPlay Progress Report — ${reportDate}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }

    // ── Exit ────────────────────────────────────────────────────────────────
    function exitParentView() {
        if (!PVState.isActive) return;

        const durationSeconds = Math.floor((Date.now() - PVState.sessionStart) / 1000);
        clearInterval(PVState.sessionTimerInterval);

        // Log session asynchronously
        logParentViewSession(durationSeconds);

        // Transition overlay out
        const overlay = document.getElementById('parentViewOverlay');
        overlay.classList.remove('visible');
        setTimeout(() => overlay.classList.add('hidden'), 500);

        // Remove dimming
        document.querySelectorAll('.pv-dimmed').forEach(el => el.classList.remove('pv-dimmed'));

        // Restore navbar button
        const btn = document.getElementById('parentViewBtn');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '👨‍👩‍👧 Parent View';
        }

        // Clear session
        clearSession();
        PVState.isActive = false;
    }

    // ── Public API ──────────────────────────────────────────────────────────
    const ParentView = {
        /**
         * Call this once on dashboard load.
         * @param {object} supabase - supabase client
         * @param {string} userId - auth uid
         * @param {object} childData - { username, stats, ... }
         * @param {array}  quizHistory - array of quiz_history rows
         * @param {array}  badges - array of badge objects
         */
        init(supabase, userId, childData, quizHistory = [], badges = []) {
            PVState.supabase = supabase;
            PVState.userId = userId;
            PVState.childData = childData;
            PVState.quizHistory = quizHistory;
            PVState.badges = badges;
            injectHTML();

            // Restore parent session if still valid
            if (isSessionActive()) {
                activateParentView();
                const toast = document.createElement('div');
                toast.style.cssText = `
          position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
          background:#10B981;color:white;padding:10px 22px;border-radius:50px;
          font-family:'Nunito',sans-serif;font-weight:700;z-index:9999;
          box-shadow:0 4px 15px rgba(16,185,129,0.4);`;
                toast.textContent = '✓ Parent View restored';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        },

        async handleNavbarClick() {
            if (!PVState.supabase) return; // Prevent errors if not initialized

            // If session is active
            if (isSessionActive()) {
                if (PVState.isActive) exitParentView();
                else activateParentView();
                return;
            }

            // Check if PIN exists
            const stored = await getStoredPINHash();
            if (!stored) showSetupOverlay();
            else showEntryOverlay();
        },

        exit: exitParentView,
    };

    window.ParentView = ParentView;
})();
