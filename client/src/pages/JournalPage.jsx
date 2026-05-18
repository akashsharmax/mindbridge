/**
 * pages/JournalPage.jsx — Journal Editor + Entry List
 *
 * Two-panel layout:
 * Left: New entry form with mood slider, tags
 * Right: Analysis result panel (populated when AI finishes)
 *
 * Real-time: Listens for "analysis:complete" via Socket.io
 * to update the UI without polling.
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Send, Tag, Smile, Sparkles, X, ChevronDown } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

const DAILY_PROMPTS = [
  "What's been weighing on your mind today?",
  "Describe a moment that made you feel grateful recently.",
  "What emotion has been showing up most for you this week?",
  "What would you tell a friend going through what you're experiencing?",
  "What's something you're proud of, no matter how small?",
  "What do you need more of right now?",
  "If your feelings had a color and texture, what would they be?",
];

const MOOD_LABELS = ["", "Terrible", "Very Bad", "Bad", "Rough", "Okay", "Fine", "Good", "Great", "Excellent", "Amazing"];

export default function JournalPage() {
  const { socket } = useSocket();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [moodBefore, setMoodBefore] = useState(5);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [prompt] = useState(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
  const textareaRef = useRef(null);

  // Fetch existing entries
  useEffect(() => {
    api.get("/journal?limit=10").then((r) => setEntries(r.data.entries)).catch(() => {});
  }, []);

  // Listen for AI analysis completion via Socket.io
  useEffect(() => {
    if (!socket) return;
    socket.on("analysis:complete", ({ entryId, analysis: result }) => {
      if (entryId === savedEntryId) {
        setAnalysis(result);
        setAnalyzing(false);
        toast.success("AI analysis complete! ✨");
      }
    });
    socket.on("analysis:error", ({ entryId }) => {
      if (entryId === savedEntryId) {
        setAnalyzing(false);
        toast.error("Analysis unavailable, but your entry is saved.");
      }
    });
    return () => {
      socket.off("analysis:complete");
      socket.off("analysis:error");
    };
  }, [socket, savedEntryId]);

  const addTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim()) && tags.length < 5) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/journal", { title, content, moodBefore, tags });
      setSavedEntryId(data.entry._id);
      setAnalyzing(true);
      toast.success("Entry saved! Analyzing...");
      setEntries((prev) => [data.entry, ...prev]);
      // Reset form but keep analysis panel open
      setContent("");
      setTitle("");
      setTags([]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Your Journal</h1>
        <p className="text-slate-400 mt-1">Write freely. AI will analyze and support.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Editor Panel ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="card space-y-4">
            {/* Daily prompt */}
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
              <p className="text-xs text-brand-400 font-medium mb-1">💭 Today's Prompt</p>
              <p className="text-slate-300 text-sm italic">"{prompt}"</p>
            </div>

            {/* Title */}
            <input
              type="text"
              className="input-field text-lg font-display"
              placeholder="Give this entry a title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Main textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="input-field resize-none text-base leading-relaxed"
                rows={10}
                placeholder="Write whatever's on your mind. This is your safe space..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 text-slate-600 text-xs">
                {wordCount} words
              </div>
            </div>

            {/* Mood Slider */}
            <div>
              <label className="section-label block mb-2">
                How are you feeling right now? — <span className="text-brand-400">{MOOD_LABELS[moodBefore]}</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-2xl">😔</span>
                <input
                  type="range" min="1" max="10" value={moodBefore}
                  onChange={(e) => setMoodBefore(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-surface-600 rounded-full appearance-none cursor-pointer accent-brand-500"
                />
                <span className="text-2xl">😄</span>
                <span className="text-brand-400 font-bold font-mono w-6">{moodBefore}</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="section-label block mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    #{tag}
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="input-field text-sm"
                placeholder="Add a tag and press Enter (e.g. work, family, sleep)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>

            <button type="submit" disabled={submitting || content.trim().length < 10} className="btn-primary w-full flex items-center justify-center gap-2">
              {submitting ? <><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></> : <><Send size={18} /> Save & Analyze</>}
            </button>
          </form>
        </motion.div>

        {/* ── Analysis Panel ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4">

          {/* Analysis result or placeholder */}
          {analyzing && (
            <div className="card text-center py-8">
              <Sparkles size={32} className="text-brand-400 mx-auto mb-3 animate-pulse" />
              <p className="text-white font-medium">Sage is reading your entry...</p>
              <p className="text-slate-400 text-sm mt-1">AI analysis in progress</p>
              <div className="flex justify-center gap-2 mt-4">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          )}

          {analysis && !analyzing && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Emotion */}
                <div className="card">
                  <p className="section-label mb-3">AI Analysis</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl capitalize">{
                      { joy: "😊", sadness: "😢", anxiety: "😰", anger: "😠", fear: "😨", hope: "🌟", overwhelm: "😵", love: "❤️", grief: "💔" }[analysis.primaryEmotion] || "🧠"
                    }</div>
                    <div>
                      <p className="text-white font-semibold capitalize">{analysis.primaryEmotion}</p>
                      <p className="text-slate-400 text-xs">Primary emotion detected</p>
                    </div>
                    <div className="ml-auto">
                      <div className="text-right">
                        <p className="text-white font-bold">{analysis.stressLevel}/10</p>
                        <p className="text-slate-500 text-xs">Stress</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Affirmation */}
                <div className="card bg-gradient-to-br from-brand-500/10 to-purple-500/10 border-brand-500/20">
                  <p className="section-label mb-2">✨ Affirmation for You</p>
                  <p className="text-white font-display text-lg leading-snug">"{analysis.affirmation}"</p>
                </div>

                {/* Triggers */}
                {analysis.triggers?.length > 0 && (
                  <div className="card">
                    <p className="section-label mb-2">Identified Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.triggers.map((t) => (
                        <span key={t} className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {analysis.copingSuggestions?.length > 0 && (
                  <div className="card">
                    <p className="section-label mb-3">Coping Suggestions</p>
                    <ul className="space-y-2">
                      {analysis.copingSuggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                          <span className="text-brand-400 mt-0.5 shrink-0">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {!analyzing && !analysis && (
            <div className="card text-center py-8">
              <BookOpen size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Write and save a journal entry to see AI analysis here</p>
            </div>
          )}

          {/* Recent entries */}
          {entries.length > 0 && (
            <div className="card">
              <p className="section-label mb-3">Recent Entries</p>
              <div className="space-y-2">
                {entries.slice(0, 5).map((entry) => (
                  <Link key={entry._id} to={`/journal/${entry._id}`} className="block p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <p className="text-white text-sm truncate">{entry.title || format(new Date(entry.createdAt), "MMMM d")}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{format(new Date(entry.createdAt), "MMM d, yyyy")} · {entry.wordCount}w</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
