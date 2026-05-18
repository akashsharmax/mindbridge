/**
 * pages/MoodPage.jsx — Daily Mood Logger + Heatmap Calendar
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, Check } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { format, subDays, eachDayOfInterval } from "date-fns";

const EMOTIONS = ["happy","calm","hopeful","grateful","anxious","sad","angry","overwhelmed","lonely","energized","numb","frustrated"];
const EMOTION_EMOJI = { happy:"😊",calm:"😌",hopeful:"🌟",grateful:"🙏",anxious:"😰",sad:"😢",angry:"😠",overwhelmed:"😵",lonely:"💔",energized:"⚡",numb:"😶",frustrated:"😤" };

const moodColor = (score) => {
  if (!score) return "bg-surface-600";
  if (score <= 3) return "bg-red-500";
  if (score <= 5) return "bg-amber-500";
  if (score <= 7) return "bg-green-500";
  return "bg-brand-500";
};

export default function MoodPage() {
  const [score, setScore] = useState(5);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [heatmap, setHeatmap] = useState({});
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => {
    api.get("/mood/analytics?days=90").then((r) => {
      setHeatmap(r.data.analytics.heatmapData || {});
      const todayKey = format(new Date(), "yyyy-MM-dd");
      if (r.data.analytics.heatmapData?.[todayKey]) setTodayLogged(true);
    }).catch(() => {});
  }, []);

  const toggleEmotion = (e) => {
    setSelectedEmotions((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/mood", { score, emotions: selectedEmotions, note });
      const todayKey = format(new Date(), "yyyy-MM-dd");
      setHeatmap((prev) => ({ ...prev, [todayKey]: score }));
      setTodayLogged(true);
      toast.success("Mood logged! 📊");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to log mood");
    } finally {
      setSubmitting(false);
    }
  };

  // Build 90-day calendar grid
  const days = eachDayOfInterval({ start: subDays(new Date(), 89), end: new Date() });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Mood Tracker</h1>
        <p className="text-slate-400 mt-1">Log how you feel. Spot your patterns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <p className="section-label mb-1">Today's Mood Score</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-3xl">{score <= 3 ? "😔" : score <= 6 ? "😐" : score <= 8 ? "😊" : "🤩"}</span>
                <div className="flex-1">
                  <input type="range" min="1" max="10" value={score}
                    onChange={(e) => setScore(parseInt(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer accent-brand-500 bg-surface-600" />
                  <div className="flex justify-between text-slate-600 text-xs mt-1"><span>1</span><span>10</span></div>
                </div>
                <span className="text-4xl font-bold font-mono text-white w-10">{score}</span>
              </div>
            </div>

            <div>
              <p className="section-label mb-3">How are you feeling? (pick all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((e) => (
                  <button key={e} type="button" onClick={() => toggleEmotion(e)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all ${
                      selectedEmotions.includes(e) ? "bg-brand-500/20 border-brand-500 text-brand-300" : "border-white/10 text-slate-400 hover:border-white/30"
                    }`}>
                    {EMOTION_EMOJI[e]} {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="section-label mb-2">Quick Note (optional)</p>
              <textarea className="input-field resize-none" rows={3} placeholder="Anything specific affecting your mood?"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <button type="submit" disabled={submitting || todayLogged} className="btn-primary w-full flex items-center justify-center gap-2">
              {todayLogged ? <><Check size={18} /> Today's mood logged!</> : submitting ? "Saving..." : "Log Mood"}
            </button>
            {todayLogged && <p className="text-slate-500 text-xs text-center">Submit again to update today's log</p>}
          </form>
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card">
            <p className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-brand-400" /> 90-Day Mood Heatmap
            </p>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const s = heatmap[key];
                return (
                  <div key={key} title={`${format(day, "MMM d")}: ${s ? `${s}/10` : "No data"}`}
                    className={`w-full aspect-square rounded-sm ${moodColor(s)} opacity-${s ? "100" : "20"} cursor-default transition-opacity hover:opacity-80`} />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <span>90 days ago</span>
              <div className="flex items-center gap-2">
                <span>Low</span>
                <div className="flex gap-1">
                  {["bg-red-500","bg-amber-500","bg-green-500","bg-brand-500"].map((c) => (
                    <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
                  ))}
                </div>
                <span>High</span>
              </div>
              <span>Today</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
