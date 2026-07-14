"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "../../../../utils/api";
import Header from "../../../../components/Header";
import { Briefcase, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface Job {
  id: number;
  title: string;
  department: string;
}

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id;

  const [job, setJob] = useState<Job | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    if (role !== "candidate") {
      router.push("/login");
      return;
    }

    const fetchJobDetails = async () => {
      try {
        const data = await apiFetch(`/jobs/${jobId}`, { method: "GET" });
        setJob(data);
      } catch (err: any) {
        setError(err.detail || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };

    if (jobId) fetchJobDetails();
  }, [jobId, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Client-side file validation per Requirements
    const allowedExtensions = ["pdf", "docx"];
    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setError("Invalid file type. Only PDF and DOCX formats are accepted.");
      setFile(null);
      return;
    }

    // Size limit check: 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File exceeds the maximum limit of 5MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobId) return;

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await apiFetch(`/applications/apply/${jobId}`, {
        method: "POST",
        body: formData,
      }, true); // Send true for isMultipart boundary resolution

      setSuccess(true);
      setTimeout(() => {
        router.push("/candidate/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.detail || "Submission failed. Please check files and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition mb-6"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to job search
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100 space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Apply for opening</span>
            {job && (
              <>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{job.title}</h1>
                <p className="text-sm font-medium text-sky-600 mt-0.5">{job.department} Department</p>
              </>
            )}
          </div>

          {success && (
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 border border-emerald-100 flex items-center space-x-2">
              <CheckCircle size={20} className="text-emerald-600" />
              <span className="text-sm font-medium">Application sent! Redirecting to dashboard...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-red-800 border border-red-100 flex items-center space-x-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Upload Resume / CV
              </label>
              
              <div className="flex justify-center rounded-xl border border-dashed border-slate-300 px-6 py-10 hover:bg-slate-50/50 transition bg-slate-50/20">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm border border-slate-100">
                    <Upload size={20} />
                  </div>
                  <div className="text-sm text-slate-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx" required />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-400">PDF and DOCX only up to 5MB</p>
                </div>
              </div>

              {file && (
                <div className="mt-4 flex items-center space-x-2 rounded-lg bg-indigo-50/50 p-3 border border-indigo-100/60">
                  <FileText className="text-indigo-500" size={18} />
                  <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !file || success}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition"
            >
              {submitting ? "Sending application..." : "Submit Application"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
