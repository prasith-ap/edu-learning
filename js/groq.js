/**
 * EduPlay - Groq API Integration
 * Handles AI question generation, hints, and feedback.
 * Includes caching, retry logic, and Supabase fallback on 2 failures.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const GroqAPI = {
    // Caches to avoid redundant API calls
    cache: {
        hints: {},
        feedback: {}
    },

    /**
     * Helper to make API calls to Groq
     */
    async callGroq(messages, model = 'llama3-8b-8192', temperature = 0.5, maxTokens = 500) {
        if (!CONFIG.GROQ_API_KEY) {
            throw new Error("Groq API Key missing");
        }

        const response = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    },

    /**
     * Generate 10 adaptive questions with 2 retries on failure.
     * If it fails twice, fallback to fetching from Supabase.
     */
    async generateQuestions(module, weakTopics = []) {
        let focusInstruction = weakTopics.length > 0
            ? `Focus particularly on these weak topics: ${weakTopics.join(', ')}.`
            : 'Include a balanced mix of topics for this subject.';

        const systemPrompt = `You are a friendly, encouraging teacher generating a JSON quiz for kids aged 6-12 about ${module}.
${focusInstruction}

Return EXACTLY a JSON object with this shape:
{
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correct_index": 1,
      "hint": "Try counting on your fingers!",
      "topic_tag": "addition",
      "difficulty": 1
    }
  ]
}
Generate exactly 10 questions. Questions must be engaging, age-appropriate, and factually correct.`;

        let retries = 2;
        while (retries > 0) {
            try {
                const result = await this.callGroq([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: 'Generate the quiz now.' }
                ]);

                if (result && result.questions && result.questions.length > 0) {
                    // Add module tag to each for consistency with DB
                    return result.questions.map(q => ({ ...q, module: module }));
                }
            } catch (err) {
                console.warn(`Groq generation failed, retries left: ${retries - 1}`, err);
            }
            retries--;
        }

        console.log("Groq failed twice. Falling back to Supabase.");
        return await this.fetchQuestionsFromSupabase(module);
    },

    /**
     * Generate a helpful hint for a specific question
     */
    async getAIHint(questionText, options) {
        const cacheKey = questionText;
        if (this.cache.hints[cacheKey]) {
            return this.cache.hints[cacheKey];
        }

        try {
            const result = await this.callGroq([
                { role: 'system', content: 'You are a supportive primary school tutor. Provide a clever, encouraging 1-sentence hint for a kid. Do not reveal the answer.' },
                { role: 'user', content: `Question: ${questionText}\nChoices: ${options.join(' | ')}\n\nReturn JSON: {"hint": "your hint"}` }
            ], 'llama-3.1-8b-instant', 0.6, 120);

            const hintText = result.hint || result.feedback || "Look at the options closely! 🧐";
            this.cache.hints[cacheKey] = hintText;
            return hintText;
        } catch (err) {
            console.error("Groq Hint generation failed, using local hint:", err);
            // If the model fails, check if we have a hardcoded hint in the question object
            return null; // Let quiz.js handle fallback
        }
    },

    /**
     * Generate post-answer feedback explaining why it's right/wrong
     */
    async generateQuizFeedback(questionText, selectedAnswer, correctAnswer, isCorrect) {
        const cacheKey = `${questionText}_${selectedAnswer}`;
        if (this.cache.feedback[cacheKey]) {
            return this.cache.feedback[cacheKey];
        }

        try {
            const result = await this.callGroq([
                { role: 'system', content: 'You are a warm, encouraging teacher explaining answers to a child (age 6-12). Keep it strictly to 1 or 2 short, simple sentences. Explain why the correct answer is true. Format output strictly as JSON.' },
                {
                    role: 'user',
                    content: `Question: ${questionText}
          Student picked: ${selectedAnswer} (which is ${isCorrect ? 'Correct' : 'Wrong'})
          Correct answer: ${correctAnswer}
          
          Return JSON format: { "feedback": "your friendly explanation here" }`
                }
            ], 'llama-3.1-8b-instant', 0.7, 150); // Trying a faster model for instant feedback

            const feedbackTxt = result.feedback || (isCorrect ? "Great job! That's exactly right." : `Not quite! The correct answer is ${correctAnswer}.`);
            this.cache.feedback[cacheKey] = feedbackTxt;
            return feedbackTxt;
        } catch (err) {
            console.error("Groq Feedback generation failed:", err);
            return isCorrect ? "Great job! That's exactly right." : `Not quite! The correct answer is ${correctAnswer}.`;
        }
    },

    /**
     * Fallback implementation: Fetch from Supabase quiz_questions
     */
    async fetchQuestionsFromSupabase(moduleSlug) {
        try {
            const client = window.initSupabase ? window.initSupabase() : null;
            if (!client) throw new Error("Supabase client not initialized");

            const { data, error } = await client
                .from('quiz_questions')
                .select('*')
                .eq('module', moduleSlug);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // Shuffle and pick 10
            const shuffled = [...data].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, 10);
        } catch (e) {
            console.error("Supabase fallback also failed:", e);
            return []; // Return empty array so standard error handling catches it
        }
    }
};

window.GroqAPI = GroqAPI;
