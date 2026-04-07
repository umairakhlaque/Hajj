// ============================================
// AskVault — Sign Up Page (Clerk)
// ============================================

import { SignUp } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-vault flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-vault-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-vault-600 to-vault-800 shadow-premium mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-white/40 mt-1">AskVault Admin Console</p>
        </div>

        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-surface-700/80 border border-white/10 backdrop-blur-md shadow-premium rounded-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-white/50",
                formButtonPrimary:
                  "bg-vault-600 hover:bg-vault-500 text-white rounded-xl",
                formFieldInput:
                  "bg-white/5 border-white/10 text-white rounded-xl focus:border-vault-500",
                formFieldLabel: "text-white/60",
                footerActionText: "text-white/40",
                footerActionLink: "text-vault-400 hover:text-vault-300",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
