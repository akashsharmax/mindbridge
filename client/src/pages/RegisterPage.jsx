/**
 * pages/RegisterPage.jsx — New User Registration
 *
 * Multi-step feel with goals selection.
 * The goals collected here are used to personalize Claude's responses.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const GOALS = [
  "Manage anxiety", "Process grief", "Improve sleep",
  "Reduce stress", "Build confidence", "Improve relationships",
  "Overcome depression", "Develop mindfulness", "General wellness",
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleGoal = (goal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, selectedGoals);
      toast.success("Welcome to MindBridge! 🌱");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 animate-float">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Begin your journey</h1>
          <p className="text-slate-400 mt-2">Create your MindBridge account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="section-label block mb-2">Your Name</label>
                <input type="text" className="input-field" placeholder="First name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <label className="section-label block mb-2">Email</label>
                <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <label className="section-label block mb-2">Password</label>
                <input type="password" className="input-field" placeholder="Minimum 8 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>

            {/* Goals selection */}
            <div>
              <label className="section-label block mb-3">What are you working on? <span className="text-slate-600 normal-case">(optional)</span></label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      selectedGoals.includes(goal)
                        ? "bg-brand-500/20 border-brand-500 text-brand-300"
                        : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {selectedGoals.includes(goal) && <Check size={12} />}
                    {goal}
                  </button>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-2">These help personalize your AI companion's responses.</p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
