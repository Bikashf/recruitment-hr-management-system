"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout } from "../utils/api";
import { Briefcase, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const email = localStorage.getItem("user_email");
    const role = localStorage.getItem("user_role");
    if (email && role) {
      setUser({ email, role });
    }
  }, []);

  if (!mounted) return null; // Avoid hydration flash

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-900 hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-200">
            <Briefcase size={20} />
          </div>
          <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">TalentForce</span>
        </Link>

        {/* Navigation & User actions */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
            Browse Jobs
          </Link>
          
          {user ? (
            <>
              {/* Dashboard Link based on Role */}
              <Link
                href={`/${user.role}/dashboard`}
                className="flex items-center space-x-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              {/* User profile dropdown/display */}
              <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800">{user.email}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{user.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-50 transition"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-4 text-sm font-semibold text-white hover:opacity-90 transition shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
