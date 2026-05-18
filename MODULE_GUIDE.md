# 📘 MindBridge — Complete Module Guide
> Read this to understand every single file in the project, what it does, and why it exists.

---

## 🗂️ PROJECT OVERVIEW

MindBridge is a **MERN stack** (MongoDB, Express, React, Node.js) application that uses **Claude AI** (by Anthropic) to help users track their mental health through journaling, mood logging, and AI conversations.

The codebase is split into two independent apps:
- **`/server`** — the Node.js + Express backend API
- **`/client`** — the React + Vite frontend

They talk to each other via HTTP (REST API) and WebSockets (Socket.io).

---

## 🖥️ SERVER — `/server`

### `server/server.js` — The Entry Point
**What it does:** This is the first file Node.js runs. Think of it as the "traffic controller" of the entire backend.

It does 6 things in order:
1. Loads all environment variables from `.env` (API keys, DB URL, etc.)
2. Connects to MongoDB database
3. Sets up security middleware (helmet, CORS, rate limiting)
4. Mounts all route groups (`/api/auth`, `/api/journal`, etc.)
5. Initializes Socket.io for real-time communication
6. Starts listening on port 5000

**Key concept — Middleware:** Express processes requests through a "pipeline" of functions called middleware. Security middleware runs BEFORE routes, so all requests are cleaned and validated first.

**Rate limiting:** The AI endpoints (`/api/chat`, `/api/journal`, `/api/insights`) have their own stricter rate limiter — 10 requests per minute — because each call costs money (Claude API billing).

---

### 📁 `server/models/` — Database Schemas

All data in MindBridge is stored in MongoDB. Mongoose "models" define the shape of that data.

#### `models/User.js`
**What it stores:** Everything about a user — their login credentials, mental health profile, streak data, trusted contacts, and badges.

**Key design choices:**
- `password` has `select: false` — this means it's NEVER returned by default in any query. You must explicitly ask for it. This prevents accidentally leaking passwords in API responses.
- `trustedContacts` is embedded directly in the user document (instead of a separate collection) because it's always needed together with user data.
- The `pre('save')` hook automatically hashes the password with bcrypt before storing it. bcrypt is a one-way algorithm — you can never reverse it back to the original.
- `getSignedJwtToken()` generates a JWT (JSON Web Token) — a signed string that proves who you are, used instead of session cookies.
- `updateStreak()` calculates if you journaled yesterday (streak continues) or missed a day (streak resets).

#### `models/Journal.js`
**What it stores:** Each journal entry a user writes.

**Key design choices:**
- The `aiAnalysis` sub-schema is initially empty `{}` and gets filled in AFTER the entry is saved. This is intentional — the user's entry saves instantly, and AI analysis comes seconds later.
- `wordCount` is calculated automatically via a `pre('save')` hook, so the frontend never needs to count words.
- The compound index `{ user: 1, createdAt: -1 }` makes "show me all entries for this user, newest first" queries extremely fast, even with millions of entries.

#### `models/Mood.js`
**What it stores:** Daily mood ratings (1–10 scale) with emotion labels and context factors.

**Key design choice:** The compound unique index `{ user: 1, date: 1 }` ensures a user can only have ONE mood entry per day. The `date` field is always normalized to midnight (`setHours(0,0,0,0)`) so "today" always means the same thing regardless of time zone.

#### `models/Chat.js`
**What it stores:** Full conversation sessions with the AI therapist.

**Key design choice:** Instead of storing one document per message, the ENTIRE conversation array is stored in ONE document. This is because Claude's API needs the full conversation history every time you send a message (it has no memory otherwise). One database query retrieves everything needed.

#### `models/Crisis.js`
**What it stores:** A log of every time the AI detected potential crisis language.

**Purpose:** Two-fold — safety audit trail (reviewable later) and source data for the crisis dashboard. It tracks WHICH contacts were notified and whether the notification email succeeded or failed.

---

### 📁 `server/services/` — Business Logic Services

#### `services/aiService.js` ⭐ MOST IMPORTANT FILE
**What it does:** All 4 Claude AI integrations live here.

**Function 1: `analyzeJournalEntry(content, userProfile)`**
- Sends the journal text to Claude with a detailed system prompt
- The system prompt instructs Claude to respond ONLY in JSON format (no prose, no markdown)
- Returns emotions, triggers, cognitive distortions, coping suggestions, and an affirmation
- If Claude fails (API down, rate limited), returns safe default values so the user's entry still saves

