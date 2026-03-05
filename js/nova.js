/**
 * EduPlay — Nova AI English Coach
 * js/nova.js
 *
 * Complete engine: Groq integration, voice input/output,
 * English level system, session management, Supabase sync.
 *
 * Requires:
 *   - CONFIG.GROQ_API_KEY (from config.js)
 *   - CONFIG.GROQ_ENDPOINT (from config.js)
 *   - CONFIG.SUPABASE_URL / CONFIG.SUPABASE_ANON_KEY (from config.js)
 *   - CONFIG.NOVA_API_KEY (optional — placeholder for future TTS API)
 *   - window.eduplay from auth.js
 */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────
    const LEVEL_CONFIGS = {
        1: { name: 'Beginner', emoji: '🌱', class: 'nova-level-1', sessionsToNext: 5 },
        2: { name: 'Explorer', emoji: '🔍', class: 'nova-level-2', sessionsToNext: 8 },
        3: { name: 'Adventurer', emoji: '⚡', class: 'nova-level-3', sessionsToNext: 10 },
        4: { name: 'Champion', emoji: '🏆', class: 'nova-level-4', sessionsToNext: 12 },
        5: { name: 'Master', emoji: '👑', class: 'nova-level-5', sessionsToNext: 999 },
    };

    const TOPICS = {
        1: 'favorite colors, animals, food, family members, numbers',
        2: 'school day, hobbies, games, weekend activities, pets',
        3: 'favorite stories, dreams, movies, describing places',
        4: 'opinions on topics, future plans, creative scenarios',
        5: 'debates, storytelling, hypothetical situations, word games',
    };

    const CONFETTI_COLORS = ['#FFD93D', '#FF6B35', '#7C3AED', '#10B981', '#EC4899', '#3B82F6'];

    // ── State ──────────────────────────────────────────────────────────────
    const NovaState = {
        supabase: null,
        userId: null,
        childData: {},
        progress: null,
        currentLevel: 1,
        levelAtSessionStart: 1,
        conversationHistory: [],
        recentAssessments: [],
        sessionWords: [],
        sessionCorrections: 0,
        sessionStart: null,
        sessionTimer: null,
        messageCount: 0,
        voiceEnabled: true,
        isSpeaking: false,
        currentAudioSource: null,
        currentAudio: null,
        isProcessing: false,
        diagnosticStep: 0,
        isDiagnosticMode: false,
        recognition: null,
        isRecording: false,
        autoSendTimer: null,
        lastChildMessage: '',
        leveledUp: false,
        newLevelAfterUp: 1,
    };

    // ── Supabase helpers ──────────────────────────────────────────────────
    function getSupabase() {
        if (NovaState.supabase) return NovaState.supabase;
        if (window.supabase && window.CONFIG) {
            NovaState.supabase = window.supabase.createClient(
                window.CONFIG.SUPABASE_URL,
                window.CONFIG.SUPABASE_ANON_KEY
            );
        }
        return NovaState.supabase;
    }

    async function loadProgress() {
        try {
            const sb = getSupabase();
            const { data } = await sb
                .from('user_english_progress')
                .select('*')
                .eq('user_id', NovaState.userId)
                .single();
            return data;
        } catch { return null; }
    }

    async function saveProgressToSupabase() {
        try {
            const sb = getSupabase();
            const np = NovaState.progress;
            const wordsArr = np?.words_learned || [];

            // Merge new session words into progress words
            NovaState.sessionWords.forEach(w => {
                const word = typeof w === 'string' ? w : w.word;
                if (!word) return;
                const existing = wordsArr.findIndex(x => (typeof x === 'string' ? x : x.word) === word);
                if (existing === -1) wordsArr.push(w);
            });

            const upsertData = {
                user_id: NovaState.userId,
                current_level: NovaState.currentLevel,
                max_level_reached: Math.max(NovaState.currentLevel, np?.max_level_reached || 1),
                total_sessions: (np?.total_sessions || 0) + 1,
                total_messages: (np?.total_messages || 0) + NovaState.messageCount,
                words_learned: wordsArr,
                focus_areas: getLastFocusAreas(),
                last_session_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
            };

            // Update streak
            const lastDate = np?.last_session_date;
            if (lastDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastDate === yesterday.toISOString().split('T')[0]) {
                    upsertData.session_streak = (np?.session_streak || 0) + 1;
                } else if (lastDate !== new Date().toISOString().split('T')[0]) {
                    upsertData.session_streak = 1;
                } else {
                    upsertData.session_streak = np?.session_streak || 1;
                }
            } else {
                upsertData.session_streak = 1;
            }

            await sb.from('user_english_progress').upsert(upsertData, { onConflict: 'user_id' });
        } catch (e) { console.warn('Nova: save progress failed', e); }
    }

    async function saveNovaSession() {
        try {
            const sb = getSupabase();
            const duration = Math.floor((Date.now() - NovaState.sessionStart) / 1000);
            const { data } = await sb.from('nova_sessions').insert({
                user_id: NovaState.userId,
                duration_seconds: duration,
                message_count: NovaState.messageCount,
                level_at_start: NovaState.levelAtSessionStart,
                level_at_end: NovaState.currentLevel,
                words_learned: NovaState.sessionWords,
                corrections_count: NovaState.sessionCorrections,
                focus_areas: getLastFocusAreas(),
            }).select().single();

            // Save individual vocab entries
            if (NovaState.sessionWords.length > 0) {
                const vocabItems = NovaState.sessionWords.map(w => ({
                    user_id: NovaState.userId,
                    word: typeof w === 'string' ? w : w.word,
                    definition: w.definition || null,
                    example_sentence: w.example || null,
                    session_id: data?.id || null,
                })).filter(v => v.word);

                if (vocabItems.length) {
                    await sb.from('nova_vocabulary').upsert(vocabItems, {
                        onConflict: 'user_id,word',
                        ignoreDuplicates: false,
                    });
                }
            }

            return data;
        } catch (e) { console.warn('Nova: save session failed', e); return null; }
    }

    function getLastFocusAreas() {
        const last = NovaState.recentAssessments.slice(-2);
        const areas = [];
        last.forEach(a => { if (a.nextFocusAreas) areas.push(...a.nextFocusAreas); });
        return [...new Set(areas)].slice(0, 4);
    }

    // ── Groq API ──────────────────────────────────────────────────────────
    function buildSystemPrompt() {
        const c = NovaState.childData;
        const lvl = NovaState.currentLevel;
        const levelDesc = {
            1: 'uses very short phrases (1-5 words), basic vocabulary only',
            2: 'forms simple sentences (5-8 words), makes basic grammar errors',
            3: 'writes multi-word sentences, mixes tenses sometimes',
            4: 'uses complex sentences, mostly correct grammar',
            5: 'writes with near-perfect grammar and rich vocabulary',
        };
        const focuses = getLastFocusAreas();

        return `You are Nova, a patient and encouraging English learning companion for children. You are talking with ${c.username || 'the student'}, aged ${c.age || 8}. Their current English level is ${lvl} out of 5 (${LEVEL_CONFIGS[lvl].name}).

At this level, ${c.username || 'the student'} typically ${levelDesc[lvl]}.

YOUR RULES:
1. Keep ALL responses under 3 sentences
2. Match your vocabulary to their level exactly
3. Never use the word "wrong" — say "good try!" or "almost!"
4. Use their name naturally every 2-3 messages
5. If they make a grammar mistake: weave the correction naturally into your next sentence without pointing it out directly
   EXAMPLE: Child says "I goed to park" → Nova says "Oh fun! I love when kids go to the park! 🎉 What did you do there?"
6. Introduce exactly ONE new vocabulary word per 3-4 messages, naturally in context
7. Add 1-2 emojis per message, never more
8. Ask ONE question at the end of each message

TEACHING TOPICS for Level ${lvl}: ${TOPICS[lvl]}
TODAY'S FOCUS AREAS: ${focuses.length ? focuses.join(', ') : 'general conversation'}

You MUST respond in this exact JSON format:
{
  "message": "Your response to the child (max 3 sentences)",
  "corrections": [
    {
      "original": "exactly what child said incorrectly",
      "corrected": "the correct version",
      "tip": "simple 5-word explanation"
    }
  ],
  "newWords": [
    {
      "word": "new word you introduced",
      "definition": "definition in 5 words or less",
      "example": "simple example sentence"
    }
  ],
  "assessment": {
    "sentenceLength": 1,
    "vocabularyRange": 1,
    "grammarAccuracy": 1,
    "confidence": 1,
    "suggestedLevel": 1,
    "nextFocusAreas": ["area1", "area2"]
  }
}`;
    }

    async function callNova(userMessage) {
        const GROQ_API_KEY = window.CONFIG?.GROQ_API_KEY;
        const GROQ_ENDPOINT = window.CONFIG?.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
        const GROQ_MODEL = window.CONFIG?.GROQ_MODEL || 'llama-3.3-70b-versatile';

        if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            ...NovaState.conversationHistory.slice(-10).map(m => ({
                role: m.sender === 'nova' ? 'assistant' : 'user',
                content: m.text,
            })),
            { role: 'user', content: userMessage },
        ];

        const resp = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 0.75,
                max_tokens: 500,
                response_format: { type: 'json_object' },
            }),
        });

        if (!resp.ok) throw new Error(`Groq error: ${resp.status}`);
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';

        try {
            return JSON.parse(content);
        } catch {
            // Try extract JSON
            const match = content.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            // Fallback
            return {
                message: content || "Hmm, let me think... 💭 Tell me more!",
                corrections: [],
                newWords: [],
                assessment: {
                    sentenceLength: 2, vocabularyRange: 2, grammarAccuracy: 2,
                    confidence: 3, suggestedLevel: NovaState.currentLevel,
                    nextFocusAreas: [],
                },
            };
        }
    }

    // ── Opening Message ───────────────────────────────────────────────────
    function buildOpeningMessage() {
        const p = NovaState.progress;
        const c = NovaState.childData;
        const name = c?.username || 'friend';

        if (!p || p.total_sessions === 0) {
            NovaState.isDiagnosticMode = true;
            NovaState.diagnosticStep = 1;
            return {
                message: `Hi ${name}! I'm Nova, your English learning star! ✨ I'm SO excited to chat with you! Tell me — what's your favorite animal? 🐾`,
                isDiagnostic: true,
            };
        }

        const lastDate = p.last_session_date ? new Date(p.last_session_date) : null;
        const daysSince = lastDate
            ? Math.floor((Date.now() - lastDate) / 86400000)
            : 999;

        if (daysSince > 3) {
            return { message: `${name}! You're back! 🌟 I missed our chats! Ready to practice some amazing English today? Tell me — what's the most interesting thing that happened to you recently?` };
        }

        const lastTopic = p.last_topic || 'fun topics';
        return { message: `Welcome back ${name}! Last time we talked about ${lastTopic}. Today I have some fun new words for you! 🌟 First tell me — how was your day?` };
    }

    // ── UI Helpers ─────────────────────────────────────────────────────────
    function setNovaState(state) {
        const char = document.getElementById('novaCharacter');
        if (!char) return;
        char.className = `nova-char nova-${state}`;
    }

    function setStatus(text) {
        const el = document.getElementById('novaStatusText');
        if (el) el.textContent = text;
    }

    function updateLevelUI(level, animate = false) {
        const cfg = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[1];
        const badge = document.getElementById('novaLevelBadge');
        const emoji = document.getElementById('novaLevelEmoji');
        const name = document.getElementById('novaLevelName');
        const num = document.getElementById('novaLevelNum');
        const bar = document.getElementById('novaXPBar');
        const label = document.getElementById('novaXPLabel');

        if (emoji) emoji.textContent = cfg.emoji;
        if (name) name.textContent = cfg.name;
        if (num) num.textContent = level;

        if (badge) {
            badge.className = `nova-level-badge ${cfg.class}`;
            if (animate) {
                badge.style.transform = 'scale(1.3)';
                setTimeout(() => { badge.style.transform = 'scale(1)'; badge.style.transition = 'transform 0.4s ease'; }, 100);
            }
        }

        // XP bar: based on total sessions mod sessions_to_next
        const p = NovaState.progress;
        if (bar && p) {
            const sessForLevel = cfg.sessionsToNext;
            const pct = Math.min(100, ((p.total_sessions % sessForLevel) / sessForLevel) * 100);
            bar.style.width = pct + '%';
        }

        if (label && level < 5) label.textContent = `Keep chatting to reach ${LEVEL_CONFIGS[level + 1]?.name}!`;
        else if (label) label.textContent = '🏆 Max level reached!';
    }

    function renderLeftPanelStats() {
        const p = NovaState.progress;
        const sessions = document.getElementById('statSessions');
        const words = document.getElementById('statWords');
        const streak = document.getElementById('statStreak');

        if (sessions) sessions.textContent = p?.total_sessions || 0;
        if (words) words.textContent = Array.isArray(p?.words_learned) ? p.words_learned.length : 0;
        if (streak) streak.textContent = p?.session_streak || 0;

        const focusEl = document.getElementById('novaFocusItems');
        if (focusEl) {
            const focuses = getLastFocusAreas();
            if (focuses.length) {
                focusEl.innerHTML = focuses.map(f =>
                    `<div class="nova-focus-item">✨ ${f.replace(/_/g, ' ')}</div>`
                ).join('');
            }
        }
    }

    // ── Display Messages ──────────────────────────────────────────────────
    function showTypingIndicator() {
        const area = document.getElementById('novaChatArea');
        const typing = document.createElement('div');
        typing.className = 'nova-typing';
        typing.id = 'novaTyping';
        typing.innerHTML = `
      <span class="nova-avatar">✨</span>
      <div class="nova-typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
        area.appendChild(typing);
        area.scrollTop = area.scrollHeight;
        return typing;
    }

    function removeTypingIndicator() {
        document.getElementById('novaTyping')?.remove();
    }

    function displayChildMessage(text) {
        const area = document.getElementById('novaChatArea');
        const wrap = document.createElement('div');
        wrap.className = 'child-bubble';
        wrap.innerHTML = `<span class="child-bubble-text">${escapeHTML(text)}</span>`;
        area.appendChild(wrap);
        area.scrollTop = area.scrollHeight;
        return wrap;
    }

    function displayNovaMessage(text, newWords = []) {
        const area = document.getElementById('novaChatArea');
        const bubble = document.createElement('div');
        bubble.className = 'nova-bubble';

        // Highlight new words
        let processedText = escapeHTML(text);
        if (newWords.length) {
            newWords.forEach(w => {
                const word = w.word || w;
                const def = w.definition || '';
                const re = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'gi');
                processedText = processedText.replace(re, (m) =>
                    `<span class="nova-new-word" data-word="${escapeAttr(word)}" data-def="${escapeAttr(def)}">${m}</span>`
                );
            });
        }

        bubble.innerHTML = `
      <span class="nova-avatar">✨</span>
      <div class="nova-bubble-text">${processedText}</div>
    `;

        area.appendChild(bubble);

        // Word tooltips
        bubble.querySelectorAll('.nova-new-word').forEach(span => {
            span.addEventListener('mouseenter', showWordTooltip);
            span.addEventListener('mouseleave', hideWordTooltip);
            span.addEventListener('click', () => speakText(span.dataset.word));
        });

        area.scrollTop = area.scrollHeight;
        return bubble;
    }

    function attachCorrectionToLastChildBubble(corrections) {
        const allChild = document.querySelectorAll('.child-bubble');
        const last = allChild[allChild.length - 1];
        if (!last || !corrections.length) return;

        const dot = document.createElement('div');
        dot.className = 'correction-dot';
        dot.title = 'Click for tip';
        last.style.position = 'relative';
        last.style.display = 'inline-block';
        last.appendChild(dot);

        const tooltip = document.createElement('div');
        tooltip.className = 'correction-tooltip hidden';
        const c = corrections[0];
        tooltip.textContent = `✏️ We can also say: "${c.corrected}"`;
        last.appendChild(tooltip);

        dot.addEventListener('click', () => {
            tooltip.classList.toggle('hidden');
        });

        document.addEventListener('click', e => {
            if (!dot.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.classList.add('hidden');
            }
        });
    }

    function showWordTooltip(e) {
        const span = e.currentTarget;
        const def = span.dataset.def;
        if (!def) return;

        const tip = document.createElement('div');
        tip.className = 'nova-word-tooltip';
        tip.textContent = `📖 "${def}"`;
        tip.id = 'activeWordTip';
        span.style.position = 'relative';
        span.appendChild(tip);
    }

    function hideWordTooltip(e) {
        document.getElementById('activeWordTip')?.remove();
    }

    // ── Main Send Flow ─────────────────────────────────────────────────────
    async function sendMessage(text) {
        text = text.trim();
        if (!text || NovaState.isProcessing) return;

        NovaState.isProcessing = true;
        NovaState.lastChildMessage = text;

        // 1. Display child bubble
        displayChildMessage(text);

        // 2. Clear input
        const input = document.getElementById('novaInput');
        if (input) input.value = '';
        updateSendBtn('');

        // 3. Nova thinking
        setNovaState('thinking');
        setStatus('Nova is thinking... 💭');
        const typing = showTypingIndicator();

        try {
            // 4. Call Groq
            const response = await callNova(text);
            removeTypingIndicator();
            await processNovaResponse(response, text);
        } catch (err) {
            removeTypingIndicator();
            console.error('Nova callNova error:', err);
            const errMsg = 'Hmm, I\'m having trouble thinking... 🤔 Let\'s try again in a moment!';
            displayNovaMessage(errMsg);
            speakText(errMsg);
            setNovaState('idle');
            setStatus('Nova is ready! ✨');
        }

        NovaState.isProcessing = false;

        // Diagnostic flow
        if (NovaState.isDiagnosticMode) {
            NovaState.diagnosticStep++;
            if (NovaState.diagnosticStep > 3) {
                NovaState.isDiagnosticMode = false;
                finalizeInitialLevel();
            }
        }
    }

    async function processNovaResponse(response, childText) {
        const msg = response.message || '';
        const newWords = response.newWords || [];
        const corrections = response.corrections || [];
        const assessment = response.assessment;

        // Display
        displayNovaMessage(msg, newWords);

        // Corrections
        if (corrections.length > 0) {
            attachCorrectionToLastChildBubble(corrections);
            NovaState.sessionCorrections += corrections.length;
        }

        // Track words
        newWords.forEach(w => {
            if (w.word) NovaState.sessionWords.push(w);
        });

        // Level assessment
        if (assessment) updateAssessment(assessment);

        // Speak
        speakText(msg);

        // History
        NovaState.conversationHistory.push(
            { sender: 'child', text: childText },
            { sender: 'nova', text: msg }
        );
        NovaState.messageCount++;

        setNovaState('idle');
        setStatus('Nova is ready! ✨');
    }

    function finalizeInitialLevel() {
        if (NovaState.recentAssessments.length === 0) return;
        const avg = NovaState.recentAssessments.reduce((s, a) => s + a.suggestedLevel, 0) / NovaState.recentAssessments.length;
        const level = Math.max(1, Math.min(5, Math.round(avg)));
        if (level !== NovaState.currentLevel) {
            NovaState.currentLevel = level;
            updateLevelUI(level, false);
        }
        const levelName = LEVEL_CONFIGS[level].name;
        const announceMsg = `I think you're at Level ${level} — ${levelName}! Let's start our adventure! 🌟`;
        setTimeout(() => {
            displayNovaMessage(announceMsg);
            speakText(announceMsg);
        }, 500);
    }

    // ── Assessment & Level System ─────────────────────────────────────────
    function updateAssessment(assessment) {
        NovaState.recentAssessments.push(assessment);
        if (NovaState.recentAssessments.length > 8) NovaState.recentAssessments.shift();

        if (NovaState.recentAssessments.length < 3) return;

        const last3 = NovaState.recentAssessments.slice(-3);
        const allAbove = last3.every(a => a.suggestedLevel > NovaState.currentLevel);
        const avgLast3 = last3.reduce((s, a) => s + a.suggestedLevel, 0) / 3;

        if (allAbove && Math.round(avgLast3) > NovaState.currentLevel && NovaState.currentLevel < 5) {
            triggerLevelUp(Math.round(avgLast3));
            return;
        }

        if (NovaState.recentAssessments.length >= 5) {
            const last5 = NovaState.recentAssessments.slice(-5);
            const allBelow = last5.every(a => a.suggestedLevel < NovaState.currentLevel);
            if (allBelow && NovaState.currentLevel > 1) {
                NovaState.currentLevel--;
                updateLevelUI(NovaState.currentLevel, false);
            }
        }
    }

    function triggerLevelUp(newLevel) {
        const oldLevel = NovaState.currentLevel;
        NovaState.currentLevel = newLevel;
        NovaState.leveledUp = true;
        NovaState.newLevelAfterUp = newLevel;

        updateLevelUI(newLevel, true);

        const overlay = document.getElementById('novaLevelUpOverlay');
        overlay.innerHTML = buildLevelUpHTML(newLevel);
        overlay.classList.remove('hidden');

        spawnConfetti(20);
        setNovaState('happy');

        const name = NovaState.childData?.username || 'friend';
        speakText(`Wow ${name}! You levelled up to Level ${newLevel}! You are incredible!`);
    }

    function buildLevelUpHTML(newLevel) {
        const cfg = LEVEL_CONFIGS[newLevel] || LEVEL_CONFIGS[1];
        const name = NovaState.childData?.username || 'friend';
        return `
      <div class="levelup-card">
        <span class="levelup-nova">✨</span>
        <div class="levelup-title">LEVEL UP!</div>
        <div class="levelup-badge">${cfg.emoji} Level ${newLevel}</div>
        <div class="levelup-name">${cfg.name}</div>
        <div class="levelup-msg">Amazing work ${name}! Your English is getting stronger every day! 🌟</div>
        <button onclick="window.nova_closeLevelUp()">🚀 Keep Chatting!</button>
      </div>
    `;
    }

    window.nova_closeLevelUp = function () {
        document.getElementById('novaLevelUpOverlay').classList.add('hidden');
        setNovaState('idle');
    };

    // ── Session Timer ─────────────────────────────────────────────────────
    function startSessionTimer() {
        const el = document.getElementById('novaSessionTimer');
        NovaState.sessionStart = Date.now();
        NovaState.sessionTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - NovaState.sessionStart) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }

    // ── End Session ───────────────────────────────────────────────────────
    async function endSession() {
        clearInterval(NovaState.sessionTimer);
        stopCurrentAudio(); // Stop ElevenLabs / browser audio

        setStatus('Saving session...');

        const sessionData = await saveNovaSession();
        await saveProgressToSupabase();

        showSessionSummary();
    }

    function showSessionSummary() {
        const overlay = document.getElementById('novaSummaryOverlay');
        overlay.innerHTML = buildSummaryHTML();
        overlay.classList.remove('hidden');
        if (NovaState.messageCount >= 5) spawnConfetti(15);
    }

    function buildSummaryHTML() {
        const count = NovaState.messageCount;
        let perfEmoji = '', perfTitle = '';
        if (count >= 10) { perfEmoji = '🌟'; perfTitle = 'Amazing session!'; }
        else if (count >= 5) { perfEmoji = '⭐'; perfTitle = 'Great session!'; }
        else { perfEmoji = '💫'; perfTitle = 'Good start!'; }

        const wordsHTML = NovaState.sessionWords.length
            ? `<div class="summary-words">${NovaState.sessionWords.map(w =>
                `<span class="summary-word-pill" onclick="nova_speakWord('${escapeAttr(typeof w === 'string' ? w : w.word)}')">${typeof w === 'string' ? w : w.word}</span>`
            ).join('')
            }</div>`
            : '';

        const levelDisplay = NovaState.leveledUp
            ? `🎉 Level Up! Now at Level ${NovaState.newLevelAfterUp} — ${LEVEL_CONFIGS[NovaState.newLevelAfterUp]?.name}`
            : `Level ${NovaState.currentLevel} — ${LEVEL_CONFIGS[NovaState.currentLevel]?.name}`;

        return `
      <div class="nova-summary-card">
        <span class="summary-emoji">${perfEmoji}</span>
        <div class="summary-title">${perfTitle}</div>
        <div class="summary-sub">${count} messages • ${NovaState.sessionWords.length} new words</div>
        ${wordsHTML}
        <div class="summary-level">${levelDisplay}</div>
        <button onclick="document.getElementById('novaSummaryOverlay').classList.add('hidden')">🌟 Chat More!</button>
        <button class="secondary" onclick="window.location.href='dashboard.html'">🏠 Dashboard</button>
      </div>
    `;
    }

    window.nova_speakWord = function (word) { speakText(word); };

    // ── Voice INPUT (Web Speech API) ──────────────────────────────────────
    function initVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const micBtn = document.getElementById('novaMicBtn');

        if (!SpeechRecognition) {
            if (micBtn) {
                micBtn.style.opacity = '0.4';
                micBtn.title = 'Voice not available — use Chrome for voice chat!';
                micBtn.disabled = true;
            }
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        NovaState.recognition = recognition;

        recognition.onstart = () => {
            NovaState.isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            const indicator = document.getElementById('novaVoiceIndicator');
            if (indicator) indicator.classList.remove('hidden');
            const status = document.getElementById('novaVoiceStatus');
            if (status) status.textContent = 'Listening... speak now! 🎤';
            setNovaState('idle');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');

            const transcriptEl = document.getElementById('novaVoiceTranscript');
            if (transcriptEl) transcriptEl.textContent = transcript;

            if (event.results[0].isFinal) {
                stopRecording();
                const input = document.getElementById('novaInput');
                if (input) {
                    input.value = transcript;
                    updateSendBtn(transcript);
                }
                // Auto-send after 2s if no editing
                if (NovaState.autoSendTimer) clearTimeout(NovaState.autoSendTimer);
                NovaState.autoSendTimer = setTimeout(() => {
                    if (input && input.value === transcript) {
                        sendMessage(transcript);
                    }
                }, 2000);
            }
        };

        recognition.onerror = (err) => {
            stopRecording();
            const msg = err.error === 'no-speech' ? "I didn't hear anything — try again! 🎤"
                : err.error === 'not-allowed' ? 'Microphone permission needed for voice chat!'
                    : 'Voice error — try typing instead!';
            setStatus(msg);
            setTimeout(() => setStatus('Nova is ready! ✨'), 3000);
        };

        recognition.onend = () => stopRecording();

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                if (NovaState.isRecording) stopRecording();
                else startRecording();
            });
        }

        document.getElementById('novaCancelVoice')?.addEventListener('click', stopRecording);
    }

    function startRecording() {
        try {
            NovaState.recognition?.start();
        } catch (e) { console.warn('Recognition already started', e); }
    }

    function stopRecording() {
        NovaState.isRecording = false;
        try { NovaState.recognition?.stop(); } catch { }
        document.getElementById('novaMicBtn')?.classList.remove('recording');
        const indicator = document.getElementById('novaVoiceIndicator');
        if (indicator) indicator.classList.add('hidden');
        setNovaState('idle');
    }

    // ── Voice OUTPUT — ElevenLabs TTS (with SpeechSynthesis fallback) ─────

    /** Stop whatever is currently playing */
    function stopCurrentAudio() {
        // ElevenLabs AudioContext source
        if (NovaState.currentAudioSource) {
            try { NovaState.currentAudioSource.stop(); } catch { }
            NovaState.currentAudioSource = null;
        }
        // HTML Audio element fallback
        if (NovaState.currentAudio) {
            NovaState.currentAudio.pause();
            NovaState.currentAudio.src = '';
            NovaState.currentAudio = null;
        }
        // Browser SpeechSynthesis fallback
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        NovaState.isSpeaking = false;
    }

    /** Strip emojis and extra whitespace from text before sending to TTS */
    function cleanForTTS(text) {
        return text
            // Remove common emoji ranges
            .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '')
            .replace(/[✨🌟⭐💫🎉🎊🔥💪🌈🐾🌱🔍⚡🏆👑😊💡📖]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Speak text using ElevenLabs TTS API.
     * Falls back to browser SpeechSynthesis if API key is missing.
     * @param {string} text
     * @param {Function|null} onEnd  — called when audio finishes
     */
    async function speakText(text, onEnd = null) {
        if (!NovaState.voiceEnabled) return;

        // Stop previous audio immediately
        stopCurrentAudio();

        const cleanText = cleanForTTS(text);
        if (!cleanText) return;

        const apiKey = window.CONFIG?.ELEVENLABS_API_KEY;
        const voiceId = window.CONFIG?.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Bella (child-friendly)
        const model = window.CONFIG?.ELEVENLABS_MODEL || 'eleven_turbo_v2';

        // ── If no ElevenLabs key → fallback to SpeechSynthesis ──────────
        const isKeyMissing = !apiKey ||
            apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE' ||
            apiKey.trim() === '';

        if (isKeyMissing) {
            console.info('Nova TTS: No ElevenLabs key — using browser SpeechSynthesis');
            speakWithBrowser(cleanText, onEnd);
            return;
        }

        setNovaState('speaking');
        NovaState.isSpeaking = true;

        try {
            const endpoint =
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text: cleanText,
                    model_id: model,
                    voice_settings: {
                        stability: 0.55,
                        similarity_boost: 0.80,
                        style: 0.30,
                        use_speaker_boost: true,
                    },
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                console.warn(`Nova TTS: ElevenLabs ${resp.status}`, errText);
                // Graceful fallback
                speakWithBrowser(cleanText, onEnd);
                return;
            }

            const arrayBuffer = await resp.arrayBuffer();

            // Decode + play via Web Audio API for precise onEnd callback
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
                // If another message interrupted, bail
                if (!NovaState.isSpeaking) { setNovaState('idle'); return; }

                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);

                NovaState.currentAudioSource = source;

                source.onended = () => {
                    NovaState.isSpeaking = false;
                    NovaState.currentAudioSource = null;
                    setNovaState('idle');
                    if (onEnd) onEnd();
                };

                source.start(0);

            }, (err) => {
                console.warn('Nova TTS: Audio decode failed', err);
                NovaState.isSpeaking = false;
                speakWithBrowser(cleanText, onEnd);
            });

        } catch (err) {
            console.warn('Nova TTS: ElevenLabs fetch failed', err);
            NovaState.isSpeaking = false;
            // Fallback to browser
            speakWithBrowser(cleanText, onEnd);
        }
    }

    /** Browser SpeechSynthesis fallback */
    function speakWithBrowser(cleanText, onEnd = null) {
        if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }

        setNovaState('speaking');
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const trySpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            const preferred =
                voices.find(v => v.name.includes('Samantha')) ||
                voices.find(v => v.name.includes('Karen')) ||
                voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('google')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                null;

            if (preferred) utterance.voice = preferred;
            utterance.rate = 0.88;
            utterance.pitch = 1.15;
            utterance.volume = 0.9;

            utterance.onstart = () => setNovaState('speaking');
            utterance.onend = () => { setNovaState('idle'); if (onEnd) onEnd(); };
            utterance.onerror = () => { setNovaState('idle'); if (onEnd) onEnd(); };

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
        } else {
            trySpeak();
        }
    }

    // ── Voice toggle ──────────────────────────────────────────────────────
    function initVoiceToggle() {
        const btn = document.getElementById('novaVoiceToggle');
        NovaState.voiceEnabled = localStorage.getItem('nova_voice_enabled') !== 'false';
        if (btn) {
            btn.textContent = NovaState.voiceEnabled ? '🔊' : '🔇';
            if (!NovaState.voiceEnabled) btn.classList.add('muted');
            btn.addEventListener('click', () => {
                NovaState.voiceEnabled = !NovaState.voiceEnabled;
                localStorage.setItem('nova_voice_enabled', NovaState.voiceEnabled);
                btn.textContent = NovaState.voiceEnabled ? '🔊' : '🔇';
                btn.classList.toggle('muted', !NovaState.voiceEnabled);
                // Stop any currently playing ElevenLabs or browser audio
                if (!NovaState.voiceEnabled) stopCurrentAudio();
            });
        }
    }

    // ── Input Events ──────────────────────────────────────────────────────
    function initInputEvents() {
        const input = document.getElementById('novaInput');
        const sendbtn = document.getElementById('novaSendBtn');
        const endBtn = document.getElementById('novaEndBtn');

        input?.addEventListener('input', () => updateSendBtn(input.value));
        input?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
                e.preventDefault();
                sendMessage(input.value);
            }
            // Cancel auto-send if typing
            if (NovaState.autoSendTimer) {
                clearTimeout(NovaState.autoSendTimer);
                NovaState.autoSendTimer = null;
            }
        });

        sendbtn?.addEventListener('click', () => {
            if (input && input.value.trim()) sendMessage(input.value);
        });

        endBtn?.addEventListener('click', endSession);
    }

    function updateSendBtn(val) {
        const btn = document.getElementById('novaSendBtn');
        if (!btn) return;
        if (val.trim()) btn.classList.add('visible');
        else btn.classList.remove('visible');
    }

    // ── Confetti ──────────────────────────────────────────────────────────
    function spawnConfetti(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'confetti-piece';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.top = '-10px';
                el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
                el.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
                el.style.animationDelay = '0s';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 3000);
            }, i * 60);
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────
    function escapeHTML(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function escapeAttr(s) {
        return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ── Init ──────────────────────────────────────────────────────────────
    async function initNova() {
        // Get user from auth
        try {
            if (window.eduplay?.getCurrentUser) {
                const user = await window.eduplay.getCurrentUser();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                NovaState.userId = user.id || user.auth_id;
                NovaState.childData = user;
            } else if (window.eduplay?.session?.getUser) {
                const user = window.eduplay.session.getUser();
                if (!user) { window.location.href = 'login.html'; return; }
                NovaState.userId = user.id;
                NovaState.childData = user;
            }
        } catch (e) {
            console.error('Nova: auth error', e);
        }

        if (!NovaState.userId) {
            // Try Supabase session directly
            try {
                const sb = getSupabase();
                const { data: { session } } = await sb.auth.getSession();
                if (!session) { window.location.href = 'login.html'; return; }
                NovaState.userId = session.user.id;
                const { data: profile } = await sb.from('users').select('*').eq('id', session.user.id).single();
                NovaState.childData = profile || { id: session.user.id, username: session.user.email?.split('@')[0] || 'Explorer' };
            } catch (e) { console.error('Nova: fallback auth failed', e); return; }
        }

        // Load progress
        NovaState.progress = await loadProgress();
        if (NovaState.progress) {
            NovaState.currentLevel = NovaState.progress.current_level || 1;
        }
        NovaState.levelAtSessionStart = NovaState.currentLevel;

        // Setup UI
        updateLevelUI(NovaState.currentLevel);
        renderLeftPanelStats();
        startSessionTimer();
        initVoiceInput();
        initVoiceToggle();
        initInputEvents();

        // Show opening message
        const opening = buildOpeningMessage();
        setTimeout(() => {
            displayNovaMessage(opening.message);
            speakText(opening.message);
        }, 600);
    }

    // Boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNova);
    } else {
        initNova();
    }

    // ── Dashboard integration ─────────────────────────────────────────────
    window.loadNovaProgress = async function (userId) {
        try {
            const sb = getSupabase();
            const { data } = await sb
                .from('user_english_progress')
                .select('current_level, total_sessions, words_learned')
                .eq('user_id', userId)
                .single();
            return data ?? null;
        } catch { return null; }
    };

})();
