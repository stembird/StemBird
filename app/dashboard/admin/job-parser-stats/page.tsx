"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Zap,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  JobParserStatsDialog,
  type ParserDialogFilter,
} from "@/components/admin/JobParserStatsDialog";
import { parserJobTitle } from "@/lib/jobParserStats";
import type { Json } from "@/integrations/supabase/types";

interface JobStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface CacheStats {
  total: number;
  hitCount: number;
}

interface RecentJob {
  id: string;
  status: string;
  created_at: string;
  error_message: string | null;
  job_text: string;
  result: Json | null;
}

const JobParserStatsPage = () => {
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<ParserDialogFilter | null>(null);

  const fetchStats = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setIsLoading(true);

      const { data: jobs, error: jobError } = await supabase
        .from("job_parsing_queue")
        .select("status");

      if (jobError) throw jobError;

      const stats: JobStats = {
        total: jobs?.length || 0,
        pending: jobs?.filter(j => j.status === "pending").length || 0,
        processing: jobs?.filter(j => j.status === "processing").length || 0,
        completed: jobs?.filter(j => j.status === "completed").length || 0,
        failed: jobs?.filter(j => j.status === "failed").length || 0,
      };
      setJobStats(stats);

      const { data: cache, error: cacheError } = await supabase
        .from("ai_response_cache")
        .select("hit_count");

      if (cacheError) throw cacheError;

      setCacheStats({
        total: cache?.length || 0,
        hitCount: cache?.reduce((sum, row) => sum + (row.hit_count || 0), 0) || 0,
      });

      const { data: recent, error: recentError } = await supabase
        .from("job_parsing_queue")
        .select("id, status, created_at, error_message, job_text, result")
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentError) throw recentError;
      setRecentJobs((recent || []) as RecentJob[]);
    } catch (error: unknown) {
      console.error("Failed to fetch stats:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load statistics");
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/parse-job/process-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 5 }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Queue processing triggered");
        await fetchStats({ silent: true });
      } else {
        throw new Error(result.error || "Process failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to process queue");
    } finally {
      setIsProcessing(false);
    }
  };

  const cleanupCache = async () => {
    try {
      const response = await fetch("/api/cron/cleanup-cache", { method: "POST" });
      const result = await response.json();
      if (result.success) {
        toast.success("Cache cleanup completed");
        await fetchStats({ silent: true });
      } else {
        throw new Error(result.error || "Cleanup failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to cleanup cache");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 shrink-0 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center px-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:py-8 space-y-6">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Job Parser Statistics</h1>
        <p className="text-muted-foreground">
          Monitor the AI job parsing queue. Click a stat to review, retry, or delete those items.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button onClick={() => fetchStats()} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Stats
        </Button>
        <Button onClick={processQueue} disabled={isProcessing} className="w-full sm:w-auto">
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Process Queue
        </Button>
        <Button onClick={cleanupCache} variant="outline" className="w-full sm:w-auto">
          <Database className="mr-2 h-4 w-4" />
          Cleanup Cache
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total Jobs"
          value={jobStats?.total || 0}
          hint={(jobStats?.total || 0) > 0 ? "Click to review" : undefined}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          onClick={(jobStats?.total || 0) > 0 ? () => setDialogFilter("all") : undefined}
        />
        <StatCard
          label="Pending"
          value={jobStats?.pending || 0}
          valueClass="text-yellow-600"
          hint={(jobStats?.pending || 0) > 0 ? "Click to review or delete" : undefined}
          icon={<Clock className="h-4 w-4 text-yellow-500" />}
          hover="warning"
          onClick={(jobStats?.pending || 0) > 0 ? () => setDialogFilter("pending") : undefined}
        />
        <StatCard
          label="Processing"
          value={jobStats?.processing || 0}
          valueClass="text-blue-600"
          hint={(jobStats?.processing || 0) > 0 ? "Click to review or requeue" : undefined}
          icon={<Loader2 className="h-4 w-4 text-blue-500" />}
          hover="primary"
          onClick={(jobStats?.processing || 0) > 0 ? () => setDialogFilter("processing") : undefined}
        />
        <StatCard
          label="Completed"
          value={jobStats?.completed || 0}
          valueClass="text-green-600"
          hint={(jobStats?.completed || 0) > 0 ? "Click to review or delete" : undefined}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          hover="success"
          onClick={(jobStats?.completed || 0) > 0 ? () => setDialogFilter("completed") : undefined}
        />
        <StatCard
          label="Failed"
          value={jobStats?.failed || 0}
          valueClass={(jobStats?.failed || 0) > 0 ? "text-destructive" : undefined}
          hint={(jobStats?.failed || 0) > 0 ? "Click to review, retry, or delete" : undefined}
          icon={<XCircle className="h-4 w-4 text-red-500" />}
          hover="destructive"
          onClick={(jobStats?.failed || 0) > 0 ? () => setDialogFilter("failed") : undefined}
        />
        <StatCard
          label="Cache Entries"
          value={cacheStats?.total || 0}
          valueClass="text-blue-600"
          hint={`${cacheStats?.hitCount || 0} total hits${(cacheStats?.total || 0) > 0 ? " — click to review" : ""}`}
          icon={<Database className="h-4 w-4 text-blue-500" />}
          hover="primary"
          onClick={(cacheStats?.total || 0) > 0 ? () => setDialogFilter("cache") : undefined}
        />
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Latest 10 job parsing requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No jobs found</p>
            ) : (
              recentJobs.map(job => (
                <div
                  key={job.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {getStatusIcon(job.status)}
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {parserJobTitle(job.job_text, job.result, job.id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                      {job.error_message && (
                        <p className="mt-1 text-xs text-destructive break-words whitespace-pre-wrap">
                          {job.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(job.status)}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <JobParserStatsDialog
        open={dialogFilter !== null}
        onOpenChange={(open) => {
          if (!open) setDialogFilter(null);
        }}
        filter={dialogFilter ?? "all"}
        onChanged={() => fetchStats({ silent: true })}
      />
    </div>
  );
};

function StatCard({
  label,
  value,
  hint,
  icon,
  valueClass,
  hover,
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: ReactNode;
  valueClass?: string;
  hover?: "primary" | "warning" | "success" | "destructive";
  onClick?: () => void;
}) {
  const interactive = typeof onClick === "function";
  const hoverClass =
    hover === "warning"
      ? "hover:border-yellow-500/40 hover:bg-yellow-500/5"
      : hover === "success"
        ? "hover:border-green-500/40 hover:bg-green-500/5"
        : hover === "destructive"
          ? "hover:border-destructive/40 hover:bg-destructive/5"
          : "hover:border-primary/40 hover:bg-primary/5";

  return (
    <Card
      className={`min-w-0 ${
        interactive
          ? `cursor-pointer transition-colors ${hoverClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
          : ""
      }`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium leading-tight">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className={`text-xl sm:text-2xl font-bold ${valueClass || ""}`}>{value}</div>
        {hint ? <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default JobParserStatsPage;
