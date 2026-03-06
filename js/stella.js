/**
 * EduPlay — Stella AI English Coach
 * js/stella.js
 *
 * Complete engine: Groq integration, voice input/output,
 * English level system, session management, Supabase sync.
 *
 * Requires:
 *   - CONFIG.GROQ_API_KEY (from config.js)
 *   - CONFIG.GROQ_ENDPOINT (from config.js)
 *   - CONFIG.SUPABASE_URL / CONFIG.SUPABASE_ANON_KEY (from config.js)
 *   - CONFIG.ELEVENLABS_API_KEY (optional — placeholder for future TTS API)
 *   - window.eduplay from auth.js
 */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────
    const LEVEL_CONFIGS = {
        1: { name: 'Beginner', emoji: '🌱', class: 'stella-level-1', sessionsToNext: 5 },
        2: { name: 'Explorer', emoji: '🔍', class: 'stella-level-2', sessionsToNext: 8 },
        3: { name: 'Adventurer', emoji: '⚡', class: 'stella-level-3', sessionsToNext: 10 },
        4: { name: 'Champion', emoji: '🏆', class: 'stella-level-4', sessionsToNext: 12 },
        5: { name: 'Master', emoji: '👑', class: 'stella-level-5', sessionsToNext: 999 },
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
    const StellaState = {
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
        if (StellaState.supabase) return StellaState.supabase;
        if (window.supabase && window.CONFIG) {
            StellaState.supabase = window.supabase.createClient(
                window.CONFIG.SUPABASE_URL,
                window.CONFIG.SUPABASE_ANON_KEY
            );
        }
        return StellaState.supabase;
    }

    async function loadProgress() {
        try {
            const sb = getSupabase();
            const { data } = await sb
                .from('user_english_progress')
                .select('*')
                .eq('user_id', StellaState.userId)
                .single();
            return data;
        } catch { return null; }
    }

    async function saveProgressToSupabase() {
        try {
            const sb = getSupabase();
            const np = StellaState.progress;
            const wordsArr = np?.words_learned || [];

            // Merge new session words into progress words
            StellaState.sessionWords.forEach(w => {
                const word = typeof w === 'string' ? w : w.word;
                if (!word) return;
                const existing = wordsArr.findIndex(x => (typeof x === 'string' ? x : x.word) === word);
                if (existing === -1) wordsArr.push(w);
            });

            const upsertData = {
                user_id: StellaState.userId,
                current_level: StellaState.currentLevel,
                max_level_reached: Math.max(StellaState.currentLevel, np?.max_level_reached || 1),
                total_sessions: (np?.total_sessions || 0) + 1,
                total_messages: (np?.total_messages || 0) + StellaState.messageCount,
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
        } catch (e) { console.warn('Stella: save progress failed', e); }
    }

    async function saveStellaSession() {
        try {
            const sb = getSupabase();
            const duration = Math.floor((Date.now() - StellaState.sessionStart) / 1000);
            const { data } = await sb.from('nova_sessions').insert({
                user_id: StellaState.userId,
                duration_seconds: duration,
                message_count: StellaState.messageCount,
                level_at_start: StellaState.levelAtSessionStart,
                level_at_end: StellaState.currentLevel,
                words_learned: StellaState.sessionWords,
                corrections_count: StellaState.sessionCorrections,
                focus_areas: getLastFocusAreas(),
            }).select().single();

            // Save individual vocab entries
            if (StellaState.sessionWords.length > 0) {
                const vocabItems = StellaState.sessionWords.map(w => ({
                    user_id: StellaState.userId,
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
        } catch (e) { console.warn('Stella: save session failed', e); return null; }
    }

    function getLastFocusAreas() {
        const last = StellaState.recentAssessments.slice(-2);
        const areas = [];
        last.forEach(a => { if (a.nextFocusAreas) areas.push(...a.nextFocusAreas); });
        return [...new Set(areas)].slice(0, 4);
    }

    // ── Groq API ──────────────────────────────────────────────────────────
    function buildSystemPrompt() {
        const c = StellaState.childData;
        const lvl = StellaState.currentLevel;
        const name = c.username || 'the student';
        const age = c.age || 8;
        const levelName = LEVEL_CONFIGS[lvl]?.name || 'Beginner';
        const focuses = getLastFocusAreas();

        const levelApproach = {
            1: 'LEVEL 1 — BEGINNER: Correct missing articles (a, an, the) and singular/plural basics. Teach basic nouns and simple adjectives. Celebrate ANY complete sentence. Keep corrections very gentle.',
            2: 'LEVEL 2 — EXPLORER: Correct verb tense errors (past/present) and basic subject-verb agreement. Teach action words (verbs) and describing words. Celebrate correct past tense usage.',
            3: 'LEVEL 3 — ADVENTURER: Correct complex tense errors and preposition errors (in/on/at). Teach conjunctions (because, although, however). Celebrate multi-clause correct sentences.',
            4: 'LEVEL 4 — CHAMPION: Correct advanced grammar subtleties. Teach advanced vocabulary in context. Challenge the child for more complex sentence structures.',
            5: 'LEVEL 5 — MASTER: Very light touch corrections only. Teach idioms, expressions, and creative language. Challenge with storytelling and persuasive writing.',
        };

        return `You are Stella, a warm and encouraging English teacher for children aged 6-12 on the EduPlay learning platform. You are talking with ${name}, aged ${age}. Their current English level is ${lvl} out of 5 (${levelName}).

${levelApproach[lvl] || levelApproach[1]}

TODAY'S FOCUS AREAS: ${focuses.length ? focuses.join(', ') : 'general conversation, grammar practice, vocabulary building'}

=======================================================
THE THREE-PART RESPONSE RULE — FOLLOW IN EVERY MESSAGE
=======================================================

Every single message you send MUST have exactly three parts:

PART 1 — ACKNOWLEDGE (1 sentence):
  React warmly to what ${name} said. Make them feel heard.
  Example: "Oh I love tigers too! 🐯"

PART 2 — TEACH (1-2 sentences) — THE MOST IMPORTANT PART. NEVER SKIP IT:

  IF ${name} made any grammar or vocabulary error:
    Use these phrases — NEVER say "wrong" or "incorrect":
      "We say... [correct version]"
      "In English we can say... [correct version]"
      "I think you mean... [correct version]! 😊"
      "Nice try! We say... [correct version]"
    Then USE the corrected version naturally in a sentence.
    EXAMPLE — Child says "I have a handy":
      WRONG response: "That's nice you have a handy!"
      RIGHT response: "I think you mean you have a hand! 😊 In English 'hand' is the word for this body part — and hands help us write and draw!"

  IF ${name} asked to learn grammar, spelling, or vocabulary:
    STOP casual conversation and START a lesson immediately.
    Do NOT ask about their favourite animal or change the subject.
    GRAMMAR LESSON FORMAT:
      Rule name: e.g. "The A/AN Rule"
      Simple explanation: one sentence
      Examples: at least 2 clear examples
      Practice: end with a practice prompt
    EXAMPLE — Child says "I just want to learn about some grammars in English":
      RIGHT response: "Perfect! Let's learn grammar right now! 📚 Today's rule: Every sentence needs TWO things — WHO (like 'I', 'she', 'tigers') and DOES (like 'run', 'eat', 'sleep'). Example: 'Tigers RUN fast.' Can you make your own sentence with a WHO and a DOES?"

  IF ${name} said something correctly that they said wrong before:
    CELEBRATE enthusiastically:
      "YES! ⭐ You said that perfectly!"
      "AMAZING ${name}! That sentence was perfect English! 🌟"
      "You're improving so fast! That was perfect!"

  IF ${name} said something perfectly correct with no errors:
    Introduce ONE new vocabulary word in context and explain it simply.

PART 3 — ENGAGE (exactly 1 question):
  Ask ONE question that lets ${name} PRACTISE what was just taught.
  After correcting "handy" → "hand": "Can you say 'I have two hands'? 😊"
  After teaching "magnificent": "Can you use 'magnificent' in a sentence? 🌟"
  After a grammar lesson: "Can you make your own sentence using that rule? ⭐"

=======================================================
CORRECTION RULES — APPLY BASED ON LEVEL ${lvl}
=======================================================

ALWAYS correct these error types:
  Wrong word choice (e.g. "handy" instead of "hand")
  Wrong verb tense (e.g. "I goed" instead of "I went")
  Missing articles (e.g. "I have dog" → "I have a dog")
  Wrong plurals (e.g. "two apple" → "two apples")
  Subject-verb mismatch (e.g. "she don't" → "she doesn't")

THE ECHO METHOD — always use this order:
  Step 1: Acknowledge warmly
  Step 2: Say "I think you mean…" OR "We say…"
  Step 3: Say the FULL correct sentence clearly
  Step 4: Use that correct sentence again naturally

NEVER say: "wrong", "incorrect", "bad", "mistake", "error"

If ${name} makes the SAME mistake 3 times in a row, switch to:
  "Let's practice! Say after me: [correct sentence]. Can you type that exactly? 😊"

=======================================================
SPECIAL SITUATIONS
=======================================================

IF ${name} types only 1-2 words:
  Expand it: Child types "yes" → Stella says "Yes! We can say 'Yes, I do!' — that's a complete sentence! Can you type 'Yes, I do!' for me? 😊"

IF ${name} uses non-English words:
  "I see a word I don't recognise! 😊 In English we say [English version] — try again!"

IF ${name} seems frustrated (very short answers, repeated errors):
  Drop the teaching for ONE message, just be warm and kind.
  Then gently resume teaching next message.

=======================================================
RESPOND ONLY IN THIS EXACT JSON FORMAT — NO TEXT OUTSIDE
=======================================================

{
  "message": "Your complete three-part response here.",
  "corrections": [
    {
      "original": "exact words ${name} said incorrectly",
      "corrected": "the correct English version",
      "rule": "simple rule name like 'Use a/an before nouns'",
      "tip": "explanation in max 8 simple words"
    }
  ],
  "newWords": [
    {
      "word": "new vocabulary word you introduced this message",
      "definition": "definition in 5 words or less",
      "example": "simple example sentence using the word"
    }
  ],
  "celebration": {
    "triggered": false,
    "reason": ""
  },
  "lessonTaught": {
    "type": "correction OR new_word OR grammar_rule OR celebration",
    "content": "brief description of what was taught this message"
  },
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


    async function callStella(userMessage) {
        const GROQ_API_KEY = window.CONFIG?.GROQ_API_KEY;
        const GROQ_ENDPOINT = window.CONFIG?.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
        const GROQ_MODEL = window.CONFIG?.GROQ_MODEL || 'llama-3.3-70b-versatile';

        if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            ...StellaState.conversationHistory.slice(-10).map(m => ({
                role: m.sender === 'stella' ? 'assistant' : 'user',
                content: m.text,
            })),
            { role: 'user', content: userMessage },
        ];

        const resp = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY} `,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 0.75,
                max_tokens: 500,
                response_format: { type: 'json_object' },
            }),
        });

        if (!resp.ok) throw new Error(`Groq error: ${resp.status} `);
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
                    confidence: 3, suggestedLevel: StellaState.currentLevel,
                    nextFocusAreas: [],
                },
            };
        }
    }

    // ── Opening Message ───────────────────────────────────────────────────
    function buildStellaOpening() {
        const p = StellaState.progress;
        const c = StellaState.childData;
        const name = c?.username || 'friend';

        if (!p || p.total_sessions === 0) {
            StellaState.isDiagnosticMode = true;
            StellaState.diagnosticStep = 1;
            return {
                message: `Hi ${name} !I'm Stella, your English learning star! ⭐ I'm SO excited to chat with you! Tell me — what's your favorite animal? 🐾`,
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
    function setStellaState(state) {
        const char = document.getElementById('stellaCharacter');
        if (!char) return;
        char.className = `stella-char stella-${state}`;
    }

    function setStatus(text) {
        const el = document.getElementById('stellaStatusText');
        if (el) el.textContent = text;
    }

    function updateLevelUI(level, animate = false) {
        const cfg = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[1];
        const badge = document.getElementById('stellaLevelBadge');
        const emoji = document.getElementById('stellaLevelEmoji');
        const name = document.getElementById('stellaLevelName');
        const num = document.getElementById('stellaLevelNum');
        const bar = document.getElementById('stellaXPBar');
        const label = document.getElementById('stellaXPLabel');

        if (emoji) emoji.textContent = cfg.emoji;
        if (name) name.textContent = cfg.name;
        if (num) num.textContent = level;

        if (badge) {
            badge.className = `stella-level-badge ${cfg.class}`;
            if (animate) {
                badge.style.transform = 'scale(1.3)';
                setTimeout(() => { badge.style.transform = 'scale(1)'; badge.style.transition = 'transform 0.4s ease'; }, 100);
            }
        }

        // XP bar: based on total sessions mod sessions_to_next
        const p = StellaState.progress;
        if (bar && p) {
            const sessForLevel = cfg.sessionsToNext;
            const pct = Math.min(100, ((p.total_sessions % sessForLevel) / sessForLevel) * 100);
            bar.style.width = pct + '%';
        }

        if (label && level < 5) label.textContent = `Keep chatting to reach ${LEVEL_CONFIGS[level + 1]?.name}!`;
        else if (label) label.textContent = '🏆 Max level reached!';
    }

    function renderLeftPanelStats() {
        const p = StellaState.progress;
        const sessions = document.getElementById('statSessions');
        const words = document.getElementById('statWords');
        const streak = document.getElementById('statStreak');

        if (sessions) sessions.textContent = p?.total_sessions || 0;
        if (words) words.textContent = Array.isArray(p?.words_learned) ? p.words_learned.length : 0;
        if (streak) streak.textContent = p?.session_streak || 0;

        const focusEl = document.getElementById('stellaFocusItems');
        if (focusEl) {
            const focuses = getLastFocusAreas();
            if (focuses.length) {
                focusEl.innerHTML = focuses.map(f =>
                    `<div class="stella-focus-item">✨ ${f.replace(/_/g, ' ')}</div>`
                ).join('');
            }
        }
    }

    // ── Display Messages ──────────────────────────────────────────────────
    function showTypingIndicator() {
        const area = document.getElementById('stellaChatArea');
        const typing = document.createElement('div');
        typing.className = 'stella-typing';
        typing.id = 'stellaTyping';
        typing.innerHTML = `
      <span class="stella-avatar">⭐</span>
      <div class="stella-typing-dots">
        <span></span><span></span><span></span>
        </div>
    `;
        area.appendChild(typing);
        scrollToBottom();
        return typing;
    }

    function removeTypingIndicator() {
        document.getElementById('stellaTyping')?.remove();
    }
    // ── Scroll Handling ───────────────────────────────────────────────────
    let userScrolledUp = false;

    document.getElementById('stellaChatArea')?.addEventListener('scroll', (e) => {
        const chatArea = e.target;
        const distanceFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
        userScrolledUp = distanceFromBottom > 100;

        if (!userScrolledUp) hideScrollBtn();
    });

    function scrollToBottom(smooth = true, force = false) {
        const chatArea = document.getElementById('stellaChatArea');
        if (!chatArea) return;

        if (userScrolledUp && !force) {
            showScrollBtn();
            return;
        }

        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: smooth ? 'smooth' : 'instant'
        });
        hideScrollBtn();
    }

    function showScrollBtn() {
        let btn = document.getElementById('scrollToBottomBtn');
        if (btn) btn.classList.add('visible');
    }

    function hideScrollBtn() {
        let btn = document.getElementById('scrollToBottomBtn');
        if (btn) btn.classList.remove('visible');
    }

    window.stella_scrollToBottom_click = function () {
        scrollToBottom(true, true);
        hideScrollBtn();
    };

    function displayChildMessage(text) {
        const area = document.getElementById('stellaChatArea');
        const wrap = document.createElement('div');
        wrap.className = 'child-bubble';
        wrap.innerHTML = `<span class="child-bubble-text">${escapeHTML(text)}</span>`;
        area.appendChild(wrap);
        scrollToBottom();
        return wrap;
    }

    function displayStellaMessage(text, newWords = []) {
        const area = document.getElementById('stellaChatArea');
        const bubble = document.createElement('div');
        bubble.className = 'stella-bubble';

        // Highlight new words
        let processedText = escapeHTML(text);
        if (newWords.length) {
            newWords.forEach(w => {
                const word = w.word || w;
                const def = w.definition || '';
                const re = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'gi');
                processedText = processedText.replace(re, (m) =>
                    `<span class="stella-new-word" data-word="${escapeAttr(word)}" data-def="${escapeAttr(def)}">${m}</span>`
                );
            });
        }

        bubble.innerHTML = `
      <span class="stella-avatar">⭐</span>
      <div class="stella-bubble-text">${processedText}</div>
    `;

        area.appendChild(bubble);

        // Word tooltips
        bubble.querySelectorAll('.stella-new-word').forEach(span => {
            span.addEventListener('mouseenter', showWordTooltip);
            span.addEventListener('mouseleave', hideWordTooltip);
            span.addEventListener('click', () => speakText(span.dataset.word));
        });

        scrollToBottom();
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
        tip.className = 'stella-word-tooltip';
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
        if (!text || StellaState.isProcessing) return;

        StellaState.isProcessing = true;
        StellaState.lastChildMessage = text;

        // 1. Display child bubble
        displayChildMessage(text);

        // 2. Clear input
        const input = document.getElementById('stellaInput');
        if (input) input.value = '';
        updateSendBtn('');

        // 3. Stella thinking
        setStellaState('thinking');
        setStatus('Stella is thinking... 💭');
        const typing = showTypingIndicator();

        try {
            // 4. Call Groq
            const response = await callStella(text);
            removeTypingIndicator();
            await processStellaResponse(response, text);
        } catch (err) {
            removeTypingIndicator();
            console.error('Stella callStella error:', err);
            const errMsg = 'Hmm, I\'m having trouble thinking... 🤔 Let\'s try again in a moment!';
            displayStellaMessage(errMsg);
            speakText(errMsg);
            setStellaState('idle');
            setStatus('Stella is ready! ⭐');
        }

        StellaState.isProcessing = false;

        // Diagnostic flow
        if (StellaState.isDiagnosticMode) {
            StellaState.diagnosticStep++;
            if (StellaState.diagnosticStep > 3) {
                StellaState.isDiagnosticMode = false;
                finalizeInitialLevel();
            }
        }
    }

    async function processStellaResponse(response, childText) {
        const msg = response.message || '';
        const newWords = response.newWords || [];
        const corrections = response.corrections || [];
        const assessment = response.assessment;

        // Display
        displayStellaMessage(msg, newWords);

        // Corrections
        if (corrections.length > 0) {
            attachCorrectionToLastChildBubble(corrections);
            StellaState.sessionCorrections += corrections.length;
        }

        // Track words
        newWords.forEach(w => {
            if (w.word) StellaState.sessionWords.push(w);
        });

        // Level assessment
        if (assessment) updateAssessment(assessment);

        // Speak
        speakText(msg);

        // History
        StellaState.conversationHistory.push(
            { sender: 'child', text: childText },
            { sender: 'stella', text: msg }
        );
        StellaState.messageCount++;

        setStellaState('idle');
        setStatus('Stella is ready! ⭐');
    }

    function finalizeInitialLevel() {
        if (StellaState.recentAssessments.length === 0) return;
        const avg = StellaState.recentAssessments.reduce((s, a) => s + a.suggestedLevel, 0) / StellaState.recentAssessments.length;
        const level = Math.max(1, Math.min(5, Math.round(avg)));
        if (level !== StellaState.currentLevel) {
            StellaState.currentLevel = level;
            updateLevelUI(level, false);
        }
        const levelName = LEVEL_CONFIGS[level].name;
        const announceMsg = `I think you're at Level ${level} — ${levelName}! Let's start our adventure! 🌟`;
        setTimeout(() => {
            displayStellaMessage(announceMsg);
            speakText(announceMsg);
        }, 500);
    }

    // ── Assessment & Level System ─────────────────────────────────────────
    function updateAssessment(assessment) {
        StellaState.recentAssessments.push(assessment);
        if (StellaState.recentAssessments.length > 8) StellaState.recentAssessments.shift();

        if (StellaState.recentAssessments.length < 3) return;

        const last3 = StellaState.recentAssessments.slice(-3);
        const allAbove = last3.every(a => a.suggestedLevel > StellaState.currentLevel);
        const avgLast3 = last3.reduce((s, a) => s + a.suggestedLevel, 0) / 3;

        if (allAbove && Math.round(avgLast3) > StellaState.currentLevel && StellaState.currentLevel < 5) {
            triggerLevelUp(Math.round(avgLast3));
            return;
        }

        if (StellaState.recentAssessments.length >= 5) {
            const last5 = StellaState.recentAssessments.slice(-5);
            const allBelow = last5.every(a => a.suggestedLevel < StellaState.currentLevel);
            if (allBelow && StellaState.currentLevel > 1) {
                StellaState.currentLevel--;
                updateLevelUI(StellaState.currentLevel, false);
            }
        }
    }

    function triggerLevelUp(newLevel) {
        const oldLevel = StellaState.currentLevel;
        StellaState.currentLevel = newLevel;
        StellaState.leveledUp = true;
        StellaState.newLevelAfterUp = newLevel;

        updateLevelUI(newLevel, true);

        const overlay = document.getElementById('stellaLevelUpOverlay');
        overlay.innerHTML = buildLevelUpHTML(newLevel);
        overlay.classList.remove('hidden');

        spawnConfetti(20);
        setStellaState('happy');

        const name = StellaState.childData?.username || 'friend';
        speakText(`Wow ${name}! You levelled up to Level ${newLevel}! You are incredible!`);
    }

    function buildLevelUpHTML(newLevel) {
        const cfg = LEVEL_CONFIGS[newLevel] || LEVEL_CONFIGS[1];
        const name = StellaState.childData?.username || 'friend';
        return `
      <div class="levelup-card">
        <span class="levelup-stella">✨</span>
        <div class="levelup-title">LEVEL UP!</div>
        <div class="levelup-badge">${cfg.emoji} Level ${newLevel}</div>
        <div class="levelup-name">${cfg.name}</div>
        <div class="levelup-msg">Amazing work ${name}! Your English is getting stronger every day! 🌟</div>
        <button onclick="window.stella_closeLevelUp()">🚀 Keep Chatting!</button>
      </div>
    `;
    }

    window.stella_closeLevelUp = function () {
        document.getElementById('stellaLevelUpOverlay').classList.add('hidden');
        setStellaState('idle');
    };

    // ── Session Timer ─────────────────────────────────────────────────────
    function startSessionTimer() {
        const el = document.getElementById('stellaSessionTimer');
        StellaState.sessionStart = Date.now();
        StellaState.sessionTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - StellaState.sessionStart) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }

    // ── End Session ───────────────────────────────────────────────────────
    async function endSession() {
        clearInterval(StellaState.sessionTimer);
        stopCurrentAudio(); // Stop ElevenLabs / browser audio

        setStatus('Saving session...');

        const sessionData = await saveStellaSession();
        await saveProgressToSupabase();

        showSessionSummary();
    }

    function showSessionSummary() {
        const overlay = document.getElementById('stellaSummaryOverlay');
        overlay.innerHTML = buildSummaryHTML();
        overlay.classList.remove('hidden');
        if (StellaState.messageCount >= 5) spawnConfetti(15);
    }

    function buildSummaryHTML() {
        const count = StellaState.messageCount;
        let perfEmoji = '', perfTitle = '';
        if (count >= 10) { perfEmoji = '🌟'; perfTitle = 'Amazing session!'; }
        else if (count >= 5) { perfEmoji = '⭐'; perfTitle = 'Great session!'; }
        else { perfEmoji = '💫'; perfTitle = 'Good start!'; }

        const wordsHTML = StellaState.sessionWords.length
            ? `<div class="summary-words">${StellaState.sessionWords.map(w =>
                `<span class="summary-word-pill" onclick="stella_speakWord('${escapeAttr(typeof w === 'string' ? w : w.word)}')">${typeof w === 'string' ? w : w.word}</span>`
            ).join('')
            }</div>`
            : '';

        const levelDisplay = StellaState.leveledUp
            ? `🎉 Level Up! Now at Level ${StellaState.newLevelAfterUp} — ${LEVEL_CONFIGS[StellaState.newLevelAfterUp]?.name}`
            : `Level ${StellaState.currentLevel} — ${LEVEL_CONFIGS[StellaState.currentLevel]?.name}`;

        return `
      <div class="stella-summary-card">
        <span class="summary-emoji">${perfEmoji}</span>
        <div class="summary-title">${perfTitle}</div>
        <div class="summary-sub">${count} messages • ${StellaState.sessionWords.length} new words</div>
        ${wordsHTML}
        <div class="summary-level">${levelDisplay}</div>
        <button onclick="document.getElementById('stellaSummaryOverlay').classList.add('hidden')">🌟 Chat More!</button>
        <button class="secondary" onclick="window.location.href='dashboard.html'">🏠 Dashboard</button>
      </div>
    `;
    }

    window.stella_speakWord = function (word) { speakText(word); };

    // ── Voice INPUT (Web Speech API) ──────────────────────────────────────
    function initVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const micBtn = document.getElementById('stellaMicBtn');

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
        StellaState.recognition = recognition;

        recognition.onstart = () => {
            StellaState.isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            const indicator = document.getElementById('stellaVoiceIndicator');
            if (indicator) indicator.classList.remove('hidden');
            const status = document.getElementById('stellaVoiceStatus');
            if (status) status.textContent = 'Listening... speak now! 🎤';
            setStellaState('idle');
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');

            const transcriptEl = document.getElementById('stellaVoiceTranscript');
            if (transcriptEl) transcriptEl.textContent = transcript;

            if (event.results[0].isFinal) {
                stopRecording();
                const input = document.getElementById('stellaInput');
                if (input) {
                    input.value = transcript;
                    updateSendBtn(transcript);
                }
                // Auto-send after 2s if no editing
                if (StellaState.autoSendTimer) clearTimeout(StellaState.autoSendTimer);
                StellaState.autoSendTimer = setTimeout(() => {
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
            setTimeout(() => setStatus('Stella is ready! ⭐'), 3000);
        };

        recognition.onend = () => stopRecording();

        if (micBtn) {
            micBtn.addEventListener('click', () => {
                if (StellaState.isRecording) stopRecording();
                else startRecording();
            });
        }

        document.getElementById('stellaCancelVoice')?.addEventListener('click', stopRecording);
    }

    function startRecording() {
        try {
            StellaState.recognition?.start();
        } catch (e) { console.warn('Recognition already started', e); }
    }

    function stopRecording() {
        StellaState.isRecording = false;
        try { StellaState.recognition?.stop(); } catch { }
        document.getElementById('stellaMicBtn')?.classList.remove('recording');
        const indicator = document.getElementById('stellaVoiceIndicator');
        if (indicator) indicator.classList.add('hidden');
        setStellaState('idle');
    }

    // ── Voice OUTPUT — ElevenLabs TTS (with SpeechSynthesis fallback) ─────

    /** Stop whatever is currently playing */
    function stopCurrentAudio() {
        // ElevenLabs AudioContext source
        if (StellaState.currentAudioSource) {
            try { StellaState.currentAudioSource.stop(); } catch { }
            StellaState.currentAudioSource = null;
        }
        // HTML Audio element fallback
        if (StellaState.currentAudio) {
            StellaState.currentAudio.pause();
            StellaState.currentAudio.src = '';
            StellaState.currentAudio = null;
        }
        // Browser SpeechSynthesis fallback
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        StellaState.isSpeaking = false;
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
        if (!StellaState.voiceEnabled) return;

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
            console.info('Stella TTS: No ElevenLabs key — using browser SpeechSynthesis');
            speakWithBrowser(cleanText, onEnd);
            return;
        }

        setStellaState('speaking');
        StellaState.isSpeaking = true;

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
                console.warn(`Stella TTS: ElevenLabs ${resp.status}`, errText);
                // Graceful fallback
                speakWithBrowser(cleanText, onEnd);
                return;
            }

            const arrayBuffer = await resp.arrayBuffer();

            // Decode + play via Web Audio API for precise onEnd callback
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
                // If another message interrupted, bail
                if (!StellaState.isSpeaking) { setStellaState('idle'); return; }

                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);

                StellaState.currentAudioSource = source;

                source.onended = () => {
                    StellaState.isSpeaking = false;
                    StellaState.currentAudioSource = null;
                    setStellaState('idle');
                    if (onEnd) onEnd();
                };

                source.start(0);

            }, (err) => {
                console.warn('Stella TTS: Audio decode failed', err);
                StellaState.isSpeaking = false;
                speakWithBrowser(cleanText, onEnd);
            });

        } catch (err) {
            console.warn('Stella TTS: ElevenLabs fetch failed', err);
            StellaState.isSpeaking = false;
            // Fallback to browser
            speakWithBrowser(cleanText, onEnd);
        }
    }

    /** Browser SpeechSynthesis fallback */
    function speakWithBrowser(cleanText, onEnd = null) {
        if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }

        setStellaState('speaking');
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

            utterance.onstart = () => setStellaState('speaking');
            utterance.onend = () => { setStellaState('idle'); if (onEnd) onEnd(); };
            utterance.onerror = () => { setStellaState('idle'); if (onEnd) onEnd(); };

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
        const btn = document.getElementById('stellaVoiceToggle');
        StellaState.voiceEnabled = localStorage.getItem('stella_voice_enabled') !== 'false';
        if (btn) {
            btn.textContent = StellaState.voiceEnabled ? '🔊' : '🔇';
            if (!StellaState.voiceEnabled) btn.classList.add('muted');
            btn.addEventListener('click', () => {
                StellaState.voiceEnabled = !StellaState.voiceEnabled;
                localStorage.setItem('stella_voice_enabled', StellaState.voiceEnabled);
                btn.textContent = StellaState.voiceEnabled ? '🔊' : '🔇';
                btn.classList.toggle('muted', !StellaState.voiceEnabled);
                // Stop any currently playing ElevenLabs or browser audio
                if (!StellaState.voiceEnabled) stopCurrentAudio();
            });
        }
    }

    // ── Input Events ──────────────────────────────────────────────────────
    function initInputEvents() {
        const input = document.getElementById('stellaInput');
        const sendbtn = document.getElementById('stellaSendBtn');
        const endBtn = document.getElementById('stellaEndBtn');

        input?.addEventListener('input', () => updateSendBtn(input.value));
        input?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
                e.preventDefault();
                sendMessage(input.value);
            }
            // Cancel auto-send if typing
            if (StellaState.autoSendTimer) {
                clearTimeout(StellaState.autoSendTimer);
                StellaState.autoSendTimer = null;
            }
        });

        sendbtn?.addEventListener('click', () => {
            if (input && input.value.trim()) sendMessage(input.value);
        });

        endBtn?.addEventListener('click', endSession);
    }

    function updateSendBtn(val) {
        const btn = document.getElementById('stellaSendBtn');
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
    async function initStella() {
        // Get user from auth
        try {
            if (window.eduplay?.getCurrentUser) {
                const user = await window.eduplay.getCurrentUser();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                StellaState.userId = user.id || user.auth_id;
                StellaState.childData = user;
            } else if (window.eduplay?.session?.getUser) {
                const user = window.eduplay.session.getUser();
                if (!user) { window.location.href = 'login.html'; return; }
                StellaState.userId = user.id;
                StellaState.childData = user;
            }
        } catch (e) {
            console.error('Stella: auth error', e);
        }

        if (!StellaState.userId) {
            // Try Supabase session directly
            try {
                const sb = getSupabase();
                const { data: { session } } = await sb.auth.getSession();
                if (!session) { window.location.href = 'login.html'; return; }
                StellaState.userId = session.user.id;
                const { data: profile } = await sb.from('users').select('*').eq('id', session.user.id).single();
                StellaState.childData = profile || { id: session.user.id, username: session.user.email?.split('@')[0] || 'Explorer' };
            } catch (e) { console.error('Stella: fallback auth failed', e); return; }
        }

        // Load progress
        StellaState.progress = await loadProgress();
        if (StellaState.progress) {
            StellaState.currentLevel = StellaState.progress.current_level || 1;
        }
        StellaState.levelAtSessionStart = StellaState.currentLevel;

        // Setup UI
        updateLevelUI(StellaState.currentLevel);
        renderLeftPanelStats();
        startSessionTimer();
        initVoiceInput();
        initVoiceToggle();
        initInputEvents();

        // Show opening message
        const opening = buildStellaOpening();
        setTimeout(() => {
            displayStellaMessage(opening.message);
            scrollToBottom(true, true);
            speakText(opening.message);
        }, 600);
    }

    // Boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStella);
    } else {
        initStella();
    }

    // ── Dashboard integration ─────────────────────────────────────────────
    window.loadStellaProgress = async function (userId) {
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
