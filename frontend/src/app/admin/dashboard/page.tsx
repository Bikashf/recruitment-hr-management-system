"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../utils/api";
import Header from "../../../components/Header";
import { User, Users, Briefcase, FileText, Plus, Trash2, ShieldAlert } from "lucide-react";

interface HrUser {
  id: number;
  email: string;
}

interface Stats {
  jobs_count: number;
  applications_count: number;
  candidates_count: number;
  hr_count: number;
  status_distribution: {
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [hrAccounts, setHrAccounts] = useState<HrUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // New HR Account Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role !== "admin") {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const hrData = await apiFetch("/admin/hr", { method: "GET" });
      setHrAccounts(hrData);
      const statsData = await apiFetch("/admin/stats", { method: "GET" });
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHr = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/hr", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "hr" }),
      });
      setEmail("");
      setPassword("");
      loadData();
    } catch (err: any) {
      setError(err.detail || "Failed to create HR account");
    }
  };

  const handleDeleteHr = async (id: number) => {
    if (!confirm("Are you sure you want to delete this HR account? All jobs they posted will be lost.")) return;
    try {
      await apiFetch(`/admin/hr/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Failed to delete HR account");
    }
  };

  if (loading) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <ShieldAlert className="text-red-500" />
          <span>System Administration Panel</span>
        </h1>

        {/* Stats Cards Grid */}
        {stats && (
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Jobs", count: stats.jobs_count, icon: Briefcase, color: "from-sky-500 to-sky-600" },
              { label: "Total Applications", count: stats.applications_count, icon: FileText, color: "from-indigo-500 to-indigo-600" },
              { label: "Candidates Registered", count: stats.candidates_count, icon: Users, color: "from-emerald-500 to-emerald-600" },
              { label: "HR Team Members", count: stats.hr_count, icon: User, color: "from-amber-500 to-amber-600" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.count}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${stat.color} text-white flex items-center justify-center shadow-md`}>
                  <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* HR Management Form & List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Register New HR Officer</h2>
              {error && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 mb-4">{error}</div>}
              <form onSubmit={handleCreateHr} className="grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@talentforce.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" required />
                </div>
                <button type="submit" className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-bold shadow-md hover:bg-slate-800 transition">
                  Create Account
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">HR Officers List ({hrAccounts.length})</h2>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {hrAccounts.map((hr) => (
                  <div key={hr.id} className="py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{hr.email}</span>
                    <button onClick={() => handleDeleteHr(hr.id)} className="text-slate-400 hover:text-red-600 transition p-1.5 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Application status pipeline diagram */}
          {stats && (
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Pipeline Distribution</h2>
              <div className="space-y-4">
                {[
                  { label: "Applied", value: stats.status_distribution.applied, color: "bg-blue-500" },
                  { label: "Interview", value: stats.status_distribution.interview, color: "bg-purple-500" },
                  { label: "Offer", value: stats.status_distribution.offer, color: "bg-emerald-500" },
                  { label: "Rejected", value: stats.status_distribution.rejected, color: "bg-rose-500" },
                ].map((bar, i) => {
                  const pct = stats.applications_count > 0 ? (bar.value / stats.applications_count) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>{bar.label}</span>
                        <span>{bar.value} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${bar.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
