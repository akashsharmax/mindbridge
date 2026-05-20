# 🧠 MindBridge — Complete Project Explanation
## Every File, Every Module, Every Decision — Explained From Scratch

---

## 📋 Table of Contents
1. [What Problem Does This Solve?](#1-what-problem-does-this-solve)
2. [How the App Works — Big Picture](#2-how-the-app-works--big-picture)
3. [Project Folder Structure](#3-project-folder-structure)
4. [SERVER — Every File Explained](#4-server--every-file-explained)
5. [CLIENT — Every File Explained](#5-client--every-file-explained)
6. [AI Integration Deep Dive](#6-ai-integration-deep-dive)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Setup Guide Step by Step](#8-setup-guide-step-by-step)
9. [API Reference](#9-api-reference)
10. [Security Decisions Explained](#10-security-decisions-explained)

---

## 1. What Problem Does This Solve?

**The Problem:** 1 in 4 people struggle with mental health globally. Most people either:
- Can't afford therapy (expensive, limited access)
- Won't talk to friends (stigma, fear of judgment)
- Use generic apps that feel cold and unhelpful
- Don't notice their own emotional patterns until it's too late

**MindBridge Solution:**
A personal AI-powered journal + therapist companion that:
- Lets you write freely without judgment
- Uses Gemini Ai to understand your emotions and give real insights
- Tracks your mood over weeks so you see your own patterns
- Detects if you're in crisis and quietly alerts your trusted contacts
- Feels like talking to a compassionate, knowledgeable friend

---

## 2. How the App Works — Big Picture

```
USER writes a journal entry
        ↓
REACT FRONTEND sends it to Express API
        ↓
SERVER saves it to MongoDB immediately (fast)
        ↓
SERVER runs Crisis Detection (Claude AI — fast check)
        ↓
   Is it a crisis? YES → Log it → Email trusted contacts → Socket.io alert to browser
        ↓
SERVER runs Full AI Analysis (Claude AI — deeper)
        ↓
MongoDB updated with emotions, triggers, suggestions
        ↓
Socket.io emits "analysis:complete" to browser
        ↓
REACT UI updates live — user sees their analysis
```

**Three types of real-time communication:**
- **HTTP REST API** → Standard request/response for CRUD operations
- **Socket.io** → Real-time push for AI analysis completion & crisis alerts
- **Nodemailer** → Email to trusted contacts when crisis detected

---

## 3. Project Folder Structure

```
mindbridge/
│
├── README.md                    ← Project overview (GitHub landing page)
├── EXPLANATION.md               ← This file — detailed explanation
│
├── server/                      ← Node.js + Express backend
│   ├── server.js                ← Entry point — starts everything
│   ├── package.json             ← Backend dependencies
│   ├── .env.example             ← Template for environment variables
│   │
│   ├── models/                  ← MongoDB data schemas (Mongoose)
│   │   ├── User.js              ← User accounts, streaks, trusted contacts
│   │   ├── Journal.js           ← Journal entries + AI analysis results
│   │   ├── Mood.js              ← Daily mood logs
│   │   ├── Chat.js              ← AI conversation history
│   │   └── Crisis.js            ← Crisis event log
│   │
│   ├── controllers/             ← Business logic (what happens on each API call)
│   │   ├── authController.js    ← Register, login, logout, profile
│   │   ├── journalController.js ← Create/read/delete entries + trigger AI
│   │   ├── moodController.js    ← Log mood + generate analytics
│   │   ├── chatController.js    ← Send message to AI, get reply
│   │   └── insightsController.js← Generate weekly AI report
│   │
│   ├── routes/                  ← URL path definitions
│   │   ├── auth.js              ← /api/auth/*
│   │   ├── journal.js           ← /api/journal/*
│   │   ├── mood.js              ← /api/mood/*
│   │   ├── chat.js              ← /api/chat/*
│   │   ├── insights.js          ← /api/insights/*
│   │   └── crisis.js            ← /api/crisis/*
│   │
│   ├── middleware/
│   │   └── auth.js              ← JWT token verification
│   │
│   └── services/                ← External integrations
│       ├── aiService.js         ← ALL Claude AI calls live here
│       ├── emailService.js      ← Crisis notification emails
│       └── socketService.js     ← Socket.io event handling
│
└── client/                      ← React 18 + Vite frontend
    ├── index.html               ← HTML shell, loads fonts
    ├── vite.config.js           ← Vite bundler configuration
    ├── tailwind.config.js       ← Tailwind CSS configuration
    ├── package.json             ← Frontend dependencies
    ├── .env.example             ← API URL config
    │
    └── src/
        ├── main.jsx             ← React entry point
        ├── App.jsx              ← Router + Context providers
        ├── index.css            ← Global styles + Tailwind
        │
        ├── context/             ← Global state (React Context API)
        │   ├── AuthContext.jsx  ← User login state + auth functions
        │   └── SocketContext.jsx← Socket.io connection + crisis alerts
        │
        ├── pages/               ← Full-page route components
        │   ├── LoginPage.jsx    ← Email/password login form
        │   ├── RegisterPage.jsx ← Signup with goal selection
        │   ├── DashboardPage.jsx← Stats overview + mood charts
        │   ├── JournalPage.jsx  ← Write entry + see AI analysis
        │   ├── JournalDetailPage.jsx ← View single past entry
        │   ├── ChatPage.jsx     ← AI therapist conversation
        │   ├── MoodPage.jsx     ← Log mood + see heatmap
        │   ├── InsightsPage.jsx ← Weekly AI report
        │   └── ProfilePage.jsx  ← Settings, trusted contacts, goals
        │
        ├── components/          ← Reusable UI pieces
        │   ├── Layout/
        │   │   └── AppLayout.jsx← Sidebar + main content shell
        │   └── Crisis/
        │       └── CrisisModal.jsx ← Emergency resources popup
        │
        └── utils/
            └── api.js           ← Pre-configured Axios HTTP client
```

---

## 4. SERVER — Every File Explained

---

### `server/server.js` — The Entry Point

**What it is:** The first file Node.js runs. It boots the entire backend.

**What it does step by step:**
1. Loads `.env` file so `process.env.MONGO_URI` etc. are available
2. Creates an Express app
3. Wraps Express in a Node `http.Server` (needed for Socket.io)
4. Creates Socket.io on top of that http server
5. Connects to MongoDB
6. Applies security middleware (Helmet, CORS, Rate Limiting)
7. Applies parsing middleware (JSON body parser, cookie parser)
8. Mounts all route groups at their URL prefixes
9. Adds a global error handler at the very end
10. Starts listening on port 5000

**Key decision — why `http.createServer(app)`?**
Socket.io needs direct access to the Node HTTP server, not just Express. So we create the HTTP server manually and pass Express into it, then give Socket.io the same server. Both Express and Socket.io share port 5000.

**Middleware order matters:**
```
Security (Helmet) → CORS → Rate Limiter → JSON parser → Routes → Error handler
```
Security must come FIRST. Error handler must come LAST.

---

### `server/models/User.js` — User Schema

**What it is:** Defines what a "User" document looks like in MongoDB.

**Key fields:**
| Field | Purpose |
|-------|---------|
| `name, email, password` | Basic auth credentials |
| `mentalHealthGoals[]` | e.g. "reduce anxiety" — sent to Claude for personalization |
| `diagnoses[]` | Self-reported conditions — helps Claude tailor responses |
| `currentStreak, longestStreak` | Gamification — days journaled consecutively |
| `badges[]` | Earned milestones e.g. "7-Day Warrior 🔥" |
| `trustedContacts[]` | People to email if crisis detected (max 5) |
| `preferences` | Theme, reminder time, weekly insights toggle |

**Pre-save hook — password hashing:**
```js
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next(); // skip if not changed
  this.password = await bcrypt.hash(this.password, 12); // 12 = salt rounds
})
```
This runs BEFORE every `.save()`. The `if (!this.isModified)` check prevents re-hashing an already-hashed password when you update other fields.

**Why salt rounds 12?** Higher = slower to crack but slower to compute. 12 is the recommended production default — takes ~0.3 seconds per hash, which is unnoticeable to users but makes brute-force attacks take years.

**`updateStreak()` method:**
Called every time a user saves a journal entry. Checks if the last entry was yesterday (consecutive) or longer ago (streak resets). Awards badges at milestones 1, 7, 30, 100 days.

---

### `server/models/Journal.js` — Journal Entry Schema

**What it is:** Each document is one journal entry.

**Two-phase design:**
- **Phase 1** (immediate): `content`, `title`, `moodBefore`, `tags` — saved right away
- **Phase 2** (async): `aiAnalysis` — filled in after Claude processes the text

**The `aiAnalysis` sub-schema contains:**
```
primaryEmotion     → "sadness", "anxiety", "joy" etc.
secondaryEmotions  → ["loneliness", "frustration"]
sentimentScore     → -1.0 to +1.0 (negative = bad, positive = good)
stressLevel        → 1-10 integer
triggers           → ["work pressure", "conflict with partner"]
cognitiveDistortions → ["catastrophizing", "all-or-nothing thinking"]
copingSuggestions  → ["Try box breathing", "Call a friend"]
affirmation        → "You showed up today. That's enough."
summary            → 2-3 sentence AI summary
isCrisis           → true/false
crisisSeverity     → 0-5
analyzed           → false until Claude has processed it
```

**Pre-save hook — word count:**
Automatically counts words from `content` before saving. Used in the UI to show reading time.

**Index:**
```js
JournalSchema.index({ user: 1, createdAt: -1 });
```
This compound index makes the query "get all entries for user X sorted by newest" extremely fast even with millions of documents.

---

### `server/models/Mood.js` — Daily Mood Log Schema

**What it is:** A quick daily mood check-in, separate from journal entries.

**Key design — one entry per day:**
```js
MoodSchema.index({ user: 1, date: 1 }, { unique: true });
```
This unique compound index prevents logging mood twice in one day. When you POST a mood, it does an "upsert" — update if exists, create if not.

**Date normalization:**
```js
date: { default: () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0); // Strip time, keep only date
  return d;
}}
```
This ensures "today" is always midnight UTC, making date comparisons reliable.

**Context factors tracked:**
- Sleep hours (1-5 scale)
- Did they exercise?
- Social interaction level
- Weather (string)
- Medications taken?

These help Claude identify correlations (e.g., "Your mood is consistently lower on days with poor sleep").

---

### `server/models/Chat.js` — AI Conversation Schema

**What it is:** Each document is one conversation session with Sage (the AI).

**Why store messages in an array inside one document?**
Claude's API requires the FULL conversation history on every call to maintain context. If we stored each message as its own document, we'd need to query and sort them on every chat request. Storing them in one array means one MongoDB lookup → instant history retrieval.

**Auto-title:**
```js
if (this.title === "New Conversation" && this.messages.length > 0) {
  this.title = firstMessage.substring(0, 50) + "...";
}
```
The conversation's first user message becomes its title automatically.

---

### `server/models/Crisis.js` — Crisis Event Log

**What it is:** An audit trail of every time the AI detected potential crisis language.

**Why log this separately?**
1. The user can review their own crisis history in the "Profile" page
2. A linked therapist (future feature) could review it
3. It tracks whether emails were successfully sent to contacts

**Severity scale:**
- 1-2: Mild distress (venting, hopelessness in context)
- 3: Moderate concern (passive suicidal ideation)
- 4-5: Immediate danger (active plans, explicit self-harm)

---

### `server/services/aiService.js` — The AI Brain ⭐

**This is the most important file in the project.** All 4 Claude API integrations live here.

---

#### Function 1: `analyzeJournalEntry(content, userProfile)`

**What it does:** Reads a journal entry and returns structured JSON analysis.

**How it works:**
1. Builds a system prompt that tells Claude: be compassionate, respond ONLY in JSON, here's the user's profile
2. Sends the journal text as the user message
3. Claude returns a JSON string
4. We strip any accidental markdown (` ```json `) and parse it
5. Return the parsed object, or safe defaults if Claude fails

**The system prompt trick — JSON-only output:**
```
"CRITICAL: You MUST respond with ONLY valid JSON, no markdown, no extra text."
```
We use `JSON.parse()` on Claude's response. If Claude adds any text before/after the JSON, it breaks parsing. The system prompt forces JSON-only output.

**Fallback on failure:**
If Claude fails (network error, rate limit), we return a safe default object with `analyzed: false`. The user's entry is still saved — they just don't get AI insights for that entry. The UI shows a gentle message.

---

#### Function 2: `chat(messages, userProfile)`

**What it does:** Powers the Sage AI therapist chat.

**The persona system prompt:**
```
You are Sage, MindBridge's compassionate AI companion.
✓ Warm and human, never clinical
✓ Validate emotions FIRST before offering perspectives  
✓ Keep responses 2-4 paragraphs
⚠ If someone expresses suicidal thoughts: provide crisis resources
```

**The metadata trick:**
At the end of every response, Sage adds:
```
[METADATA]{"isCrisisResponse": false, "emotionDetected": "anxiety"}[/METADATA]
```
We extract this with regex, parse the JSON, then strip it from the visible response. This gives us structured data (did this response involve crisis?) without cluttering the chat UI.

**Full conversation history:**
We send ALL previous messages on every API call:
```js
messages: messages.map(m => ({ role: m.role, content: m.content }))
```
This is what makes Sage "remember" what you said earlier in the conversation.

---

#### Function 3: `detectCrisis(text)`

**What it does:** Fast safety screening before any content is stored.

**Two-layer approach (fast + accurate):**

Layer 1 — Keyword filter (instant, no API call):
```js
const crisisKeywords = ["kill myself", "want to die", "end my life", ...]
const hasKeyword = crisisKeywords.some(kw => text.toLowerCase().includes(kw))
if (!hasKeyword) return { isCrisis: false } // Skip API call
```

Layer 2 — Claude nuanced assessment (only if keyword found):
If a keyword IS found, Claude evaluates context. "I want to kill myself with this project deadline" is venting. "I want to kill myself and I know how" is a genuine crisis. Claude understands context; a keyword list doesn't.

**Why two layers?**
Keywords are instantaneous and free. Most messages won't contain crisis language. We only spend an API call when needed. This keeps the chat feel fast and costs low.

---

#### Function 4: `generateWeeklyInsight(entries, moods, userProfile)`

**What it does:** Builds a personalized weekly mental health report.

**What we send Claude:**
- Number of entries this week
- Average mood score
- Average stress level
- All emotions experienced
- Common triggers identified
- User's stated goals

Claude writes a compassionate Markdown report with:
1. Acknowledgment of what they went through
2. Patterns and growth highlights
3. 2-3 specific goals for next week
4. Motivating closing message

---

### `server/services/emailService.js` — Crisis Emails

**What it does:** Sends a beautiful HTML email to trusted contacts when crisis is detected.

**Key decisions:**
- Uses Gmail SMTP (free, everyone has it)
- "App Password" instead of real password (Google security requirement)
- HTML email with color-coded severity (red/amber/blue)
- Lists crisis hotlines (iCall for India, 988 for US)
- Clear message: "This is NOT an emergency system. Please reach out personally."

**Why not just call emergency services?**
MindBridge is not a clinical tool. Automatically contacting emergency services without consent could be harmful and illegal. The trusted contacts system is a personal safety net chosen by the user.

---

### `server/services/socketService.js` — Real-time Events

**What it does:** Manages WebSocket connections for real-time browser updates.

**Authentication:**
```js
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.id;
  next();
})
```
Socket connections require a valid JWT, same as HTTP requests. Unauthenticated sockets are rejected.

**User rooms:**
```js
socket.join(userId.toString())
```
Each user joins a room named by their MongoDB ID. When controllers call `io.to(userId).emit(...)`, only THAT user's browser receives the event. Other users never see each other's data.

**Events emitted:**
| Event | When | Payload |
|-------|------|---------|
| `crisis:detected` | Crisis found in journal/chat | `{ severity, source }` |
| `analysis:complete` | Claude finishes journal analysis | `{ entryId, analysis }` |
| `analysis:error` | Claude fails | `{ entryId, error }` |

---

### `server/middleware/auth.js` — JWT Verification

**What it does:** Protects routes by verifying the JWT token before any controller runs.

**Where does it look for the token?**
1. HTTP-only cookie named `token` (preferred — immune to XSS)
2. `Authorization: Bearer <token>` header (for API clients like mobile apps)

**HTTP-only cookies vs localStorage:**
- `localStorage`: JavaScript can read it → XSS attack can steal the token
- HTTP-only cookie: JavaScript CANNOT read it → XSS cannot steal the token

That's why we store JWT in cookies. The browser sends it automatically on every request, and it's invisible to any JavaScript (including malicious scripts).

**`sendTokenResponse()` helper:**
Creates the JWT, sets it as an HTTP-only cookie with proper settings, and returns user data. Used by both login and register endpoints.

---

### `server/controllers/journalController.js` — Journal Logic

**The most complex controller — here's the exact flow:**

```
POST /api/journal
  ↓
1. Validate input (min 10 chars)
  ↓
2. Save entry to MongoDB (returns immediately)
  ↓
3. Send HTTP 201 response to client (user sees "Entry saved!")
  ↓
4. [ASYNC - user already got response] Crisis detection runs
  ↓
   ├── No crisis: continue
   └── Crisis found:
       ├── Create Crisis document in MongoDB
       ├── Send emails to trusted contacts
       └── Emit "crisis:detected" via Socket.io
  ↓
5. [ASYNC] Full AI analysis runs (slower)
  ↓
6. Update journal document with analysis results
  ↓
7. Emit "analysis:complete" via Socket.io → browser updates UI
```

**Why respond before the AI finishes?**
AI analysis takes 2-5 seconds. If we waited for it before sending the HTTP response, the user would see a spinner for 5 seconds. By sending the response immediately after saving, the user sees "Entry saved!" instantly. The AI results appear a few seconds later via Socket.io. This is a much better UX pattern.

**Why `req.app.get("io")`?**
In `server.js`, we stored the Socket.io instance with `app.set("io", io)`. Any controller can retrieve it with `req.app.get("io")`. This avoids circular dependency issues.

---

### `server/controllers/chatController.js` — Chat Logic

**Key feature — parallel AI + crisis detection:**
```js
const [crisisResult, aiResult] = await Promise.all([
  detectCrisis(message),
  chat(conversation.messages, userProfile),
]);
```

`Promise.all()` runs both Claude calls simultaneously instead of one after the other. This cuts the response time nearly in half.

**Conversation context management:**
Every message is appended to the conversation's `messages` array before calling the AI. This array (with ALL previous messages) is sent to Claude on each call, giving it full conversation memory.

---

### `server/controllers/moodController.js` — Mood & Analytics

**The analytics endpoint returns:**
```js
{
  moodTrend: [...],      // Array of {date, score} for line chart
  avgMood: 6.4,          // Average over selected period
  avgStress: 4.2,
  emotionBreakdown: [...], // [{emotion, count}] for pie chart
  topTriggers: [...],    // [{trigger, count}] from journal analysis
  heatmapData: {},       // {date: score} for calendar heatmap
  totalMoodLogs: 12,
  totalJournalEntries: 8
}
```

This single endpoint powers ALL the dashboard charts with one database query per data source.

---

## 5. CLIENT — Every File Explained

---

### `src/main.jsx` — React Entry Point

The very first React file. It:
1. Imports React and ReactDOM
2. Wraps the entire app in `<BrowserRouter>` (enables React Router)
3. Renders `<App />` into the `#root` div in `index.html`

---

### `src/App.jsx` — Router + Providers

**What it does:** Sets up global state and defines all URL routes.

**Provider nesting order:**
```jsx
<AuthProvider>           ← User login state (outermost)
  <SocketProvider>       ← WebSocket connection (needs auth)
    <Routes>             ← URL routing (needs both)
```
Order matters! `SocketProvider` uses `useAuth()`, so it must be INSIDE `AuthProvider`. Routes use both, so they go inside both.

**Protected Route wrapper:**
```jsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/auth/login" />;
};
```
On every page load, React checks if there's a valid session (`loading=true`). While checking, shows a spinner. If logged in → show page. If not → redirect to login.

**Route structure:**
- `/auth/login` and `/auth/register` — Public, no sidebar
- `/dashboard`, `/journal`, etc. — Protected, wrapped in `<AppLayout>` which renders the sidebar

---

### `src/context/AuthContext.jsx` — Authentication State

**What it does:** Makes `user` and auth functions available everywhere via React Context.

**On app load (`useEffect`):**
```js
const { data } = await api.get("/auth/me");
setUser(data.user);
```
Calls the server to check if the JWT cookie is still valid. If yes, user is logged in without needing to log in again. If no, `user` stays `null` and they see the login page.

**Why Context instead of props?**
Without Context, you'd have to pass `user` as a prop through every component: `App → Layout → Sidebar → NavItem → ...`. Context lets ANY component call `useAuth()` to get the user directly.

---

### `src/context/SocketContext.jsx` — Real-time Connection

**What it does:** Manages the Socket.io WebSocket connection.

**Auto-connect on login, disconnect on logout:**
```js
useEffect(() => {
  if (!user) {
    socket?.disconnect();
    return;
  }
  const s = io(SOCKET_URL, { auth: { token } });
  // ... setup listeners
  setSocket(s);
  return () => s.disconnect(); // cleanup
}, [user]);
```

**Crisis alert state:**
When the server emits `crisis:detected`, `crisisAlert` is set in state. The App component renders `<CrisisModal>` whenever `crisisAlert` is not null. Dismissing the modal clears `crisisAlert`.

---

### `src/utils/api.js` — Axios Instance

**What it does:** A pre-configured Axios instance so every API call:
1. Uses the correct base URL (`/api`)
2. Includes cookies (`withCredentials: true`)
3. Sets JSON content type

**Response interceptor:**
```js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/auth/login"; // Auto-redirect on auth failure
    }
    return Promise.reject(error);
  }
);
```
If ANY request gets a 401 (unauthorized), automatically redirect to login. Users never see a broken state.

---

### `src/components/Layout/AppLayout.jsx` — App Shell

**What it does:** The permanent frame around all protected pages.

**Structure:**
```
┌─────────────┬──────────────────────────────────┐
│             │                                  │
│   Sidebar   │     <Outlet />                   │
│   (fixed,   │   (current page renders here)    │
│   64 wide)  │                                  │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

`<Outlet />` is a React Router concept — it renders whatever the current nested route's component is. So `AppLayout` stays the same, only the main content area changes as you navigate.

**Active link highlighting:**
```jsx
<NavLink className={({ isActive }) =>
  isActive ? "bg-brand-500/20 text-brand-400" : "text-slate-400"
}>
```
React Router's `<NavLink>` passes `isActive` to the className function automatically.

---

### `src/pages/DashboardPage.jsx` — Analytics Dashboard

**What it renders:**
1. Personalized greeting ("Good evening, Ravi 👋")
2. 4 stat cards (streak, avg mood, entries this month, badges)
3. Mood trend line chart (Recharts `<LineChart>`)
4. Emotion breakdown pie chart (Recharts `<PieChart>`)
5. Quick action cards (Journal, Chat, Insights)
6. 5 most recent journal entries
7. Badge collection

**Data fetching:**
```js
const [analyticsRes, entriesRes] = await Promise.all([
  api.get("/mood/analytics?days=30"),
  api.get("/journal?limit=5"),
]);
```
Both API calls run simultaneously. Dashboard loads in one round trip.

**Chart library — Recharts:**
Recharts is a React-native charting library built on SVG. It works with React state natively (no refs, no imperative APIs). Every chart is just a JSX component with data as a prop.

---

### `src/pages/JournalPage.jsx` — Journal Editor

**Two-panel layout:**
- Left 3/5: Editor form (title, content textarea, mood slider, tags)
- Right 2/5: AI analysis results panel

**Daily prompt system:**
```js
const DAILY_PROMPTS = ["What's been weighing on your mind?", ...]
const [prompt] = useState(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
```
A random prompt is selected on mount and never changes. Helps users who don't know what to write.

**Real-time analysis update via Socket.io:**
```js
socket.on("analysis:complete", ({ entryId, analysis }) => {
  if (entryId === savedEntryId) {   // Only update if it's OUR entry
    setAnalysis(result);
    setAnalyzing(false);
  }
});
```
When the server finishes AI analysis, it emits this event. The browser receives it and updates the right panel — no page refresh needed.

**Mood slider:**
```jsx
<input type="range" min="1" max="10" value={moodBefore}
  onChange={(e) => setMoodBefore(parseInt(e.target.value))} />
```
A standard HTML range input styled with Tailwind. The value is sent with the journal entry so the AI knows the user's mood at the time of writing.

---

### `src/pages/ChatPage.jsx` — AI Chat Interface

**Two-panel layout:**
- Left: Conversation list (past sessions)
- Right: Active conversation

**Optimistic UI:**
```js
setMessages(prev => [...prev, userMessage]); // Show message immediately
const { data } = await api.post("/chat", ...); // Then send to server
```
The user's message appears instantly in the UI without waiting for the server response. If the server fails, we remove it and restore the input.

**Conversation loading:**
Clicking a past conversation calls `GET /api/chat/:id` which returns ALL messages. These replace the current messages array, showing the full conversation history.

**Typing indicator:**
```jsx
{sending && (
  <div className="flex gap-1">
    <span className="typing-dot" />
    <span className="typing-dot" />
    <span className="typing-dot" />
  </div>
)}
```
Three dots animate while waiting for AI response, simulating the "typing..." indicator seen in iMessage, WhatsApp etc.

---

### `src/components/Crisis/CrisisModal.jsx` — Emergency Resources

**What triggers it:**
Socket.io emits `crisis:detected` → `SocketContext` sets `crisisAlert` → `App.jsx` renders `<CrisisModal>`

**What it shows:**
1. Calming, non-alarming message ("We noticed you might be going through something difficult")
2. Severity-appropriate color (amber for moderate, red for high)
3. List of crisis helplines (iCall, Vandrevala, 988)
4. "I'm safe right now" button to dismiss
5. "Talk to Sage" button to go to chat

**Design principle:** Never alarm or shame the user. The modal is warm and supportive, not clinical or scary.

---

## 6. AI Integration Deep Dive

### How We Use the Anthropic SDK

```js
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  system: "...",  // Persona + instructions
  messages: [...] // Conversation history
});

const text = response.content[0].text;
```

### The 4 System Prompts — What Makes Each Different

| Use Case | Tone | Output Format | Key Instruction |
|----------|------|---------------|-----------------|
| Journal Analysis | Clinical-but-warm | JSON only | No preamble, strict schema |
| Chat (Sage) | Warm friend | Natural text + metadata tag | 2-4 paragraphs max |
| Crisis Detection | Analytical | JSON only | Assess context, not just keywords |
| Weekly Insight | Coach/mentor | Markdown | Under 400 words, actionable goals |

### Why `claude-sonnet-4-20250514` (Sonnet, not Opus)?

Sonnet is the best balance of:
- **Speed**: Faster than Opus (important for chat UX)
- **Cost**: Cheaper than Opus (mental health app should be affordable)
- **Quality**: Still excellent at empathy, analysis, and safety awareness

For crisis detection (the most critical function), the keyword pre-filter means Claude is rarely called, so speed is less critical there.

---

## 7. Data Flow Diagrams

### Journal Entry Flow
```
Browser                    Express Server                 External
  │                            │                            │
  │──POST /api/journal─────────►│                            │
  │                            │──save to MongoDB            │
  │◄──201 Entry saved!─────────│                            │
  │                            │                            │
  │    [ASYNC]                 │──detectCrisis()────────────►Claude API
  │                            │◄──{isCrisis: false}────────│
  │                            │                            │
  │    [ASYNC]                 │──analyzeJournalEntry()─────►Claude API
  │                            │◄──{emotion, triggers...}───│
  │                            │──update MongoDB             │
  │◄══analysis:complete (WS)═══│                            │
  │  (UI updates live)         │                            │
```

### Crisis Flow
```
Browser                    Server                    Trusted Contacts
  │                          │                            │
  │──POST /api/journal──────►│                            │
  │◄──201 Entry saved!───────│                            │
  │                          │──detectCrisis()→ CRISIS    │
  │                          │──create Crisis log          │
  │                          │──sendCrisisEmail()─────────►Gmail SMTP
  │                          │                            │──Email sent─►Contact
  │◄══crisis:detected (WS)═══│                            │
  │  (Modal appears)         │                            │
```

---

## 8. Setup Guide Step by Step

### Step 1: Get Your API Keys

**MongoDB Atlas (Free):**
1. Go to mongodb.com/atlas → Create free account
2. Create a cluster (free M0 tier)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like `mongodb+srv://...`)

**Anthropic Claude API:**
1. Go to console.anthropic.com → Sign up
2. Go to "API Keys" → Create a key
3. Copy it (starts with `sk-ant-api03-...`)

**Gmail App Password (for crisis emails):**
1. Go to Google Account → Security → 2-Step Verification (must be ON)
2. Then: Security → App passwords
3. Select "Mail" and "Windows Computer" → Generate
4. Copy the 16-character password

### Step 2: Install Everything

```bash
# Clone or unzip the project
cd mindbridge

# Install server dependencies
cd server
npm install
cp .env.example .env
# Edit .env with your keys

# Install client dependencies
cd ../client
npm install
cp .env.example .env
# Edit .env (default values usually work)
```

### Step 3: Fill in `.env` Values

```bash
# server/.env
MONGO_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/mindbridge
JWT_SECRET=make_this_32_chars_minimum_random_string_here
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your16charapppassword
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Step 4: Run the App

```bash
# Terminal 1: Start backend
cd server
npm run dev
# Should see: ✅ MongoDB connected, 🚀 Server running on port 5000

# Terminal 2: Start frontend
cd client
npm run dev
# Should see: Local: http://localhost:5173
```

Open `http://localhost:5173` → Register → Start journaling!

---

## 9. API Reference

All endpoints are prefixed with `/api`. Protected routes require a valid JWT cookie.

### Auth
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/auth/register` | ❌ | `{name, email, password, mentalHealthGoals[]}` | `{user, token}` |
| POST | `/auth/login` | ❌ | `{email, password}` | `{user, token}` |
| POST | `/auth/logout` | ✅ | — | `{success}` |
| GET | `/auth/me` | ✅ | — | `{user}` |
| PUT | `/auth/profile` | ✅ | any user fields | `{user}` |

### Journal
| Method | Path | Auth | Body/Query | Returns |
|--------|------|------|------------|---------|
| POST | `/journal` | ✅ | `{title, content, moodBefore, tags[]}` | `{entry}` + triggers async AI |
| GET | `/journal` | ✅ | `?page&limit&emotion&tag&startDate&endDate` | `{entries[], total, pages}` |
| GET | `/journal/:id` | ✅ | — | `{entry}` with full content |
| DELETE | `/journal/:id` | ✅ | — | `{success}` |
| PATCH | `/journal/:id/mood-after` | ✅ | `{moodAfter}` | `{entry}` |

### Mood
| Method | Path | Auth | Body/Query | Returns |
|--------|------|------|------------|---------|
| POST | `/mood` | ✅ | `{score, emotions[], factors, note}` | `{mood}` |
| GET | `/mood` | ✅ | `?days=90` | `{moods[]}` |
| GET | `/mood/analytics` | ✅ | `?days=30` | `{analytics}` with chart data |

### Chat
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/chat` | ✅ | `{message, conversationId?}` | `{reply, conversationId, crisisDetected}` |
| GET | `/chat/history` | ✅ | — | `{conversations[]}` (no messages) |
| GET | `/chat/:id` | ✅ | — | `{conversation}` with all messages |
| DELETE | `/chat/:id` | ✅ | — | `{success}` |

### Insights
| Method | Path | Auth | Returns |
|--------|------|------|---------|
| GET | `/insights/weekly` | ✅ | `{report}` (Markdown string) |

### Crisis
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| GET | `/crisis/log` | ✅ | — | `{events[]}` |
| POST | `/crisis/contacts` | ✅ | `{name, email, relationship}` | `{trustedContacts[]}` |
| DELETE | `/crisis/contacts/:id` | ✅ | — | `{trustedContacts[]}` |
| PATCH | `/crisis/:id/acknowledge` | ✅ | — | `{event}` |

---

## 10. Security Decisions Explained

### JWT in HTTP-only Cookies
**Problem:** Storing JWT in `localStorage` means any JavaScript can read it → XSS attacks steal tokens.
**Solution:** HTTP-only cookies are invisible to JavaScript. Even if your site has an XSS vulnerability, the attacker's script cannot read the token.

### bcrypt with Salt Rounds 12
**Problem:** If the database is breached, password hashes could be cracked with a rainbow table attack.
**Solution:** bcrypt adds a random "salt" to each password before hashing. Same password → different hash every time. Rainbow tables are useless. Salt rounds 12 makes each hash take ~300ms — imperceptible to users but devastating to brute-force attackers.

### MongoDB Sanitization
```js
app.use(mongoSanitize());
```
**Problem:** A user could send `{ "email": {"$gt": ""} }` as their "password" to bypass MongoDB queries.
**Solution:** `express-mongo-sanitize` strips `$` and `.` from request bodies, preventing NoSQL injection.

### Rate Limiting
```js
// Global: 100 requests per 15 minutes
// AI endpoints: 10 requests per minute
```
**Problem:** Without limits, anyone could spam your API and either crash the server or rack up huge Claude API bills.
**Solution:** Rate limiting returns `429 Too Many Requests` after the limit is hit.

### Helmet.js
```js
app.use(helmet());
```
Sets 15+ security-related HTTP headers automatically:
- `X-Content-Type-Options: nosniff` → Prevents MIME-type sniffing
- `X-Frame-Options: DENY` → Prevents clickjacking
- `Strict-Transport-Security` → Forces HTTPS
- `Content-Security-Policy` → Restricts what can load on your page

### CORS Whitelist
```js
cors({ origin: process.env.CLIENT_URL })
```
Only the frontend URL is allowed to make cross-origin requests to the API. This prevents other websites from making requests using your users' cookies.

---

## 🏁 You're Ready!

You now understand every file, every decision, and every data flow in MindBridge. 

**Key things to remember when presenting this project:**
1. The two-phase journal save (immediate save → async AI) is a real-world production pattern
2. Crisis detection uses two-layer screening (keywords + AI) for speed + accuracy
3. Socket.io enables true real-time updates without polling
4. HTTP-only JWT cookies are the industry-standard secure auth pattern
5. All 4 Claude integrations serve different purposes with different prompts

**Questions interviewers might ask:**
- "Why Socket.io instead of polling?" → Real-time, efficient, no wasted requests
- "Why store chat messages in one document?" → Claude needs full history, one query = faster
- "How do you prevent NoSQL injection?" → mongo-sanitize middleware
- "What if Claude's API is down?" → Graceful fallbacks, entries still save

Good luck! 🌟
