/**
 * pages/JournalDetailPage.jsx — Single Journal Entry View
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Calendar, Hash } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

const EMOTION_COLORS = {
  joy:"#22c55e",sadness:"#3b82f6",anxiety:"#f59e0b",anger:"#ef4444",
  fear:"#a855f7",hope:"#06b6d4",overwhelm:"#f97316",love:"#ec4899",
};

export default function JournalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/journal/${id}`).then((r) => setEntry(r.data.entry)).catch(() => {
      toast.error("Entry not found"); navigate("/journal");
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this entry permanently?")) return;
    try {
      await api.delete(`/journal/${id}`);
      toast.success("Entry deleted");
      navigate("/journal");
    } catch { toast.error("Delete failed"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="flex gap-2"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>;
  if (!entry) return null;

  const a = entry.aiAnalysis;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link to="/journal" className="btn-ghost flex items-center gap-2"><ArrowLeft size={16} /> Back</Link>
        <button onClick={handleDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors text-sm">
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl text-white">{entry.title || "Untitled Entry"}</h1>
          <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
            <span className="flex items-center gap-1"><Calendar size={14} />{format(new Date(entry.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
            <span>{entry.wordCount} words</span>
            <span>Mood before: {entry.moodBefore}/10</span>
          </div>
          {entry.tags?.length > 0 && (
            <div className="flex gap-2 mt-2">
              {entry.tags.map((t) => <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400"><Hash size={10} />{t}</span>)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="card">
          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-base">{entry.content}</p>
        </div>

        {/* AI Analysis */}
        {a?.analyzed && (
          <div className="space-y-4">
            <h2 className="section-label">AI Analysis</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <p className="section-label mb-2">Primary Emotion</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: EMOTION_COLORS[a.primaryEmotion] || "#4a6cf7" }} />
                  <span className="text-white font-semibold capitalize">{a.primaryEmotion}</span>
                </div>
                {a.secondaryEmotions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.secondaryEmotions.map((e) => <span key={e} className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full capitalize">{e}</span>)}
                  </div>
                )}
              </div>
              <div className="card">
                <p className="section-label mb-2">Stress Level</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: `${a.stressLevel * 10}%` }} />
                  </div>
                  <span className="text-white font-bold">{a.stressLevel}/10</span>
                </div>
              </div>
            </div>

            {a.affirmation && (
              <div className="card bg-gradient-to-br from-brand-500/10 to-purple-500/10 border-brand-500/20">
                <p className="section-label mb-1">✨ Your Affirmation</p>
                <p className="font-display text-xl text-white">"{a.affirmation}"</p>
              </div>
            )}

            {a.summary && (
              <div className="card">
                <p className="section-label mb-2">AI Summary</p>
                <p className="text-slate-300 leading-relaxed">{a.summary}</p>
              </div>
            )}

            {a.triggers?.length > 0 && (
              <div className="card">
                <p className="section-label mb-2">Identified Triggers</p>
                <div className="flex flex-wrap gap-2">
                  {a.triggers.map((t) => <span key={t} className="text-sm px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{t}</span>)}
                </div>
              </div>
            )}

            {a.copingSuggestions?.length > 0 && (
              <div className="card">
                <p className="section-label mb-3">Coping Suggestions</p>
                <ul className="space-y-2">
                  {a.copingSuggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-slate-300 text-sm"><span className="text-brand-400 mt-0.5">→</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
