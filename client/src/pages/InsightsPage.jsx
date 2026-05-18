/**
 * pages/InsightsPage.jsx — Weekly AI Report Page
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../utils/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function InsightsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/insights/weekly");
      setReport(data.report);
      setGeneratedAt(data.generatedAt);
      toast.success("Weekly report generated! ✨");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Weekly Insights</h1>
        <p className="text-slate-400 mt-1">AI-generated analysis of your past 7 days</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {!report ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
              <Lightbulb size={36} className="text-white" />
            </div>
            <h2 className="font-display text-2xl text-white mb-2">Your Weekly Report</h2>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
              Claude AI will analyze your journal entries and mood logs from the past 7 days and create a personalized insight report.
            </p>
            <button onClick={generateReport} disabled={loading} className="btn-primary flex items-center gap-2 mx-auto">
              {loading ? <><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></> : <><Lightbulb size={18} /> Generate My Report</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Generated {generatedAt ? format(new Date(generatedAt), "MMMM d, yyyy 'at' h:mm a") : ""}</p>
              <button onClick={generateReport} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>
            <div className="card prose prose-invert prose-sm max-w-none leading-relaxed">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
