"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0a0f] to-black z-0" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
        <p className="text-slate-400 mb-6">
          Something went wrong during sign in. This could be due to:
        </p>
        
        <ul className="text-left text-slate-400 text-sm mb-8 space-y-2 bg-white/5 rounded-lg p-4 border border-white/10">
          <li className="flex items-start gap-2">
            <span className="text-red-400">•</span>
            <span>An expired or invalid authentication link</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400">•</span>
            <span>The authentication session timed out</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400">•</span>
            <span>A temporary server issue</span>
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
