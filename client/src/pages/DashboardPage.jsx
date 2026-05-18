/**
 * pages/DashboardPage.jsx — Main Analytics Dashboard
 *
 * Shows the user's mental health overview:
 * - Greeting with streak
 * - Quick mood log
 * - Recent journal entries
 * - Mood trend chart (Recharts)
 * - Emotion breakdown
 * - Quick navigation cards
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BookOpen, MessageCircle, Lightbulb, TrendingUp, Flame, Award, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { format, subDays } from "date-fns";

const EMOTION_COLORS = {
  joy: "#22c55e", sadness: "#3b82f6", anxiety: "#f59e0b",
  anger: "#ef4444", fear: "#a855f7", hope: "#06b6d4",
  overwhelm: "#f97316", love: "#ec4899", shame: "#6b7280",
  grief: "#64748b", numbness: "#94a3b8",
};

const getGreeting = (name) => {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name?.split(" ")[0]} 👋`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, entriesRes] = await Promise.all([
          api.get("/mood/analytics?days=30"),
          api.get("/journal?limit=5"),
        ]);
        setAnalytics(analyticsRes.data.analytics);
        setRecentEntries(entriesRes.data.entries);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-2"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
      </div>
    );
  }

  const moodTrend = analytics?.moodTrend || [];
  const emotionBreakdown = analytics?.emotionBreakdown?.slice(0, 6) || [];

  return (
    <div className="space-y-8">
      {/* ── Greeting ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">{getGreeting(user?.name)}</h1>
        <p className="text-slate-400 mt-1">Here's your mental wellness overview</p>
      </motion.div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Day Streak", value: user?.currentStreak || 0, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
          { label: "Avg Mood", value: analytics?.avgMood ? `${analytics.avgMood}/10` : "—", icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Entries This Month", value: analytics?.totalJournalEntries || 0, icon: BookOpen, color: "text-brand-400", bg: "bg-brand-500/10" },
          { label: "Badges Earned", value: user?.badges?.length || 0, icon: Award, color: "text-yellow-400", bg: "bg-yellow-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card lg:col-span-2"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-400" />
            Mood Trend — Last 30 Days
          </h3>
          {moodTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(d) => format(new Date(d), "MMM d")} />
                <YAxis domain={[1, 10]} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0" }}
                  labelFormatter={(d) => format(new Date(d), "MMMM d")}
                />
                <Line type="monotone" dataKey="score" stroke="#4a6cf7" strokeWidth={2.5}
                  dot={{ fill: "#4a6cf7", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "#7c3aed" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No mood data yet. Start logging your mood!</p>
            </div>
          )}
        </motion.div>

        {/* Emotion Breakdown Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-white font-semibold mb-4">Your Emotions</h3>
          {emotionBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={emotionBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="count" nameKey="emotion">
                    {emotionBreakdown.map((entry) => (
                      <Cell key={entry.emotion} fill={EMOTION_COLORS[entry.emotion] || "#4a6cf7"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {emotionBreakdown.slice(0, 4).map(({ emotion, count }) => (
                  <div key={emotion} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: EMOTION_COLORS[emotion] || "#4a6cf7" }} />
                      <span className="text-slate-400 text-xs capitalize">{emotion}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{count}x</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-slate-500 text-sm text-center">Write journal entries to see your emotion patterns</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h3 className="section-label mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { to: "/journal", icon: BookOpen, label: "Write in Journal", color: "from-brand-500 to-blue-600", desc: "Reflect on your day" },
            { to: "/chat", icon: MessageCircle, label: "Talk to Sage", color: "from-purple-500 to-pink-600", desc: "Your AI companion" },
            { to: "/insights", icon: Lightbulb, label: "Weekly Insights", color: "from-amber-500 to-orange-600", desc: "AI-generated report" },
          ].map(({ to, icon: Icon, label, color, desc }) => (
            <Link key={to} to={to} className="card hover:scale-105 transition-all duration-200 group cursor-pointer">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-white font-medium text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Entries ─────────────────────────────────────────── */}
      {recentEntries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-label">Recent Journal Entries</h3>
            <Link to="/journal" className="text-brand-400 text-sm hover:text-brand-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <Link key={entry._id} to={`/journal/${entry._id}`} className="card glass-hover block">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {entry.title || format(new Date(entry.createdAt), "MMMM d, yyyy")}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {entry.aiAnalysis?.primaryEmotion && (
                        <span className="emotion-badge text-xs" style={{
                          background: `${EMOTION_COLORS[entry.aiAnalysis.primaryEmotion]}20`,
                          color: EMOTION_COLORS[entry.aiAnalysis.primaryEmotion] || "#4a6cf7",
                        }}>
                          {entry.aiAnalysis.primaryEmotion}
                        </span>
                      )}
                      <span className="text-slate-600 text-xs">{entry.wordCount} words</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-xs">{format(new Date(entry.createdAt), "MMM d")}</p>
                    {entry.moodBefore && (
                      <p className="text-slate-400 text-xs mt-1">Mood: {entry.moodBefore}/10</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Badges */}
      {user?.badges?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h3 className="section-label mb-3">Your Badges</h3>
          <div className="flex flex-wrap gap-2">
            {user.badges.map((badge) => (
              <span key={badge} className="glass px-3 py-1.5 rounded-full text-sm text-yellow-300 border border-yellow-500/20">
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