**Function 2: `chat(messages, userProfile)`**
- Sends the FULL conversation history to Claude on every call (this is how Claude "remembers")
- The system prompt creates the "Sage" persona — warm, non-clinical, like a knowledgeable friend
- Safety rules are baked into the prompt: always recommend professional help, never diagnose, always provide crisis resources when needed
- The AI embeds metadata at the end of its response in a `[METADATA]...[/METADATA]` tag that we strip from the visible text

**Function 3: `detectCrisis(text)`**
- First does a cheap keyword scan (no API call) — if no crisis words found, returns immediately
- Only calls Claude if a keyword is found, for nuanced judgment (venting ≠ active ideation)
- If Claude is unavailable and a keyword was found, errs on the side of caution (flags as crisis)

**Function 4: `generateWeeklyInsight(entries, moods, userProfile)`**
- Compresses a week's data into a compact summary (to keep the prompt small)
- Asks Claude to generate a personalized, encouraging markdown-formatted report
- Returns markdown text that the frontend renders with the `react-markdown` library

#### `services/emailService.js`
**What it does:** Sends HTML-formatted emails to trusted contacts when a crisis is detected.

Uses Nodemailer + Gmail SMTP. The email includes:
- Severity indicator (color-coded)
- A warm, human-written explanation
- Crisis hotline numbers for the contact to share
- A clear disclaimer that this is automated

#### `services/socketService.js`
**What it does:** Sets up the real-time Socket.io connection.

Every user who connects is authenticated via JWT (from the socket handshake) and joins a "room" identified by their user ID. When the server needs to send an event to one specific user (like "your AI analysis is done" or "crisis detected"), it emits to that user's room.

Without Socket.io, the frontend would need to constantly poll the server asking "is my analysis done yet?" Socket.io lets the server PUSH events to the client the moment they happen.

---

### 📁 `server/middleware/`

#### `middleware/auth.js`
**What it does:** Verifies that a request is from a logged-in user.

