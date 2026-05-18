/**
 * components/Crisis/CrisisModal.jsx — Emergency Resources Overlay
 *
 * Shown automatically via Socket.io when crisis language is detected.
 * Displays crisis resources and a confirmation button.
 * Cannot be dismissed without clicking "I'm Safe" to ensure user sees resources.
 */

import { motion } from "framer-motion";
import { Heart, Phone, ExternalLink, Shield } from "lucide-react";

const RESOURCES = [
  { name: "iCall (India)", contact: "9152987821", type: "phone", desc: "Mon–Sat, 8am–10pm" },
  { name: "Vandrevala Foundation", contact: "1860-2662-345", type: "phone", desc: "24/7 helpline" },
  { name: "988 Suicide Lifeline (US)", contact: "988", type: "phone", desc: "Call or text, 24/7" },
  { name: "Crisis Text Line", contact: "Text HOME to 741741", type: "text", desc: "Text-based support" },
  { name: "IASP Crisis Centers", contact: "https://www.iasp.info/resources/Crisis_Centres/", type: "link", desc: "International directory" },
];

const severityMessage = (s) => {
  if (s >= 4) return { title: "We're concerned about you", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  if (s >= 2) return { title: "We noticed you might be struggling", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
  return { title: "We're here for you", color: "text-brand-400", bg: "bg-brand-500/10 border-brand-500/30" };
};

export default function CrisisModal({ severity, onDismiss }) {
  const msg = severityMessage(severity);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-surface-800 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
            <Heart size={32} className="text-white" />
          </div>
          <h2 className={`font-display text-2xl font-bold ${msg.color}`}>{msg.title}</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Our AI noticed language in your entry that suggests you may be going through something difficult. You're not alone, and help is available.
          </p>
        </div>

        <div className={`rounded-xl border p-4 mb-6 ${msg.bg}`}>
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield size={16} /> Crisis Resources
          </p>
          <div className="space-y-3">
            {RESOURCES.map((r) => (
              <div key={r.name} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{r.name}</p>
                  <p className="text-slate-400 text-xs">{r.desc}</p>
                </div>
                {r.type === "link" ? (
                  <a href={r.contact} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1">
                    Visit <ExternalLink size={10} />
                  </a>
                ) : (
                  <a href={`tel:${r.contact.replace(/[^0-9]/g, "")}`} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-sm font-mono font-bold">
                    <Phone size={12} /> {r.contact}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Heart size={16} /> I'm safe — continue to app
        </button>
        <p className="text-slate-600 text-xs text-center mt-3">
          Your trusted contacts have been notified if any were added.
        </p>
      </motion.div>
    </motion.div>
  );
}
