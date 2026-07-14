"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../utils/api";
import Header from "../components/Header";
import { Briefcase, MapPin, Search, Tag, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface Job {
  id: number;
  title: string;
  description: string;
  department: string;
  status: "open" | "closed";
  created_at: string;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("user_role"));
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let url = `/jobs?limit=${limit}&offset=${offset}`;
      if (deptFilter) url += `&department=${encodeURIComponent(deptFilter)}`;
      
      const data = await apiFetch(url, { method: "GET" });
      
      // Filter out closed jobs for candidate/public browsing
      let filteredItems = data.items;
      if (search) {
        filteredItems = filteredItems.filter((job: Job) =>
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase())
        );
      }
      setJobs(filteredItems);
      setTotal(data.total);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [offset, deptFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchJobs();
  };

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 py-20 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 opacity-90" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-400 ring-1 ring-inset ring-sky-500/20 mb-4">
            Build your dream team or land your dream job
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Find the Perfect Career Path
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300">
            Browse our curated opportunities at the world's leading companies. Apply instantly using our streamlined candidate platform.
          </p>
        </div>
      </section>

      {/* Filter / Search section */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center relative">
            <Search className="absolute left-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search jobs by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 border transition"
            />
          </form>
          
          <div className="flex gap-4 w-full md:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => { setOffset(0); setDeptFilter(e.target.value); }}
              className="w-full md:w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Data & AI">Data & AI</option>
              <option value="Product Management">Product</option>
              <option value="Design">Design</option>
            </select>
          </div>
        </div>

        {/* Listings */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Open Roles ({total})</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
            <p>No open positions match your search criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <div key={job.id} className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      {job.department}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition">
                    {job.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-3">
                    {job.description}
                  </p>
                </div>
                
                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                  <span className="flex items-center text-xs text-slate-400">
                    <MapPin size={14} className="mr-1" /> Hybrid / Remote
                  </span>
                  
                  {userRole === "hr" || userRole === "admin" ? (
                    <span className="text-xs font-semibold text-slate-400">
                      HR Management Access
                    </span>
                  ) : (
                    <Link
                      href={`/jobs/${job.id}/apply`}
                      className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-700 transition"
                    >
                      Apply Now <ArrowRight size={16} className="ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Section */}
        {total > limit && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
            <button
              onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
              disabled={offset === 0}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <ChevronLeft size={16} className="mr-1" /> Previous
            </button>
            <span className="text-sm text-slate-500">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} jobs
            </span>
            <button
              onClick={() => setOffset((prev) => (prev + limit < total ? prev + limit : prev))}
              disabled={offset + limit >= total}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Next <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        )}
      </main>
    </>
  );
}
