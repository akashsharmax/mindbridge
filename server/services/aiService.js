/**
 * services/aiService.js — MindBridge AI Service (Fixed for India/Regional API)
 *
 * ROOT CAUSE OF YOUR ERROR:
 * The @google/generative-ai SDK uses "v1beta" endpoint by default.
 * In India and some other regions, only the "v1" endpoint works.
 * This file uses direct fetch() calls to the v1 endpoint instead of the SDK.
 *
 * Model used: gemini-2.0-flash  (works on v1 endpoint, free tier)
 * API endpoint: https://generativelanguage.googleapis.com/v1/models/...
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

console.log("🤖 AI Provider: Google Gemini 2.0 Flash (v1 endpoint)");

// ─── Core fetch helper ─────────────────────────────────────────────────────────
const callGemini = async (prompt, maxTokens = 1000) => {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

// ─── Multi-turn chat helper ────────────────────────────────────────────────────
const callGeminiChat = async (systemPrompt, messages, maxTokens = 800) => {
  // Build Gemini-format conversation history
  const contents = [];

  // Add system prompt as first user message (Gemini v1 doesn't have system role)
  contents.push({
    role: "user",
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: "model",
    parts: [{ text: "Understood. I am Sage, your compassionate AI wellness companion. I am ready to listen and support you." }],
  });

  // Add conversation history
  for (const msg of messages) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Chat API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

// ─── 1. JOURNAL ENTRY ANALYSIS ────────────────────────────────────────────────
const analyzeJournalEntry = async (content, userProfile = {}) => {
  const prompt = `You are MindBridge's compassionate AI analyzer. Read this personal journal entry and provide supportive, insightful analysis.

User context:
- Name: ${userProfile.name || "Friend"}
- Goals: ${userProfile.mentalHealthGoals?.join(", ") || "general wellbeing"}
- Conditions: ${userProfile.diagnoses?.join(", ") || "none specified"}

CRITICAL INSTRUCTION: You must respond with ONLY a valid JSON object. 
No markdown, no backticks, no explanation — just the raw JSON object starting with { and ending with }.

Required JSON format:
{
  "primaryEmotion": "one of: joy, sadness, anger, fear, anxiety, disgust, surprise, love, shame, hope, grief, overwhelm, numbness",
  "secondaryEmotions": ["emotion1", "emotion2"],
  "sentimentScore": 0.0,
  "stressLevel": 5,
  "triggers": ["trigger1", "trigger2"],
  "cognitiveDistortions": ["distortion1"],
  "copingSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "affirmation": "one warm personalized affirmation",
  "summary": "2-3 sentence compassionate summary of the entry",
  "isCrisis": false,
  "crisisSeverity": 0
}

Journal entry to analyze:
"${content}"`;

  try {
    const rawText = await callGemini(prompt, 1000);
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    // Extract JSON object if there's surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const analysis = JSON.parse(jsonMatch[0]);
    analysis.analyzed = true;
    return analysis;
  } catch (err) {
    console.error("❌ Journal analysis error:", err.message);
    return {
      primaryEmotion: "unknown",
      secondaryEmotions: [],
      sentimentScore: 0,
      stressLevel: 5,
      triggers: [],
      cognitiveDistortions: [],
      copingSuggestions: [
        "Try a 5-minute deep breathing exercise",
        "Reach out to someone you trust today",
        "Write down three things you are grateful for",
      ],
      affirmation: "You showed up and wrote today. That takes courage.",
      summary: "Your entry has been saved. AI analysis encountered an issue but your words are safe.",
      isCrisis: false,
      crisisSeverity: 0,
      analyzed: false,
    };
  }
};

// ─── 2. EMPATHETIC AI CHAT ────────────────────────────────────────────────────
const chat = async (messages, userProfile = {}) => {
  const systemPrompt = `You are Sage, a compassionate AI wellness companion on the MindBridge app. You are like a warm, wise friend with deep knowledge of psychology and mental wellness.

About the person you are talking to:
- Name: ${userProfile.name || "Friend"}
- Mental health goals: ${userProfile.mentalHealthGoals?.join(", ") || "general wellbeing"}

Your personality and rules:
- Always warm, human, and empathetic — never clinical or robotic
- Validate the person's feelings FIRST before offering any advice
- Ask one thoughtful follow-up question per response
- Keep responses to 2-3 paragraphs maximum
- Gently suggest professional help when topics are serious
- If someone mentions suicide, self-harm, or immediate danger: express care AND share crisis resources (iCall India: 9152987821, International: 988)
- You are an AI companion, NOT a licensed therapist — clarify this if asked directly

At the very end of your response, on a new line, add this metadata tag with accurate values:
[METADATA]{"isCrisisResponse": false, "emotionDetected": "neutral", "suggestedResources": []}[/METADATA]`;

  try {
    const fullText = await callGeminiChat(systemPrompt, messages, 800);

    // Extract metadata
    let metadata = { isCrisisResponse: false, emotionDetected: "", suggestedResources: [] };
    const metaMatch = fullText.match(/\[METADATA\](.*?)\[\/METADATA\]/s);
    if (metaMatch) {
      try { metadata = JSON.parse(metaMatch[1]); } catch {}
    }

    const reply = fullText.replace(/\[METADATA\].*?\[\/METADATA\]/s, "").trim();
    return { reply, metadata };
  } catch (err) {
    console.error("❌ Chat AI error:", err.message);
    return {
      reply: "I am having a moment of difficulty. If you are in distress, please reach out to iCall at 9152987821 or a trusted person in your life. I will be back shortly.",
      metadata: { isCrisisResponse: true, emotionDetected: "unknown", suggestedResources: ["iCall: 9152987821"] },
    };
  }
};

// ─── 3. CRISIS DETECTION ──────────────────────────────────────────────────────
const detectCrisis = async (text) => {
  const crisisKeywords = [
    "kill myself", "want to die", "end my life", "suicide", "self harm",
    "hurt myself", "no point living", "better off dead", "overdose",
    "cutting myself", "cant go on", "give up on life",
  ];

  const lowerText = text.toLowerCase();
  const hasKeyword = crisisKeywords.some((kw) => lowerText.includes(kw));

  // Skip API call if no keywords found — saves quota
  if (!hasKeyword) {
    return { isCrisis: false, severity: 0, reason: "", triggerPhrase: "" };
  }

  try {
    const prompt = `You are a mental health safety screener. Assess if this text indicates genuine crisis risk.
Consider context carefully — frustration like "I want to kill my boss" is NOT a crisis. Active suicidal ideation IS a crisis.

Respond with ONLY a JSON object, no other text:
{"isCrisis": boolean, "severity": 0-5, "reason": "brief explanation", "triggerPhrase": "the concerning phrase"}

Text to assess: "${text.substring(0, 400)}"`;

    const rawText = await callGemini(prompt, 200);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in crisis response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      isCrisis: true,
      severity: 3,
      reason: "Keyword detected, AI assessment unavailable",
      triggerPhrase: crisisKeywords.find((kw) => lowerText.includes(kw)) || "",
    };
  }
};

// ─── 4. WEEKLY INSIGHT GENERATION ────────────────────────────────────────────
const generateWeeklyInsight = async (entries, moods, userProfile = {}) => {
  const entryCount = entries.length;
  const avgMood = moods.length > 0
    ? (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1)
    : "not tracked";
  const allEmotions = entries
    .flatMap((e) => [e.aiAnalysis?.primaryEmotion, ...(e.aiAnalysis?.secondaryEmotions || [])])
    .filter(Boolean);
  const allTriggers = entries.flatMap((e) => e.aiAnalysis?.triggers || []).filter(Boolean);
  const avgStress = entries.length > 0
    ? (entries.reduce((s, e) => s + (e.aiAnalysis?.stressLevel || 5), 0) / entries.length).toFixed(1)
    : "unknown";

  const prompt = `Write a warm, personalized weekly mental wellness report for ${userProfile.name || "this person"}.

Their week:
- Journal entries written: ${entryCount}
- Average mood: ${avgMood}/10
- Average stress: ${avgStress}/10  
- Emotions felt: ${[...new Set(allEmotions)].join(", ") || "varied"}
- Common triggers: ${[...new Set(allTriggers)].slice(0, 5).join(", ") || "none detected"}
- Their goals: ${userProfile.mentalHealthGoals?.join(", ") || "general wellbeing"}

Write a compassionate Markdown report (under 400 words) that:
1. Acknowledges what they went through this week with empathy
2. Highlights any positive patterns or growth moments
3. Suggests 2-3 specific, actionable goals for next week
4. Ends with a short motivating message

Tone: warm friend, not a clinical report. No bullet points for the opening — use flowing paragraphs.`;

  try {
    return await callGemini(prompt, 600);
  } catch (err) {
    console.error("❌ Weekly insight error:", err.message);
    return `# Your Week in Review\n\nWe could not generate your personalized report this week, but the fact that you are here and tracking your wellness is something to be proud of.\n\n**Keep going. Small steps still move you forward.** 🌱`;
  }
};

module.exports = { analyzeJournalEntry, chat, detectCrisis, generateWeeklyInsight };