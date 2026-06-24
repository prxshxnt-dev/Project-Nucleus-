"use client";

import { useState } from "react";
import { Show, useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded } = useAuth();
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const steps = [
    {
      title: "1. Install Clerk SDK",
      desc: "Ensure the Clerk Next.js SDK is installed inside your project folder.",
      code: "npm install @clerk/nextjs",
    },
    {
      title: "2. Configure Environment Keys",
      desc: "Add your API keys to .env.local file in the root of your project.",
      code: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...`,
    },
    {
      title: "3. Mount Middleware & Provider",
      desc: "Make sure proxy.ts intercepts authentication requests and <ClerkProvider> wraps your layout.",
      code: `// proxy.ts\nimport { clerkMiddleware } from '@clerk/nextjs/server'\nexport default clerkMiddleware()`,
    }
  ];

  const allAgreed = agreedTerms && agreedPrivacy;

  // Custom high-fidelity Skeleton Screen during Clerk initialization
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="loading-skeleton">
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 sm:py-16 flex-1 flex flex-col justify-center w-full">
          
          {/* Header Hero Skeleton */}
          <div className="text-center space-y-4 mb-10 flex flex-col items-center">
            <div className="h-6 w-48 bg-slate-200 rounded-full" />
            <div className="h-10 w-3/4 sm:w-1/2 bg-slate-200 rounded-lg mt-2" />
            <div className="h-4 w-5/6 sm:w-2/3 bg-slate-200 rounded mt-1" />
            <div className="h-4 w-4/6 sm:w-1/2 bg-slate-200 rounded mt-1" />
          </div>

          {/* Setup Guide Card Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="h-6 w-60 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="h-6 w-1/3 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-24 w-full bg-slate-200 rounded-xl" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
              <div className="h-2 w-16 bg-slate-200 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>

          {/* Data Collection Card Skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 max-w-2xl mx-auto w-full space-y-6">
            <div className="h-6 w-3/4 bg-slate-200 rounded" />
            <div className="h-20 w-full bg-slate-200 rounded-xl" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-slate-200 rounded" />
                <div className="h-4 w-5/6 bg-slate-200 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-slate-200 rounded" />
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-10 w-full bg-slate-200 rounded-xl mt-4" />
          </div>

          {/* Live Session Card Skeleton */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto w-full space-y-4">
            <div className="h-5 w-1/3 bg-slate-200 rounded pb-1" />
            <div className="h-16 w-full bg-slate-200 rounded-xl" />
          </div>

        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 sm:py-16 flex-1 flex flex-col justify-center">
        
        {/* Header Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
            Authentication Setup Complete
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Welcome to your Next.js & Clerk App
          </h1>
          <p className="max-w-xl mx-auto text-base text-slate-600">
            Secure user management, session management, and authorization flows powered by Clerk, perfectly integrated with Next.js App Router.
          </p>
        </div>

        {/* Setup Guide Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              🚀 Setup & Configuration Guide
            </h2>
            <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Step {guideStep + 1} of {steps.length}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-indigo-600">{steps[guideStep].title}</h3>
            <p className="text-sm text-slate-600">{steps[guideStep].desc}</p>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
              <code>{steps[guideStep].code}</code>
            </pre>
          </div>

          {/* Navigation for steps */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setGuideStep((p) => Math.max(0, p - 1))}
              disabled={guideStep === 0}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    idx === guideStep ? "bg-indigo-600 w-4" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setGuideStep((p) => Math.min(steps.length - 1, p + 1))}
              disabled={guideStep === steps.length - 1}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 px-4 py-1.5 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          </div>
        </div>

        {/* Data Collection & Consent Tickbox Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8 max-w-2xl mx-auto w-full">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            🛡️ Connection Agreement & Compliance
          </h2>
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 text-slate-700 text-sm mb-6 leading-relaxed">
            <p className="font-medium text-slate-900 mb-1">Data Collection Notice:</p>
            We collect your data to make a smooth, secure, and reliable connection between us. This information enables personalized experiences, optimized session caching, security auditing, and persistent synchronization of authentication profiles.
          </div>

          <div className="space-y-3.5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                I have read, understood, and manually accept the{" "}
                <span className="font-semibold text-indigo-600 underline">Terms and Conditions</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedPrivacy}
                onChange={(e) => setAgreedPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                I acknowledge and manually consent to the{" "}
                <span className="font-semibold text-indigo-600 underline">Privacy Policy</span>
              </span>
            </label>
          </div>

          {/* Conditional success prompt */}
          <div className="mt-6">
            {allAgreed ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Thank you! All manual consents have been successfully registered. Connection is active.
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold">
                ⚠️ You must manually tick both options above to complete the smooth connection setup.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Auth State Dashboard integration */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto w-full">
          <h2 className="text-base font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Real-time Session Preview
          </h2>

          <Show when="signed-out">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 text-slate-700 text-sm flex items-start gap-3">
              <span className="flex h-2 w-2 rounded-full bg-slate-400 mt-1.5" />
              <div>
                <p className="font-semibold">Signed Out</p>
                <p className="text-xs text-slate-500 mt-0.5">Toggling the modal buttons in the header allows testing sign in flows instantly.</p>
              </div>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 mt-1.5" />
              <div>
                <p className="font-semibold">Successfully Authenticated</p>
                <p className="text-xs text-emerald-600 mt-0.5">Your live user profile session is fully encrypted and securely synced with Clerk.</p>
              </div>
            </div>
          </Show>
        </div>

      </main>
    </div>
  );
}
