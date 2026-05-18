/**
 * pages/ChatPage.jsx — AI Companion "Sage" Chat Interface
 * Full conversation UI with typing indicators and crisis detection
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Brain, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get("/chat/history").then((r) => setHistory(r.data.conversations)).catch(() => {});
    // Welcome message
    setMessages([{
      role: "assistant",
      content: `Hi ${user?.name?.split(" ")[0] || "there"} 👋 I'm **Sage**, your AI wellness companion.\n\nI'm here to listen, reflect, and support you — whatever's on your mind. How are you feeling today?`,
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    const msgText = input;
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chat", { message: msgText, conversationId });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        isCrisis: data.crisisDetected,
      }]);
      if (data.crisisDetected) {
        toast("💙 Crisis resources have been shown. You're not alone.", { duration: 6000, icon: "🆘" });
      }
    } catch (err) {
      toast.error("Couldn't reach Sage right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setConversationId(null);
    setMessages([{
      role: "assistant",
      content: `Starting fresh! What's on your mind, ${user?.name?.split(" ")[0]}?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      {/* Sidebar - conversation history */}
      <div className="w-64 flex flex-col gap-3 shrink-0">
        <button onClick={startNew} className="btn-primary flex items-center gap-2 justify-center">
          <Plus size={18} /> New Conversation
        </button>
        <div className="card flex-1 overflow-y-auto space-y-2">
          <p className="section-label">Past Conversations</p>
          {history.length === 0 && <p className="text-slate-500 text-xs">No conversations yet</p>}
          {history.map((conv) => (
            <button key={conv._id} onClick={() => {
              api.get(`/chat/${conv._id}`).then((r) => {
                setConversationId(conv._id);
                setMessages(r.data.conversation.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
              });
            }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors">
              <p className="text-white text-xs truncate">{conv.title}</p>
              <p className="text-slate-600 text-xs mt-0.5">{format(new Date(conv.updatedAt), "MMM d")}</p>
              {conv.crisisDetected && <span className="text-red-400 text-xs">⚠ Crisis flagged</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">Sage</p>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><p className="text-green-400 text-xs">Online</p></div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  msg.role === "assistant" ? "bg-gradient-to-br from-brand-500 to-purple-600" : "bg-surface-500 border border-white/10"
                }`}>
                  {msg.role === "assistant" ? <Brain size={14} className="text-white" /> : user?.name?.[0]}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === "user" ? "bg-brand-500/20 border border-brand-500/30 text-white" : "glass text-slate-200"
                } ${msg.isCrisis ? "border-red-500/50 bg-red-500/5" : ""}`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">{msg.content}</ReactMarkdown>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-1">{format(msg.timestamp, "h:mm a")}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center"><Brain size={14} className="text-white" /></div>
              <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Share what's on your mind..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-primary px-4">
              <Send size={18} />
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">Sage is an AI, not a therapist. In crisis? Call iCall: 9152987821</p>
        </div>
      </div>
    </div>
  );
}
