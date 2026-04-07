// ============================================
// AskVault — Premium Landing Page
// ============================================

import Link from "next/link";
import { Sparkles, Shield, BookOpen, Zap, Lock, Globe, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-vault noise overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-vault-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-gold-500/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-vault-800/5 rounded-full blur-2xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vault-600 to-vault-800 flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">AskVault</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/admin/dashboard">
            <Button size="sm">
              Admin Console
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-32 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-vault-500/30 bg-vault-500/10 text-vault-300 text-xs font-medium mb-8">
          <Shield className="w-3 h-3" />
          Enterprise-Grade Private Knowledge Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight text-balance">
          Your Knowledge,{" "}
          <span className="gradient-text">Answered Privately</span>
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
          Deploy a premium chat interface grounded entirely in your private knowledge base.
          Multiple notebooks. Multiple Google accounts. Zero exposure.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/admin/dashboard">
            <Button size="xl" className="w-full sm:w-auto">
              <Sparkles className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/t/demo/chat">
            <Button size="xl" variant="glass" className="w-full sm:w-auto">
              <Globe className="w-5 h-5" />
              View Demo Chat
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-white/8 bg-surface-700/30 backdrop-blur-sm hover:border-white/15 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-vault-600/15 border border-vault-500/20 flex items-center justify-center mb-4 group-hover:bg-vault-600/25 transition-colors">
                <feature.icon className="w-5 h-5 text-vault-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security strip */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-gold-500/15 bg-gold-500/5 p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gold-400" />
            <h2 className="font-semibold text-white">Enterprise Security</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/40">
            {securityPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center text-xs text-white/20">
        © {new Date().getFullYear()} AskVault. Private Knowledge Platform.
        Built with enterprise-grade security.
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Lock,
    title: "Knowledge Stays Private",
    description:
      "Users only see chat answers. No notebook UI, no raw files, no source exposure. Your IP stays locked.",
  },
  {
    icon: BookOpen,
    title: "Multi-Notebook RAG",
    description:
      "Connect multiple Google accounts and notebooks. Query across all of them with perfect tenant isolation.",
  },
  {
    icon: Zap,
    title: "Grounded, Not Hallucinated",
    description:
      "Every answer is retrieved from your approved content. If the answer isn't there, we say so honestly.",
  },
  {
    icon: Shield,
    title: "Enterprise Access Control",
    description:
      "Content classification, source approval workflows, role-based access, and audit logs on every action.",
  },
  {
    icon: Globe,
    title: "Multi-Tenant Workspaces",
    description:
      "Serve multiple customers from one platform. Each tenant gets isolated branding, notebooks, and users.",
  },
  {
    icon: Sparkles,
    title: "Premium Chat UX",
    description:
      "A luxury chat experience with citations, feedback, session memory, and suggested prompts. No clutter.",
  },
];

const securityPoints = [
  "AES-256-GCM token encryption",
  "Row-level tenant isolation",
  "Prompt injection defense",
  "Rate limiting & bot protection",
  "Audit logs on all admin actions",
  "Zero raw source exposure",
  "CSRF protection",
  "Retrieval-time access filtering",
];
