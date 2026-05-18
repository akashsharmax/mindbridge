# 🧠 MindBridge — AI-Powered Mental Health Companion

> **A full-stack MERN application with deep Claude AI integration that helps people understand, track, and improve their mental wellbeing through intelligent journaling, mood analytics, and empathetic AI conversations.**

---

## 🌟 Why MindBridge?

Mental health affects **1 in 4 people globally**, yet most apps are either clinical and cold, or shallow and ineffective. MindBridge bridges that gap — it's like having a thoughtful, always-available friend who:

- **Listens** to your journal entries and detects emotional patterns using AI
- **Tracks** your moods with beautiful visualizations over time
- **Responds** empathetically via an AI chat therapist (Claude-powered)
- **Alerts** trusted contacts when it detects crisis language (safety net)
- **Learns** your emotional triggers and gives personalized weekly insights

---

## 🏗️ Architecture Overview

```
mindbridge/
├── client/                     # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Auth/           # Login, Register, OAuth
│   │   │   ├── Chat/           # AI Chat interface
│   │   │   ├── Crisis/         # Crisis detection UI
│   │   │   ├── Dashboard/      # Main analytics dashboard
│   │   │   ├── Journal/        # Journal editor + history
│   │   │   ├── Layout/         # Navbar, Sidebar, Footer
│   │   │   └── Mood/           # Mood tracker + charts
│   │   ├── context/            # React Context (Auth, Theme, Socket)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Route-level page components
│   │   └── utils/              # API calls, helpers, constants
│   └── package.json
│
├── server/                     # Node.js + Express backend
│   ├── config/                 # DB, Cloudinary, AI config
│   ├── controllers/            # Business logic handlers
│   ├── middleware/             # Auth, error handling, rate limiting
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route definitions
│   ├── services/               # AI service, Email, Socket.io
│   └── package.json
│
└── docs/                       # API docs, architecture diagrams
```

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| State | React Context + useReducer |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Auth | JWT + bcrypt + HTTP-only cookies |
| Real-time | Socket.io (crisis alerts) |
| Email | Nodemailer (crisis notifications) |
| File Upload | Multer + Cloudinary |
| Validation | Joi (server) + React Hook Form (client) |

---

## ✨ Key Features

### 1. 🤖 AI-Powered Journal Analysis
Every journal entry is analyzed by Claude AI to extract:
- Primary emotion + secondary emotions
- Cognitive distortions detected
- Stress triggers identified
- Personalized coping suggestions
- Severity score (1–10)

### 2. 💬 Empathetic AI Chat Therapist
- Maintains conversation context (memory)
- Responds in a warm, non-clinical tone
- Suggests professional help when needed
- Crisis language detection triggers alert system

### 3. 📊 Mood Analytics Dashboard
- Daily/weekly/monthly mood heatmaps
- Emotion trend line charts
- Trigger word cloud
- Streak tracking & milestone badges

### 4. 🆘 Crisis Detection & Safety Net
- Real-time crisis phrase detection via Socket.io
- Automated email to trusted contacts
- In-app crisis resources modal
- Logs all crisis events for review

### 5. 🗓️ Weekly AI Insight Reports
- Claude generates personalized weekly summaries
- Pattern recognition across entries
- Actionable mental health goals

---

## 🔧 Environment Variables

### Server (`server/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mindbridge
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
ANTHROPIC_API_KEY=sk-ant-your-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🏁 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Anthropic API key
- Gmail account (for crisis emails)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/mindbridge.git
cd mindbridge

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install

# 4. Add environment variables
# Copy .env.example files and fill in your values
cp server/.env.example server/.env
cp client/.env.example client/.env

# 5. Start development servers (from root)
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open `http://localhost:5173` 🎉

---

## 📡 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | ❌ |
| POST | `/api/auth/login` | Login + get JWT | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| POST | `/api/journal` | Create journal entry | ✅ |
| GET | `/api/journal` | Get all entries | ✅ |
| GET | `/api/journal/:id` | Get single entry | ✅ |
| DELETE | `/api/journal/:id` | Delete entry | ✅ |
| POST | `/api/mood` | Log mood | ✅ |
| GET | `/api/mood` | Get mood history | ✅ |
| GET | `/api/mood/analytics` | Get mood analytics | ✅ |
| POST | `/api/chat` | Send message to AI | ✅ |
| GET | `/api/chat/history` | Get chat history | ✅ |
| GET | `/api/insights/weekly` | Get weekly AI report | ✅ |
| POST | `/api/crisis/contacts` | Add trusted contact | ✅ |
| GET | `/api/crisis/log` | Get crisis event log | ✅ |

---

## 🧠 AI Integration Deep Dive

MindBridge uses Claude in **4 distinct ways**:

### 1. Journal Sentiment Analysis (`/services/aiService.js`)
```js
analyzeJournalEntry(text) 
// → Returns: { emotion, triggers, distortions, suggestions, score }
```

### 2. Conversational Therapy (`/services/aiService.js`)
```js
chat(messages, userProfile)
// → Returns: empathetic response with safety checks
```

### 3. Crisis Detection (`/services/aiService.js`)
```js
detectCrisis(text)
// → Returns: { isCrisis: bool, severity: 1-5, reason: string }
```

### 4. Weekly Insights (`/services/aiService.js`)
```js
generateWeeklyInsight(entries, moods, userProfile)
// → Returns: markdown-formatted personal report
```

---

## 🔐 Security Features

- **JWT in HTTP-only cookies** — prevents XSS token theft
- **Rate limiting** — 100 req/15min globally, 5 req/min for AI endpoints
- **Input sanitization** — mongo-sanitize prevents NoSQL injection
- **Helmet.js** — sets secure HTTP headers
- **CORS** — whitelist only the frontend URL
- **bcrypt** — password hashing with salt rounds 12

---

## 🗺️ Roadmap

- [ ] Voice journaling (Whisper API)
- [ ] Mobile app (React Native)
- [ ] Therapist dashboard (professional tier)
- [ ] Group support rooms (Socket.io rooms)
- [ ] Calendar integration (trigger pattern tracking)
- [ ] Export data as PDF report

---

## 🤝 Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` first.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see `LICENSE` for details.

---

## ⚠️ Disclaimer

MindBridge is **not a substitute for professional mental health care**. If you are in crisis, please contact:
- **iCall (India):** 9152987821
- **Vandrevala Foundation:** 1860-2662-345
- **International Association for Suicide Prevention:** https://www.iasp.info/resources/Crisis_Centres/

---

*Built with ❤️ to make mental wellness accessible to everyone.*
