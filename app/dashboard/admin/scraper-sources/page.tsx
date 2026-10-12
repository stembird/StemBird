"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Landmark,
  Loader2,
  Play,
  RefreshCw,
  Rss,
  Building2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PROCESS_QUEUE_BATCH } from "@/lib/scrapeProcessBatch";
import { ScrapeQueueJobsDialog, type QueueDialogStatus } from "@/components/admin/ScrapeQueueJobsDialog";
import {
  ADAPTER_LABELS,
  CATEGORY_LABELS,
  getAdapterType,
  getSourceCategory,
  ScraperSourceCategory,
} from "@/lib/scraperSourceMeta";

interface QueueStats {
  pending: number;
  processing: number;
  done: number;
  failed: number;
}

interface ScraperSource {
  id: string;
  source_id: string;
  name: string;
  base_url: string;
  is_active: boolean | null;
  selectors: Record<string, unknown>;
  last_discovered_at: string | null;
  created_at: string | null;
  queue_stats: QueueStats;
}

interface ApiResponse {
  sources: ScraperSource[];
  totals: QueueStats;
  active_count: number;
}

const CATEGORY_ICONS: Record<ScraperSourceCategory, typeof Globe> = {
  government: Landmark,
  employer: Building2,
  ngo: Globe,
  other: Rss,
};

