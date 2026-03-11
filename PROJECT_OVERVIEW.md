# EduPlay / GCT Connect: Project Setup & Architecture Overview

This document provides a comprehensive overview of the EduPlay platform (also known as GCT Connect), detailing the project structure, database setup, external API integrations, and core module logic based on the codebase analysis.

## 1. Project Structure

The project is structured as a plain HTML/CSS/JS frontend application, designed to be lightweight and fast. It relies on a BaaS (Backend-as-a-Service) model via **Supabase**.

```text
/home/krishnadas/edu-learning/
├── css/             # Stylesheets for various components and pages
├── html/            # HTML pages (dashboard, games, quiz, login, stella, etc.)
├── js/              # Core logic and module scripts
│   ├── auth.js      # Authentication and session management
│   ├── dashboard.js # Real-time dashboard state, animations, data loading
│   ├── stella.js    # Stella AI English Coach logic (Groq API integration)
│   ├── quiz.js      # Quiz engine logic
│   ├── adaptive.js  # Adaptive difficulty tracking
│   ├── mascot.js    # Interactive mascot behaviors
│   └── ...          # Mini-game specific scripts (math-blaster, memory-flip, etc.)
├── config.js        # Global configuration (API keys, settings)
├── create_tables.sql            # Base SQL schema for quizzes and badges
├── create_nova_parent_tables.sql # Advanced SQL schema for AI learning and parent tracking
```

## 2. API Connections & Integrations
The centralized configuration is handled in `config.js` and local instances, which connect the frontend to backend and AI services.

### A. Supabase (Database, Auth & Realtime)
* **Connection Details**: Initiated via `window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)`
* **Usage**: 
  * Provides JWT-based user authentication (PKCE flow supported).
  * Direct PostgreSQL database interactions via RESTful endpoints.
  * Secures data via Row Level Security (RLS) policies allowing users to read/write only their rows matching `auth.uid()`.
  
### B. Groq API (Language Learning AI)
* **Connection Details**: `POST` requests to `https://api.groq.com/openai/v1/chat/completions` using Bearer Token authorization with `CONFIG.GROQ_API_KEY`.
* **Usage**: Powers the **Stella AI Coach**, utilizing the `llama-3.3-70b-versatile` model. 
* **Prompt Engineering**: The application sends a highly structured system prompt that enforces strict JSON returns encompassing textual responses, a list of corrections, vocabulary definitions, and an internal grammar assessment score to calculate the student's level.

### C. ElevenLabs API (Text-to-Speech)
* **Connection Details**: REST requests via `CONFIG.ELEVENLABS_API_KEY` focusing on the `eleven_turbo_v2` model.
* **Usage**: Provides the voice output for characters like Bella (Stella) so children can hear correct English pronunciation.

---

## 3. Detailed Database Architecture

Data persistence is managed via PostgreSQL on Supabase. Below are the specific tables mapped to the application's logic.

### Authentication & Profiles
* **`users`** (Public schema mapping)
  * `id` (UUID, Primary Key, foreign key to `auth.users`)
  * `username` (Text, unique)
  * `email` (Text)
  * `age` (Integer)
  * `total_points` (Integer) - Gamification aggregate
  * `quizzes_completed` (Integer)
  * `game_coins` (Integer) - Currency for unlocking game features
  * `parent_pin` (VARCHAR) - Security pin to access the Parent View dashboard.

### Gamification & Quizzes
* **`quiz_results`**
  * `id` (UUID)
  * `user_id` (UUID, linked to `users`)
  * `module` (Text) - E.g., 'mathematics', 'english', 'general-knowledge'
  * `score` (Integer)
  * `total_questions` (Integer)
  * `percentage` (Integer)
  * `created_at` (TIMESTAMPTZ)
* **`user_badges`**
  * `id` (UUID)
  * `user_id` (UUID)
  * `name` (Text) - E.g., 'Quiz Master', 'Point Collector'
  * `icon` (Text)
  * `earned_at` (TIMESTAMPTZ)

