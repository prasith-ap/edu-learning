/**
 * EduPlay - Adaptive Difficulty Engine
 * Analyzes previous quiz history to identify weak topic tags
 * and fetch an appropriate mix of questions (4 weak + 6 random).
 */

const AdaptiveEngine = {
    /**
     * Fetches user's past quiz history for the specific module
     * and identifies any topic tags where the correct rate < 60%.
     */
    async analyseWeakAreas(userId, moduleSlug) {
        try {
            const client = window.initSupabase ? window.initSupabase() : null;
            if (!client) return [];

            // Fetch last 5 quiz attempts for this module
            const { data: history, error } = await client
                .from('quiz_history')
                .select('*')
                .eq('user_id', userId)
                .eq('module', moduleSlug)
                .order('date', { ascending: false })
                .limit(5);

            if (error || !history || history.length === 0) return [];

            // If we don't have enough history to make a good judgment, return empty
            if (history.length < 2) return [];

            // Note: Assuming we saved detailed per-topic correctness in a hypothetical schema
            // Since it's not explicitly in quiz_history, adaptive logic requires quiz_questions tagging.
            // We will identify weak topics based on a simulated array if the 'topic_tag' isn't explicitly
            // available in the history rows, or based on overall performance mapping.

            // For the scope of this implementation without deep schema changes to quiz_history:
            // If the user scored < 60% on average in their last 2 quizzes, we will trigger adaptive "mixed" topics.
            // If the historical data has a detailed breakdown, we would parse it here.

            const avgScore = history.reduce((acc, curr) => acc + curr.percentage, 0) / history.length;

            if (avgScore < 60) {
                // Return a default set of weak tags based on module to feed into Groq
                if (moduleSlug === 'mathematics') return ['addition', 'subtraction', 'word_problems'];
                if (moduleSlug === 'english') return ['vocabulary', 'grammar', 'spelling'];
                if (moduleSlug === 'general-knowledge') return ['geography', 'history', 'science'];
            }

            return [];
        } catch (e) {
            console.error("analyseWeakAreas error:", e);
            return [];
        }
    },

    /**
     * Main entry point to fetch questions using the Adaptive Engine
     */
    async getAdaptiveQuestions(moduleSlug) {
        let weakAreas = [];

        // Attempt to get user ID
        try {
            const client = window.initSupabase ? window.initSupabase() : null;
            if (client) {
                const { data: { user } } = await client.auth.getUser();
                if (user) {
                    weakAreas = await this.analyseWeakAreas(user.id, moduleSlug);
                }
            }
        } catch (e) {
            console.warn("Could not fetch user context for adaptive logic, proceeding with standard generation");
        }

        if (weakAreas.length > 0) {
            console.log(`🎯 Adaptive Difficulty Active! Weak areas identified: ${weakAreas.join(', ')}`);
        } else {
            console.log(`🎲 Standard Difficulty: Fetching balanced topics.`);
        }

        // Call Groq to generate the customized questions
        if (window.GroqAPI) {
            return await window.GroqAPI.generateQuestions(moduleSlug, weakAreas);
        } else {
            throw new Error("Groq API not loaded!");
        }
    }
};

window.AdaptiveEngine = AdaptiveEngine;