export default function AdminScraperSourcesPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [discoveringAll, setDiscoveringAll] = useState(false);
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ScraperSourceCategory>("all");
  const [queueDialog, setQueueDialog] = useState<{
    status: QueueDialogStatus;
    sourceId?: string;
    sourceName?: string;
  } | null>(null);
  const busy =
    loading ||
    discoveringAll ||
    !!discoveringId ||
    processingQueue ||
    enrichingAll ||
    !!enrichingId;

  const fetchSources = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in as admin");
        return;
      }

      const response = await fetch("/api/admin/scraper-sources", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to load sources");

      setData(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load sources";
      toast.error(message);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const toggleSource = async (sourceId: string, isActive: boolean) => {
    try {
      setTogglingId(sourceId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`/api/admin/scraper-sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Update failed");

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sources: prev.sources.map(source =>
            source.source_id === sourceId ? { ...source, is_active: isActive } : source
          ),
          active_count: prev.sources.filter(s =>
            s.source_id === sourceId ? isActive : !!s.is_active
          ).length,
        };
      });

      toast.success(isActive ? "Source activated" : "Source paused");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Update failed";
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  const runProcess = async (max = PROCESS_QUEUE_BATCH) => {
    try {
      setProcessingQueue(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/scraper-sources/process", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ max }),
      });

      const body = await parseJsonResponse(response);
      if (!response.ok) throw new Error(body.error || "Process failed");

      if (body.processed === 0) {
        toast.info("Process complete: no pending jobs in queue");
      } else if (typeof body.published === "number" && body.published > 0) {
        toast.success(
          `Published ${body.published} job(s) from ${body.processed} queue item(s)` +
            (typeof body.skipped === "number" && body.skipped > 0
              ? ` (${body.skipped} duplicate(s) skipped)`
              : "")
        );
      } else if (typeof body.errors === "number" && body.errors > 0) {
        toast.error(`Process failed for ${body.errors} item(s) — check queue stats`);
      } else {
        toast.info(`Processed ${body.processed} item(s); nothing new published`);
      }

      if (typeof body.stopped_early === "string" && body.stopped_early) {
        toast.message(body.stopped_early);
      }

      await fetchSources();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Process failed";
      toast.error(message);
    } finally {
      setProcessingQueue(false);
    }
  };

  // Note: Enrich with AI uses /api/admin/scraper-sources/reenrich so Gemini keys
  // stay on the Vercel server and never ship to the browser.

  const runDiscover = async (sourceId?: string) => {
    try {
      if (sourceId) setDiscoveringId(sourceId);
      else setDiscoveringAll(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/scraper-sources/discover", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sourceId ? { source_id: sourceId } : {}),
      });

      const body = await parseJsonResponse(response);

      const results = (body.results || []) as Array<{
        source_id?: string
        found?: number
        queued?: number
        already_known?: number
        error?: string | null
      }>
      const result = sourceId
        ? results.find(r => r.source_id === sourceId) || results[0]
        : results[0]
      const failedResults = results.filter(r => r.error)
      const errorSummary =
        typeof body.error_summary === "string" && body.error_summary
          ? body.error_summary
          : failedResults.length > 0
            ? failedResults
                .slice(0, 3)
                .map(r => `${r.source_id}: ${r.error}`)
                .join("; ") +
              (failedResults.length > 3 ? `; +${failedResults.length - 3} more` : "")
            : body.error || "Discover failed"

      // Full failure (HTTP 502 / success:false) — don't pretend it completed.
      if (!response.ok || body.success === false) {
        throw new Error(errorSummary)
      }

      const label = sourceId
        ? result?.source_id || sourceId
        : `${body.sources_processed} source(s)`;
      const found = typeof body.total_found === "number"
        ? body.total_found
        : results.reduce((sum, r) => sum + (r.found || 0), 0)
      const alreadyKnown = results.reduce((sum, r) => sum + (r.already_known || 0), 0)
      const queued = typeof body.total_queued === "number"
        ? body.total_queued
        : results.reduce((sum, r) => sum + (r.queued || 0), 0)
      const failedCount =
        typeof body.sources_failed === "number" ? body.sources_failed : failedResults.length
      const detail =
        found > 0
          ? `${queued} new queued, ${alreadyKnown} already known, ${found} scanned`
          : `${queued} new queued`

      if (queued > 0) {
        toast.success(
          `Discover queued ${queued} job(s) for Process — ${alreadyKnown} already known, ${found} scanned (${label})`
        );
      } else if (found > 0) {
        toast.info(
          `Discover scanned ${found} listing(s); 0 new to Process (${alreadyKnown} already in queue/published) (${label})`
        );
      } else {
        toast.info(`Discover complete: no listings found (${label})`);
      }

      if (failedCount > 0) {
        toast.error(
          `Discover: ${failedCount} source(s) failed — ${errorSummary}`
        );
      }

      if (typeof body.stopped_early === "string" && body.stopped_early) {
        toast.message(body.stopped_early);
      }

      await fetchSources();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Discover failed";
      toast.error(message);
    } finally {
      setDiscoveringAll(false);
      setDiscoveringId(null);
    }
  };

  /** Normalize + AI-enrich published scraped jobs using production Gemini keys. */
  const runEnrich = async (sourceId?: string) => {
    try {
      if (sourceId) setEnrichingId(sourceId);
      else setEnrichingAll(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/scraper-sources/reenrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          sourceId ? { source_id: sourceId, limit: 10 } : { limit: 5 }
        ),
      });

      const body = await parseJsonResponse(response);
      if (!response.ok) throw new Error(body.error || "Enrich failed");

      const label = sourceId || "recent published scraped jobs";
      const updated = typeof body.updated === "number" ? body.updated : 0;
      const failed = typeof body.failed === "number" ? body.failed : 0;
      const examined = typeof body.examined === "number" ? body.examined : 0;

      if (body.ai_keys_configured === false) {
        toast.warning(
          "AI keys missing on server — ran rule-based normalize only. Check Vercel DEEPSEEK_API_KEY / GEMINI_API_KEY."
        );
      }

      if (examined === 0) {
        toast.info(`Enrich complete: no published scraped jobs found (${label})`);
      } else if (updated > 0 && failed === 0) {
        toast.success(
          `Enriched ${updated} job(s) with AI normalize for ${label}`
        );
      } else if (updated > 0) {
        toast.message(
          `Enriched ${updated} job(s); ${failed} failed (${label})`
        );
      } else if (failed > 0) {
        toast.error(`Enrich failed for ${failed} job(s) (${label})`);
      } else {
        toast.info(`Enrich complete: examined ${examined}, nothing updated (${label})`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Enrich failed";
      toast.error(message);
    } finally {
      setEnrichingAll(false);
      setEnrichingId(null);
    }
  };

  /** Enrich sparse jobs from ANY intake path (manual, scrape, n8n, parse-job…). */
  const runEnrichSparseAll = async () => {
    try {
      setEnrichingAll(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/jobs/enrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ missing_only: true, limit: 10 }),
      });

      const body = await parseJsonResponse(response);
      if (!response.ok) throw new Error(body.error || "Enrich failed");

      const updated = typeof body.updated === "number" ? body.updated : 0;
      const failed = typeof body.failed === "number" ? body.failed : 0;
      const examined = typeof body.examined === "number" ? body.examined : 0;

      if (examined === 0) {
        toast.info("No sparse active jobs needed enrichment");
      } else if (updated > 0) {
        toast.success(
          `Enriched ${updated}/${examined} sparse job(s) from any source` +
            (failed ? ` (${failed} failed)` : "")
        );
      } else {
        toast.info(`Examined ${examined} sparse job(s); nothing updated`);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Enrich failed");
    } finally {
      setEnrichingAll(false);
    }
  };

  const filteredSources = (data?.sources || []).filter(source => {
    if (filter === "all") return true;
    return getSourceCategory(source.selectors) === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Scraper Sources</h1>
          <p className="text-muted-foreground mt-1">
            Kenyan government portals and employer ATS feeds ingested into CareerSasa.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => runDiscover()}
            disabled={busy}
          >
            {discoveringAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Discover all active
          </Button>
          <Button
            variant="secondary"
            onClick={() => runProcess(PROCESS_QUEUE_BATCH)}
            disabled={
              busy ||
              ((data?.totals.pending ?? 0) === 0 &&
                (data?.totals.processing ?? 0) === 0)
            }
            title={
              (data?.totals.pending ?? 0) > 0
                ? `Process up to ${PROCESS_QUEUE_BATCH} of ${data?.totals.pending} pending queue items`
                : (data?.totals.processing ?? 0) > 0
                  ? `${data?.totals.processing} item(s) stuck in processing — click to reclaim & process`
                  : "Queue is empty — run Discover first (scanned ≠ queued)"
            }
          >
            {processingQueue ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Process queue ({PROCESS_QUEUE_BATCH})
            {(data?.totals.pending ?? 0) > 0
              ? ` · ${data?.totals.pending}`
              : (data?.totals.processing ?? 0) > 0
                ? ` · ${data?.totals.processing} stuck`
                : ""}
          </Button>
          <Button
            variant="default"
            onClick={() => runEnrich()}
            disabled={busy}
            title="Normalize + AI-enrich the latest published scraped jobs using production Gemini keys"
          >
            {enrichingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Enrich scraped
          </Button>
          <Button
            variant="secondary"
            onClick={() => runEnrichSparseAll()}
            disabled={busy}
            title="AI-enrich sparse active jobs from ANY intake path (manual, scrape, n8n, parse-job)"
          >
            {enrichingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Enrich any sparse
          </Button>
          <Button variant="outline" onClick={() => fetchSources()} disabled={busy}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Active sources" value={data?.active_count ?? 0} />
        <StatCard
          label="Queue pending"
          value={data?.totals.pending ?? 0}
          emphasize={data?.totals.pending ? "primary" : undefined}
          hint={(data?.totals.pending ?? 0) > 0 ? "Click to review or delete" : undefined}
          onClick={
            (data?.totals.pending ?? 0) > 0
              ? () => setQueueDialog({ status: "pending" })
              : undefined
          }
        />
        <StatCard
          label="Processing"
          value={data?.totals.processing ?? 0}
          emphasize={data?.totals.processing ? "warning" : undefined}
          hint={(data?.totals.processing ?? 0) > 0 ? "Click to review, reclaim, or delete" : undefined}
          onClick={
            (data?.totals.processing ?? 0) > 0
              ? () => setQueueDialog({ status: "processing" })
              : undefined
          }
        />
        <StatCard label="Published (done)" value={data?.totals.done ?? 0} />
        <StatCard
          label="Failed"
          value={data?.totals.failed ?? 0}
          emphasize={data?.totals.failed ? "destructive" : undefined}
          hint={(data?.totals.failed ?? 0) > 0 ? "Click to review, retry, or delete" : undefined}
          onClick={
            (data?.totals.failed ?? 0) > 0
              ? () => setQueueDialog({ status: "failed" })
              : undefined
          }
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="government">Government</TabsTrigger>
          <TabsTrigger value="employer">Employers</TabsTrigger>
          <TabsTrigger value="ngo">NGO</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured sources</CardTitle>
              <CardDescription>
                Active sources are discovered on a Vercel cron (every 6 hours) and the
                queue is processed every 30 minutes. Flow: discover → queue → process → publish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading sources…
                </div>
              ) : filteredSources.length === 0 ? (
                <p className="text-muted-foreground py-8">
                  No sources in this category. Run the latest Supabase migration to seed Kenyan sources.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Adapter</TableHead>
                        <TableHead>Queue</TableHead>
                        <TableHead>Last discover</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSources.map(source => {
                        const adapter = getAdapterType(source.selectors);
                        const category = getSourceCategory(source.selectors);
                        const CategoryIcon = CATEGORY_ICONS[category];
                        const stats = source.queue_stats;

                        return (
                          <TableRow key={source.source_id}>
                            <TableCell>
                              <div className="font-medium">{source.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{source.source_id}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <CategoryIcon className="h-3 w-3" />
                                {CATEGORY_LABELS[category]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{ADAPTER_LABELS[adapter]}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                {stats.pending > 0 ? (
                                  <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() =>
                                      setQueueDialog({
                                        status: "pending",
                                        sourceId: source.source_id,
                                        sourceName: source.name,
                                      })
                                    }
                                  >
                                    Pending: {stats.pending} — review
                                  </button>
                                ) : (
                                  <div><span className="text-muted-foreground">Pending:</span> {stats.pending}</div>
                                )}
                                {stats.processing > 0 && (
                                  <button
                                    type="button"
                                    className="text-amber-600 hover:underline"
                                    onClick={() =>
                                      setQueueDialog({
                                        status: "processing",
                                        sourceId: source.source_id,
                                        sourceName: source.name,
                                      })
                                    }
                                  >
                                    Processing: {stats.processing} — review
                                  </button>
                                )}
                                <div><span className="text-muted-foreground">Done:</span> {stats.done}</div>
                                {stats.failed > 0 && (
                                  <button
                                    type="button"
                                    className="text-destructive hover:underline"
                                    onClick={() =>
                                      setQueueDialog({
                                        status: "failed",
                                        sourceId: source.source_id,
                                        sourceName: source.name,
                                      })
                                    }
                                  >
                                    Failed: {stats.failed} — review
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {source.last_discovered_at
                                ? new Date(source.last_discovered_at).toLocaleString()
                                : "Never"}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={!!source.is_active}
                                disabled={togglingId === source.source_id}
                                onCheckedChange={(checked) => toggleSource(source.source_id, checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!source.is_active || busy}
                                  onClick={() => runDiscover(source.source_id)}
                                >
                                  {discoveringId === source.source_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" />
                                      Discover
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy || stats.done === 0}
                                  onClick={() => runEnrich(source.source_id)}
                                  title="Normalize + AI-enrich published jobs from this source"
                                >
                                  {enrichingId === source.source_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Enrich
                                    </>
                                  )}
                                </Button>
                                <a
                                  href={source.base_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-primary hover:underline px-2"
                                >
                                  Visit
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScrapeQueueJobsDialog
        open={queueDialog !== null}
        onOpenChange={(open) => {
          if (!open) setQueueDialog(null);
        }}
        status={queueDialog?.status ?? "failed"}
        sourceId={queueDialog?.sourceId}
        sourceName={queueDialog?.sourceName}
        onChanged={() => fetchSources({ silent: true })}
      />

      <Card>
        <CardHeader>
          <CardTitle>Seeded Kenyan sources</CardTitle>
          <CardDescription>
            Included in migrations <code className="text-xs">20260715_combined_kenyan_scraper_sources.sql</code>
            {', '}
            <code className="text-xs">20260720_seed_brightermonday_scraper_source.sql</code>
            {', '}
            <code className="text-xs">20260722_seed_fuzu_scraper_source.sql</code>
            {' '}and <code className="text-xs">20260722_seed_myjobmag_scraper_source.sql</code>
            {', '}
            <code className="text-xs">20260728_bump_myjobmag_max_pages.sql</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Government (full detail):</strong> PSC PDF adverts from <a href="https://www.publicservice.go.ke/jobs/" target="_blank" rel="noopener noreferrer">publicservice.go.ke/jobs</a> — duties, qualifications, salary scales</p>
          <p><strong>Government (listing backup):</strong> PSC portal table on psckjobs.go.ke (paused when PDF source is active)</p>
          <p><strong>NGO:</strong> Amref Health Africa (SmartRecruiters, Kenya filter)</p>
          <p><strong>Employers:</strong> Inkomoko (Workable), SALIX Data Africa, Digital Divide Data (SmartRecruiters, Kenya filter)</p>
          <p><strong>Batch A (verified):</strong> PowerGen Renewable Energy, iHub (SmartRecruiters). Workable pipeline (paused): Tala, Branch, KCB, Komaza, Sanergy, Copia, Apollo</p>
          <p><strong>Job boards:</strong> BrighterMonday Kenya, Fuzu Kenya, and MyJobMag Kenya (JSON-LD / HTML). Employer apply link/email from the posting is preferred; the board listing URL is only used as a last resort. Fuzu and MyJobMag also copy hiring-company logo, about, website, size, and location from the portal company tab into CareerSasa company pages when those fields are empty. MyJobMag discover also walks <code className="text-xs">/jobs-by-date/today</code> and <code className="text-xs">/yesterday</code> so same-day posts are not missed between main-listing bumps.</p>
          <p><strong>Discover tip:</strong> Toast &quot;scanned&quot; is listings seen on the board; only <em>queued</em> rows enable Process. Already-known URLs (in queue or published) are skipped — expected after a backlog drain. If Process stays disabled after a successful queue toast, click Refresh (stats now page past the 1000-row Supabase cap). Cron discover runs every 6 hours — for a large MyJobMag wave, run Discover on <code className="text-xs">myjobmag-kenya</code> manually, then Process / drain the queue.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  onClick,
  emphasize,
  hint,
}: {
  label: string;
  value: number;
  onClick?: () => void;
  emphasize?: "primary" | "warning" | "destructive";
  hint?: string;
}) {
  const interactive = typeof onClick === "function";
  const hoverClass =
    emphasize === "warning"
      ? "hover:border-amber-500/40 hover:bg-amber-500/5"
      : emphasize === "primary"
        ? "hover:border-primary/40 hover:bg-primary/5"
        : "hover:border-destructive/40 hover:bg-destructive/5";
  const valueClass =
    emphasize === "destructive" && value > 0
      ? "text-destructive"
      : emphasize === "warning" && value > 0
        ? "text-amber-600"
        : "";
  return (
    <Card
      className={
        interactive
          ? `cursor-pointer transition-colors ${hoverClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
          : undefined
      }
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
      <CardContent className="pt-6">
        <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

async function parseJsonResponse(response: Response): Promise<{
  error?: string
  processed?: number
  published?: number
  skipped?: number
  errors?: number
  stopped_early?: string | null
  total_queued?: number
  sources_processed?: number
  results?: unknown[]
  updated?: number
  failed?: number
  examined?: number
  ai_keys_configured?: boolean
  [key: string]: unknown
}> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 500 || response.status === 504 || response.status === 408) {
      throw new Error(
        `Request timed out or crashed on the server (HTTP ${response.status}). Try Discover on one source, or Process Queue with fewer items. Check Vercel Runtime Logs if it keeps failing.`
      );
    }
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `Server returned non-JSON (HTTP ${response.status})${snippet ? `: ${snippet}` : ""}`
    );
  }
}
