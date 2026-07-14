"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../utils/api";
import Header from "../../../components/Header";
import { Calendar, Briefcase, FileText, CheckCircle, Clock, AlertTriangle, AlertCircle } from "lucide-react";

interface Application {
  id: number;
  job_title: string;
  applied_at: string;
  status: "applied" | "interview" | "offer" | "rejected";
}

interface Interview {
  id: number;
  job_title: string;
  date_time: string;
  notes: string;
  interviewer_email?: string;
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role !== "candidate") {
      router.push("/login");
      return;
    }

    const loadDashboardData = async () => {
      try {
        // Fetch candidates own applications
        const appData = await apiFetch("/applications", { method: "GET" });
        setApplications(appData.items);

        // Fetch interviews scheduled for candidate
        const intData = await apiFetch("/interviews", { method: "GET" });
        setInterviews(intData);
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [router]);

  const getStatusBadge = (status: string) => {
    const styles = {
      applied: "bg-blue-50 text-blue-700 ring-blue-600/20",
      interview: "bg-purple-50 text-purple-700 ring-purple-600/20",
      offer: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
    };
    return (
      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status as keyof typeof styles] || ""}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200 mb-6" />
          <div className="h-60 rounded bg-slate-100" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">Candidate Dashboard</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Applications list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Briefcase size={20} className="text-slate-500" />
                <span>My Applications ({applications.length})</span>
              </h2>

              {applications.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <p>You haven't applied to any jobs yet.</p>
                  <button onClick={() => router.push("/")} className="mt-4 text-sm font-semibold text-sky-600 hover:text-sky-700">
                    Find jobs to apply &rarr;
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <div key={app.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <h3 className="font-semibold text-slate-900">{app.job_title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interview Invites */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Calendar size={20} className="text-slate-500" />
                <span>Interviews ({interviews.length})</span>
              </h2>

              {interviews.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No interviews scheduled yet.</p>
              ) : (
                <div className="space-y-4">
                  {interviews.map((int) => (
                    <div key={int.id} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <h3 className="font-semibold text-slate-900 text-sm">{int.job_title}</h3>
                      <div className="mt-2 text-xs text-slate-500 space-y-1">
                        <p className="font-medium text-indigo-600">
                          {new Date(int.date_time).toLocaleString()}
                        </p>
                        {int.interviewer_email && (
                          <p className="text-slate-400 mt-1">
                            Interviewer: <span className="font-semibold text-slate-600">{int.interviewer_email}</span>
                          </p>
                        )}
                        {int.notes && (
                          <div className="mt-2 border-t border-slate-200/60 pt-2 text-slate-600 italic">
                            "{int.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