It looks for a JWT token in two places:
1. HTTP-only cookie (preferred — can't be stolen by JavaScript/XSS attacks)
2. `Authorization: Bearer <token>` header (for API clients)

The `sendTokenResponse()` helper is used by auth controllers to set the cookie AND return the user data in one step.

---

### 📁 `server/controllers/`

Controllers contain the actual logic for each API endpoint. Routes call controllers.

#### `controllers/authController.js`
Handles: register, login, logout, get-me, update-profile

The login flow:
1. Find user by email
2. Compare submitted password with bcrypt hash
3. If match → generate JWT → set as HTTP-only cookie → return user data

#### `controllers/journalController.js` ⭐ KEY FILE
**The `createEntry` function is the most complex in the project.**

It works in 3 phases (all after the initial HTTP response is sent):
1. **Immediate save** — entry goes to MongoDB, user gets a `201 Created` response
2. **Crisis detection** — runs async, logs event, emails contacts, emits Socket.io event
3. **Full AI analysis** — runs async, updates the entry in DB, emits `analysis:complete` socket event

This phased approach means the user NEVER waits for Claude AI before their entry is confirmed saved.

#### `controllers/chatController.js`
Sends a message to Claude AI and handles the response. Runs crisis detection in PARALLEL with the AI response (using `Promise.all`) to save time.

#### `controllers/moodController.js`
The `getAnalytics` function is the most interesting — it fetches both mood logs and journal entries, then aggregates them into data structures ready for chart rendering (trend arrays, frequency counts, heatmap objects).

#### `controllers/insightsController.js`
Simple: fetches the last 7 days of data and passes it to `generateWeeklyInsight()`.

---

### 📁 `server/routes/`
Each route file maps HTTP methods + paths to controller functions. Routes also apply the `protect` middleware to guard private endpoints.

Example pattern:
```
router.route("/")
  .post(createEntry)   // POST /api/journal  → create
  .get(getEntries);    // GET  /api/journal  → list
```

---

## ⚛️ CLIENT — `/client`

Built with React 18 + Vite. Uses TailwindCSS for styling, Framer Motion for animations, Recharts for data visualization.

### `client/index.html`
The single HTML file React attaches to. Loads Google Fonts (Playfair Display for headings, DM Sans for body text). Everything else is JavaScript.

### `client/src/main.jsx`
Bootstraps the React app — wraps it in `BrowserRouter` for client-side routing and renders into the `#root` div.

### `client/src/App.jsx`
The root component that sets up:
- **Context providers** (in order: AuthProvider wraps SocketProvider so socket can access user)
- **React Router routes** — maps URLs to page components
- **Protected route wrapper** — redirects to login if user not authenticated
- **Global crisis modal** — always rendered, only visible when `crisisAlert` state is set

### `client/src/index.css`
Global styles built on top of Tailwind. Defines:
- Custom CSS component classes (`.glass`, `.btn-primary`, `.input-field`, `.card`) — used throughout the app for visual consistency
- Background orb animations (the glowing circles in the background)
- Typing indicator animation (the three bouncing dots shown while AI is responding)
- Mood color classes (red for low mood, green/blue for high)

---

### 📁 `client/src/context/`

React Context provides data to any component in the tree without "prop drilling".

#### `context/AuthContext.jsx`
**What it provides:** `user`, `loading`, `login()`, `register()`, `logout()`, `updateUser()`

On first render, it calls `GET /api/auth/me` to check if there's a valid session cookie. This means users don't see the login screen on page refresh if they're already logged in.

#### `context/SocketContext.jsx`
**What it provides:** `socket` (the Socket.io instance), `crisisAlert` (active crisis event data), `dismissCrisis()`

Only creates a socket connection when the user is logged in. Listens for `crisis:detected` events from the server and stores them in state — this triggers the crisis modal to appear.

---

### 📁 `client/src/utils/`

#### `utils/api.js`
A pre-configured Axios instance. Key settings:
- `baseURL: "/api"` — all requests go to the backend
- `withCredentials: true` — sends cookies with every request (required for JWT auth)
- Response interceptor: if any request gets a `401 Unauthorized` response, automatically redirect to the login page

---

### 📁 `client/src/pages/`

Pages are full-screen views rendered by React Router.

#### `pages/LoginPage.jsx` & `pages/RegisterPage.jsx`
Authentication forms. RegisterPage includes a goal-selection interface where users pick what they want to work on. These goals are stored in the user profile and later injected into Claude AI system prompts for personalization.

#### `pages/DashboardPage.jsx`
The main "home screen" after login. Fetches analytics and recent journal entries in parallel (`Promise.all`). Renders:
- Stats row (streak, avg mood, entry count, badge count)
- Mood trend line chart (Recharts `LineChart`)
- Emotion breakdown pie chart (Recharts `PieChart`)
- Quick action cards
- Recent journal entries list

#### `pages/JournalPage.jsx` ⭐ KEY PAGE
Two-panel layout: write on the left, see AI analysis on the right.

**The real-time flow:**
1. User types journal entry, sets mood slider, adds tags
2. Clicks "Save & Analyze" → POST to `/api/journal`
3. Server responds immediately (entry saved) → toast shows "Entry saved! Analyzing..."
4. Socket.io listener waits for `analysis:complete` event
5. When event arrives, analysis panel populates with emotions, affirmations, suggestions

#### `pages/ChatPage.jsx`
Full chat UI with conversation history sidebar. Messages render markdown (AI uses bold, lists, etc.). Shows typing indicator while waiting for response. Crisis detection runs server-side — if detected, shows a toast notification.

#### `pages/MoodPage.jsx`
Daily mood logger + 90-day heatmap calendar. The heatmap uses CSS grid with `date-fns` to generate the last 90 days. Each cell's color is determined by the mood score (red=low, blue=high).

#### `pages/InsightsPage.jsx`
Simple page with a "Generate My Report" button. When clicked, calls `/api/insights/weekly`. The returned markdown is rendered with `react-markdown`.

#### `pages/JournalDetailPage.jsx`
Full view of a single journal entry. Shows the raw text, all AI analysis fields, stress level bar, trigger tags, and coping suggestions.

#### `pages/ProfilePage.jsx`
User settings + trusted contacts manager. Contacts are added here and stored in the user's MongoDB document. These are the people who get crisis emails.

---

### 📁 `client/src/components/`

#### `components/Layout/AppLayout.jsx`
The persistent shell around all protected pages. Contains:
- Left sidebar with logo, user info (name + streak), navigation links, logout button
- Right main area where page content renders via `<Outlet />`
- Background orb divs (purely decorative CSS animations)

The `<NavLink>` component from React Router automatically applies an `isActive` class when the current URL matches the link's `to` prop.

#### `components/Crisis/CrisisModal.jsx`
A full-screen overlay (fixed position, z-index 50, dark backdrop) that appears when the Socket.io `crisis:detected` event fires. Cannot be closed by clicking outside — user MUST click the "I'm Safe" button. This ensures they see the crisis resources. Lists 5 crisis helplines with phone links.

---

## 🔄 DATA FLOW DIAGRAM

```
User writes journal entry
        ↓
React form → POST /api/journal
        ↓
authMiddleware verifies JWT cookie
        ↓
journalController.createEntry()
  ├─ Save to MongoDB (instant)
  ├─ Return 201 response to client ← User sees "Entry saved!"
  │
  ├─ [ASYNC] detectCrisis()
  │     ├─ Keyword scan (fast)
  │     ├─ If keyword: Claude API call
  │     ├─ If crisis: create Crisis doc
  │     ├─ Send emails via Nodemailer
  │     └─ Emit "crisis:detected" via Socket.io
  │
  └─ [ASYNC] analyzeJournalEntry()
        ├─ Claude API call with system prompt
        ├─ Parse JSON response
        ├─ Update Journal doc with analysis
        └─ Emit "analysis:complete" via Socket.io
                ↓
        React receives socket event
                ↓
        Analysis panel updates in real-time
```

---

## 🔐 SECURITY LAYERS

| Layer | Mechanism | Where |
|-------|-----------|-------|
| Authentication | JWT in HTTP-only cookie | `middleware/auth.js` |
| Password storage | bcrypt (cost 12) | `models/User.js` pre-save hook |
| NoSQL injection | mongo-sanitize strips `$` and `.` | `server.js` middleware |
| XSS prevention | helmet sets security headers | `server.js` middleware |
| CSRF | SameSite=strict cookie | `middleware/auth.js` |
| Rate limiting | 100 req/15min global, 10/min for AI | `server.js` middleware |
| Data isolation | All DB queries include `user: req.user.id` | All controllers |

---

## 🌐 API QUICK REFERENCE

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, get JWT cookie |
| POST | `/api/auth/login` | Login, get JWT cookie |
| GET | `/api/auth/me` | Get current user from cookie |
| POST | `/api/journal` | Save entry + trigger AI analysis |
| GET | `/api/journal` | List entries (paginated, filterable) |
| GET | `/api/journal/:id` | Get single entry with full content |
| DELETE | `/api/journal/:id` | Delete entry |
| POST | `/api/mood` | Log today's mood |
| GET | `/api/mood/analytics` | Get charts data |
| POST | `/api/chat` | Send message to AI therapist |
| GET | `/api/chat/history` | List past conversations |
| GET | `/api/insights/weekly` | Generate weekly AI report |
| POST | `/api/crisis/contacts` | Add trusted contact |

---

## 📦 KEY DEPENDENCIES EXPLAINED

| Package | Why we use it |
|---------|--------------|
| `@anthropic-ai/sdk` | Official SDK to call Claude AI |
| `mongoose` | MongoDB object modeling — schema, validation, queries |
| `jsonwebtoken` | Create and verify JWT tokens for auth |
| `bcryptjs` | Hash passwords (one-way encryption) |
| `socket.io` | Real-time bidirectional events (server→client push) |
| `nodemailer` | Send HTML emails via SMTP |
| `helmet` | Sets secure HTTP response headers |
| `express-rate-limit` | Throttle requests to prevent abuse |
| `express-mongo-sanitize` | Block NoSQL injection attacks |
| `framer-motion` | React animation library |
| `recharts` | Chart components built on React + SVG |
| `react-markdown` | Render AI's markdown responses as HTML |
| `react-hot-toast` | Non-blocking notification toasts |
| `date-fns` | Date formatting and manipulation |
| `socket.io-client` | Browser-side Socket.io connection |

---

## 🚀 HOW TO RUN

```bash
# Terminal 1 — Start Backend
cd server
cp .env.example .env    # Fill in your actual values
npm install
npm run dev             # Starts on http://localhost:5000

# Terminal 2 — Start Frontend
cd client
cp .env.example .env
npm install
npm run dev             # Starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 🎯 THE 4 AI INTEGRATION POINTS (Summary)

1. **Journal Analysis** → `POST /api/journal` → `aiService.analyzeJournalEntry()`
   - Triggered every time a journal entry is saved
   - Returns structured JSON: emotions, triggers, suggestions, affirmation

2. **AI Therapist Chat** → `POST /api/chat` → `aiService.chat()`
   - Triggered on every chat message
   - Maintains context via full message history
   - "Sage" persona with safety guardrails built into system prompt

3. **Crisis Detection** → Runs on BOTH journal saves and chat messages → `aiService.detectCrisis()`
   - Two-stage: fast keyword check first, then Claude for nuanced judgment
   - Triggers email alerts and Socket.io events if crisis detected

4. **Weekly Insights** → `GET /api/insights/weekly` → `aiService.generateWeeklyInsight()`
   - On-demand, generates personalized markdown report
   - Aggregates a week of journal + mood data before calling Claude
