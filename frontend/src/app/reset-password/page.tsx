"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../utils/api";
import { Briefcase, Lock, AlertCircle, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("No reset token found in URL parameters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.detail || "Failed to reset password. The link may have expired or already been used.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm border border-red-100">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Missing Reset Token</h2>
          <p className="text-sm text-slate-500">
            A valid password reset token must be supplied in the URL query parameters.
          </p>
          <div>
            <Link href="/login" className="text-sm font-bold text-sky-600 hover:text-sky-700 transition">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
            <Briefcase size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Enter new password</h2>
          <p className="mt-2 text-sm text-slate-500">
            Please choose a secure password with a minimum of 6 characters.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center space-x-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200 flex items-center space-x-2">
              <CheckCircle size={18} className="flex-shrink-0" />
              <span>Password reset successfully!</span>
            </div>
            <p className="text-sm text-slate-500 text-center animate-pulse">
              Redirecting you to sign in page...
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="pass" className="block text-sm font-semibold text-slate-700">
                  New Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    id="pass"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-semibold text-slate-700">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    id="confirm"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition"
            >
              {loading ? "Saving password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Loading reset form...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