### AI & Language Progress (Stella / Nova)
* **`user_english_progress`**
  * `user_id` (UUID, Unique)
  * `current_level` (Integer, 1-5)
  * `words_learned` (JSONB)
  * `focus_areas` (JSONB)
  * `session_streak` (Integer)
  * `last_topic` (Text)
* **`nova_sessions`**
  * Tracks individual sessions: `duration_seconds`, `message_count`, `words_learned`, `corrections_count`.
* **`nova_vocabulary`**
  * User-specific dictionary tracking `word`, `definition`, `example_sentence`, and `times_encountered`.
* **`parent_view_sessions`**
  * Audit log containing `viewed_at` and `duration_seconds` for parent oversight.

---

## 4. Key Subsystems, Logic & Features

### A. Authentication Pipeline (`auth.js`)
* **Features**: Registration, Login, Session caching, Password Matching, and Session Recovery.
* **Logic**: 
  1. Captures form input and validates standard formats (email structure, age limits).
  2. Queries Supabase using a `maybeSingle()` check to ensure username uniqueness.
  3. Registers via `supabase.auth.signUp()`.
  4. Implements an **exponential-backoff retry** logic loop when inserting the public profile to mitigate Foreign Key constraints against the Supabase internal Auth trigger slowing down.
  5. Caches user identifiers in `localStorage` for rapid UI rendering alongside native Supabase token persistence.

### B. Dashboard Hub (`dashboard.js`)
* **Features**: Statistic tracking, level calculating, interactive mascot, recent modules.
* **Logic**: 
  1. Validates the cached session, resolving the `getCurrentUser` promise.
  2. Triggers sequential CSS `cubic-bezier` animations to reveal the UI chronologically.
  3. Evaluates `quizzes_completed` against point structures to compute gamification levels (e.g., Space Cadet, Fire Champion).
  4. Parses recent timestamps from `quiz_results` history to compute consecutive daily login streaks.
  5. Instructs the Mascot API to deliver an audio/text greeting summarizing the user's weakest and strongest subjects based on aggregated percentages.

### C. Stella AI Learning Engine (`stella.js`)
* **Features**: Contextual chatbot, Grammar correction UI tooltips, Level-based difficulty scalar, Dynamic Vocabulary building.
* **Logic**: 
  1. **Initialization:** Checks `user_english_progress` to determine the user's starting difficulty level (1-5).
  2. **Conversation Loop:** 
     * User submits text.
     * Script builds a dynamic system prompt feeding the Groq API the user's name, age, current level, and recent grammar "focus areas".
     * Groq validates the text and responds via a strict JSON layout.
  3. **UI Parsing:** 
     * Extracts `corrections` and attaches clickable UI tooltip dots to the user's chat bubble.
     * Extracts `newWords` and wraps them in specialized CSS spans for hover-definitions.
     * Calculates the `assessment` scores internally to determine if the user qualifies for the next difficulty level.
  4. **Persistence:** Saves the aggregate `sessionWords` and session length upon closing the window to Supabase.

### D. Parent Oversight View
* **Features**: PIN-protected dashboard summarizing the child's interactions, focus areas, and quiz history.
* **Logic**:
  1. Requests the 4-digit PIN stored in `users.parent_pin`.
  2. Compiles graphs depicting test scores over time and vocabulary lists extracted from `nova_vocabulary`.
  3. Logs the parent session in `parent_view_sessions` for security auditing.

### E. Gamified Modules & Mini-games
The project contains several mini-games functioning inside the ecosystem:
* **Quiz Engine (`quiz.js` / `adaptive.js`)**: Features dynamic question pulling based on user age and past performance percentages. Marks answers, aggregates scores, and commits to `quiz_results`.
* **Math Blaster (`math-blaster.js`)**: An arcade-style math game focused on quick arithmetic linked to a high-score database.
* **Word Bubble (`word-bubble.js`)**: A spelling/vocabulary game targeting words currently stored in the user's `nova_vocabulary` array.
* **Memory Flip / Puzzle Quest**: Visual cognitive games awarding `game_coins` for completion.
