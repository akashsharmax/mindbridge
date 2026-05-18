/**
 * pages/ProfilePage.jsx — User Profile & Settings
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Bell, Plus, X, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

const GOALS = ["Manage anxiety","Process grief","Improve sleep","Reduce stress","Build confidence","Improve relationships","Overcome depression","Develop mindfulness","General wellness"];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [goals, setGoals] = useState(user?.mentalHealthGoals || []);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", relationship: "Friend" });
  const [contacts, setContacts] = useState(user?.trustedContacts || []);

  const toggleGoal = (g) => setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", { name, mentalHealthGoals: goals });
      updateUser(data.user);
      toast.success("Profile saved!");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.email) { toast.error("Name and email required"); return; }
    try {
      const { data } = await api.post("/crisis/contacts", newContact);
      setContacts(data.trustedContacts);
      setNewContact({ name: "", email: "", relationship: "Friend" });
      updateUser({ trustedContacts: data.trustedContacts });
      toast.success("Contact added!");
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const removeContact = async (id) => {
    try {
      const { data } = await api.delete(`/crisis/contacts/${id}`);
      setContacts(data.trustedContacts);
      updateUser({ trustedContacts: data.trustedContacts });
      toast.success("Contact removed");
    } catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div><h1 className="page-title">Profile & Settings</h1></div>

      {/* Basic Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <User size={18} className="text-brand-400" />
          <h2 className="text-white font-semibold">Basic Information</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.[0]}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <p className="text-orange-400 text-xs mt-0.5">🔥 {user?.currentStreak || 0} day streak · {user?.totalEntries || 0} total entries</p>
          </div>
        </div>
        <div>
          <label className="section-label block mb-2">Display Name</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="section-label block mb-3">Wellness Goals</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button key={g} type="button" onClick={() => toggleGoal(g)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all ${
                  goals.includes(g) ? "bg-brand-500/20 border-brand-500 text-brand-300" : "border-white/10 text-slate-400 hover:border-white/30"
                }`}>
                {goals.includes(g) && <Check size={12} />}{g}
              </button>
            ))}
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </motion.div>

      {/* Trusted Contacts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={18} className="text-green-400" />
          <div>
            <h2 className="text-white font-semibold">Safety Network</h2>
            <p className="text-slate-500 text-xs">These people are emailed if the AI detects a crisis in your entries</p>
          </div>
        </div>

        {contacts.map((c) => (
          <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">{c.name}</p>
              <p className="text-slate-400 text-xs">{c.email} · {c.relationship}</p>
            </div>
            <button onClick={() => removeContact(c._id)} className="text-slate-500 hover:text-red-400 transition-colors"><X size={16} /></button>
          </div>
        ))}

        {contacts.length < 5 && (
          <div className="space-y-3 p-4 rounded-xl border border-dashed border-white/10">
            <p className="section-label">Add Trusted Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field text-sm" placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <input className="input-field text-sm" placeholder="Email" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
            </div>
            <select className="input-field text-sm" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}>
              {["Friend","Family","Partner","Therapist","Colleague"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <button onClick={addContact} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Contact</button>
          </div>
        )}
      </motion.div>

      {/* Badges */}
      {user?.badges?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
          <h2 className="text-white font-semibold mb-4">Your Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {user.badges.map((b) => <span key={b} className="px-3 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">{b}</span>)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
