import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clerk Next.js App",
  description: "Next.js App Router with Clerk Authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#4f46e5",
              colorBackground: "#ffffff",
              colorText: "#0f172a",
              colorInputBackground: "#ffffff",
              colorInputText: "#0f172a",
              borderRadius: "12px",
            },
            elements: {
              card: "shadow-xl border border-slate-200/80 rounded-2xl w-full max-w-[95vw] sm:max-w-md mx-auto p-4 sm:p-6",
              headerTitle: "text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight text-center",
              headerSubtitle: "text-sm text-slate-500 text-center",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm h-[46px] min-h-[44px] py-2.5 px-4 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full flex items-center justify-center cursor-pointer",
              formFieldInput: "h-[46px] min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 text-sm w-full transition-all bg-white",
              formFieldLabel: "text-xs font-bold text-slate-600 mb-1.5",
              socialButtonsIconButton: "h-[46px] min-h-[44px] border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer",
              socialButtonsBlockButton: "h-[46px] min-h-[44px] border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 px-4 py-2 w-full cursor-pointer",
              footerActionLink: "text-indigo-600 hover:text-indigo-700 font-semibold hover:underline",
              modalContent: "rounded-2xl max-w-[95vw] sm:max-w-md w-full",
              modalBackdrop: "bg-slate-900/40 backdrop-blur-sm",
            },
            layout: {
              socialButtonsPlacement: "bottom",
              showOptionalFields: true,
            }
          }}
        >
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  ClerkNext
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">
                  App Router
                </span>
              </div>
              <nav className="flex items-center gap-4">
                <Show when="signed-out">
                  <div className="flex items-center gap-3">
                    <SignInButton mode="modal">
                      <button className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer px-4 py-2.5 min-h-[44px] flex items-center justify-center">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-lg shadow-sm">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-medium">Welcome Back</span>
                    <UserButton />
                  </div>
                </Show>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
