"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../utils/api";
import { Briefcase, Mail, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.detail || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
            <Briefcase size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Reset your password</h2>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email address and we'll log a recovery link to the backend console.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center space-x-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200 flex items-center space-x-2">
              <CheckCircle size={18} className="flex-shrink-0" />
              <span>Simulated password reset email sent successfully!</span>
            </div>
            <p className="text-sm text-slate-600 text-center">
              Please check the **backend API Docker container logs** to retrieve your generated password reset link.
            </p>
            <div className="text-center">
              <Link href="/login" className="text-sm font-bold text-sky-600 hover:text-sky-700 transition">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition"
              >
                {loading ? "Requesting link..." : "Send Reset Link"}
              </button>
              <Link
                href="/login"
                className="text-center text-sm font-semibold text-slate-500 hover:text-slate-600 transition pt-2"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
