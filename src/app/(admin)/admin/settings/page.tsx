// ============================================
// AskVault — Settings Page
// ============================================

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Palette,
  MessageSquare,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [strictMode, setStrictMode] = useState(true);
  const [showCitations, setShowCitations] = useState(true);
  const [showSnippets, setShowSnippets] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [heroTitle, setHeroTitle] = useState("Ask My Knowledge Base");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Get instant, grounded answers from your private knowledge vault."
  );

  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure your knowledge platform behavior
        </p>
      </div>

      {/* Branding */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-vault-400" />
              Chat Interface Branding
            </CardTitle>
            <CardDescription>
              Customize the chat page appearance for your end users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Hero Title</label>
              <Input
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Ask My Knowledge Base"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Hero Subtitle</label>
              <Input
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Get grounded answers..."
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Answer policy */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-vault-400" />
              Answer Policy
            </CardTitle>
            <CardDescription>
              Control how answers are generated and displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              label="Strict Grounded Mode"
              description="Refuse to answer if no supporting content is found"
              value={strictMode}
              onChange={setStrictMode}
            />
            <ToggleSetting
              label="Show Citations"
              description="Display notebook and source names in answers"
              value={showCitations}
              onChange={setShowCitations}
            />
            <ToggleSetting
              label="Show Source Snippets"
              description="Include brief excerpts from source documents"
              value={showSnippets}
              onChange={setShowSnippets}
            />

            <div className="pt-2">
              <label className="block text-xs text-white/50 mb-1.5">
                Custom System Prompt (Advanced)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="Leave blank to use the default grounded prompt..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-vault-500 focus:border-vault-500 transition-all"
              />
              <p className="text-xs text-white/25 mt-1.5">
                ⚠️ Overriding the system prompt may weaken grounding and injection defenses.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-vault-400" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Security settings are enforced at the system level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {securityItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="w-3.5 h-3.5" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
          value ? "bg-vault-600" : "bg-white/10"
        }`}
        role="switch"
        aria-checked={value}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? "translate-x-4.5" : ""
          }`}
        />
      </button>
    </div>
  );
}

const securityItems = [
  "AES-256-GCM encryption for all OAuth tokens",
  "Prompt injection detection on all user inputs",
  "Row-level tenant isolation enforced at query time",
  "Rate limiting: 20 chat requests / minute per IP",
  "Audit logs on all admin actions",
  "Retrieval-time classification filtering",
  "No raw source content returned to end users",
];
