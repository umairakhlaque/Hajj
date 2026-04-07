// ============================================
// AskVault — Analytics Page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  TrendingUp,
  Search,
} from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  period: { days: number };
  overview: {
    totalSessions: number;
    totalMessages: number;
    groundedRate: number;
    thumbsUp: number;
    thumbsDown: number;
    reports: number;
    satisfactionRate: number | null;
  };
  topQueries: Array<{ query: string; count: number }>;
  recentSyncJobs: Array<{
    id: string;
    jobType: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics?days=30")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Conversations"
          value={data.overview.totalSessions}
          icon={MessageSquare}
          delay={0}
        />
        <StatsCard
          title="Grounded Rate"
          value={`${data.overview.groundedRate}%`}
          icon={TrendingUp}
          variant="success"
          delay={0.05}
        />
        <StatsCard
          title="Helpful Votes"
          value={data.overview.thumbsUp}
          icon={ThumbsUp}
          variant="gold"
          delay={0.1}
        />
        <StatsCard
          title="Reported Issues"
          value={data.overview.reports}
          icon={AlertTriangle}
          variant="warning"
          delay={0.15}
        />
      </div>

      {/* Satisfaction */}
      {data.overview.satisfactionRate !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${data.overview.satisfactionRate}%` }}
                />
              </div>
              <span className="text-lg font-bold text-white">
                {data.overview.satisfactionRate}%
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-white/30">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                {data.overview.thumbsUp} positive
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3 text-red-400" />
                {data.overview.thumbsDown} negative
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top queries */}
      {data.topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-vault-400" />
              Top Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topQueries.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-600/30 hover:bg-surface-600/50 transition-colors"
                >
                  <p className="text-sm text-white/70 truncate max-w-lg">{q.query}</p>
                  <Badge variant="ghost" className="ml-2 flex-shrink-0">
                    {q.count}×
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
