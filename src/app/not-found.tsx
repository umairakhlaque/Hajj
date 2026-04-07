import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-vault flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-vault-600/10 border border-vault-500/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-vault-400/40" />
        </div>
        <h1 className="text-6xl font-bold text-white/10 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-white mb-3">Page not found</h2>
        <p className="text-white/40 text-sm mb-8">
          The page you are looking for does not exist or you may not have access.
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
