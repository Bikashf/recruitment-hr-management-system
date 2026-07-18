"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL } from "../../../utils/api";
import Header from "../../../components/Header";
import { Briefcase, FileText, User, Plus, Edit2, XCircle, Calendar, Download } from "lucide-react";

interface Job {
  id: number;
  title: string;
  description: string;
  department: string;
  status: "open" | "closed";
}

interface Application {
  id: number;
  job_title: string;
  candidate_email: string;
  status: "applied" | "interview" | "offer" | "rejected";
}

export default function HrDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  
  // Application pagination state
  const [appOffset, setAppOffset] = useState(0);
  const [appTotal, setAppTotal] = useState(0);
  const appLimit = 20;

  
  // Job Form State
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");

  // Interview Form State
  const [showIntModal, setShowIntModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role !== "hr" && role !== "admin") {
      router.push("/login");
      return;
    }
    loadData(appOffset);
  }, [router, appOffset]);

  const loadData = async (offsetVal = appOffset) => {
    try {
      const jobData = await apiFetch("/jobs?limit=100");
      setJobs(jobData.items);
      const appData = await apiFetch(`/applications?limit=${appLimit}&offset=${offsetVal}`);
      setApplications(appData.items);
      setAppTotal(appData.total);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { title, description, department, status };
      if (selectedJob) {
        await apiFetch(`/jobs/${selectedJob.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/jobs", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setShowJobModal(false);
      resetJobForm();
      loadData();
    } catch (err) {
      alert("Failed to save job posting");
    }
  };

  const handleUpdateStatus = async (appId: number, newStatus: string) => {
    try {
      await apiFetch(`/applications/${appId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const loggedInId = localStorage.getItem("user_id");
      await apiFetch(`/interviews/schedule/${selectedApp.id}`, {
        method: "POST",
        body: JSON.stringify({
          interviewer_id: loggedInId ? parseInt(loggedInId) : undefined,
          date_time: new Date(dateTime).toISOString(),
          notes,
        }),
      });
      setShowIntModal(false);
      setSelectedApp(null);
      setDateTime("");
      setNotes("");
      loadData();
    } catch (err: any) {
      alert(`Failed to schedule interview: ${err.detail || err.message || err}`);
    }
  };

  const resetJobForm = () => {
    setSelectedJob(null);
    setTitle("");
    setDescription("");
    setDepartment("");
    setStatus("open");
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">HR Pipeline Dashboard</h1>
          <button
            onClick={() => { resetJobForm(); setShowJobModal(true); }}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition"
          >
            <Plus size={16} className="mr-1.5" /> Create Job Posting
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Job listings CRUD panel */}
          <div className="lg:col-span-1 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Briefcase size={20} className="text-slate-500" />
              <span>Jobs Management ({jobs.length})</span>
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50/50 transition flex items-center justify-between">
                  <div className="truncate pr-2">
                    <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{job.department}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setTitle(job.title);
                      setDescription(job.description);
                      setDepartment(job.department);
                      setStatus(job.status);
                      setShowJobModal(true);
                    }}
                    className="text-slate-400 hover:text-sky-600 p-1.5 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Applications list and tracking panel */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <FileText size={20} className="text-slate-500" />
              <span>Candidate Applications ({applications.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Candidate</th>
                    <th className="pb-3">Job Role</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/40">
                      <td className="py-3 font-semibold text-slate-900">{app.candidate_email}</td>
                      <td className="py-3">{app.job_title}</td>
                      <td className="py-3">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none transition"
                        >
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="py-3 text-right flex items-center justify-end space-x-2">
                        <a
                          href={`${API_BASE_URL}/applications/${app.id}/resume`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-sky-600 transition"
                          title="Download Resume"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => { setSelectedApp(app); setShowIntModal(true); }}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                        >
                          <Calendar size={14} /> <span>Schedule</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {appTotal > appLimit && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  onClick={() => setAppOffset((prev) => Math.max(0, prev - appLimit))}
                  disabled={appOffset === 0}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Showing {appOffset + 1} to {Math.min(appOffset + appLimit, appTotal)} of {appTotal} applications
                </span>
                <button
                  onClick={() => setAppOffset((prev) => (prev + appLimit < appTotal ? prev + appLimit : prev))}
                  disabled={appOffset + appLimit >= appTotal}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Modal for Job CRUD */}
        {showJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
            <form onSubmit={handleCreateOrUpdateJob} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">{selectedJob ? "Edit Job" : "Create Job"}</h3>
                <button type="button" onClick={() => setShowJobModal(false)}><XCircle className="text-slate-400" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" required />
                <input type="text" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" required />
                <textarea placeholder="Job Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" required />
                <select value={status} onChange={(e: any) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90">Save Posting</button>
            </form>
          </div>
        )}

        {/* Modal for Interview Scheduling */}
        {showIntModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
            <form onSubmit={handleScheduleInterview} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Schedule Interview</h3>
                <button type="button" onClick={() => setShowIntModal(false)}><XCircle className="text-slate-400" /></button>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500">Candidate: {selectedApp?.candidate_email}</label>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" required />
                <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90">Schedule</button>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
