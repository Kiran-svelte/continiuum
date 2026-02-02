"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ArrowRight, Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"select" | "hr" | "employee">("select");
  const router = useRouter();
  const supabase = createClient();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: mode,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding?intent=${mode}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding?intent=${mode}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email!</h1>
          <p className="text-slate-400 mb-6">
            We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to verify your account.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0f] to-black z-0" />
        <div className="absolute w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] -top-20 -left-20 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-[#00f2ff]/10 rounded-full blur-[100px] bottom-0 right-0 animate-pulse" />

        <div className="relative z-10 w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Join <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-[#00f2ff]">Continuum</span>
            </h1>
            <p className="text-slate-400">Choose how you'd like to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode("hr")}
              className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 rounded-2xl p-8 transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-all" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Register Company</h3>
                <p className="text-slate-400 text-sm mb-4">
                  For HR Managers. Create your company workspace and invite employees.
                </p>
                <div className="flex items-center text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Get started as HR <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("employee")}
              className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-[#00f2ff]/50 rounded-2xl p-8 transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 p-32 bg-[#00f2ff]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#00f2ff]/10 transition-all" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-[#00f2ff]/20 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-[#00f2ff]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Join Your Team</h3>
                <p className="text-slate-400 text-sm mb-4">
                  For Employees. Join your company using the code from HR.
                </p>
                <div className="flex items-center text-[#00f2ff] text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Get started as Employee <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </button>
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-500 text-sm">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0f] to-black z-0" />

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => setMode("select")}
          className="mb-6 text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to role selection
        </button>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 ${mode === "hr" ? "bg-purple-500/20" : "bg-[#00f2ff]/20"}`}>
              {mode === "hr" ? (
                <Building2 className="w-8 h-8 text-purple-400" />
              ) : (
                <Users className="w-8 h-8 text-[#00f2ff]" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {mode === "hr" ? "Create Your Company" : "Join Your Team"}
            </h1>
            <p className="text-slate-400 text-sm">
              {mode === "hr" ? "Set up your HR workspace" : "Register to join your company"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-3 px-4 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing up..." : "Continue with Google"}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0a0a0f] text-slate-400">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                mode === "hr"
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-[#00f2ff] hover:bg-[#00d4e0] text-black"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
