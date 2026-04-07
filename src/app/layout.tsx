import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AskVault — Private Knowledge Chat",
    template: "%s | AskVault",
  },
  description:
    "A premium private knowledge assistant platform. Get grounded answers from your curated knowledge base.",
  robots: "noindex, nofollow",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className="font-sans antialiased bg-surface-900 text-white">
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast: "bg-surface-600 border border-white/10 text-white",
                error: "border-red-500/30 bg-red-500/10",
                success: "border-emerald-500/30 bg-emerald-500/10",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
