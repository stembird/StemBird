"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { PROCESS_QUEUE_BATCH_CAP } from "@/lib/scrapeProcessBatch";
import {
  ScrapeQueueJobsDialog,
  SCHOLARSHIP_ENTITY,
  type QueueDialogStatus,
} from "@/components/admin/ScrapeQueueJobsDialog";

/**
 * Scholarship scraping admin — the parallel twin of /dashboard/admin/scraper-sources.
 * Kept as its own page (rather than a tab on the jobs page) so the proven jobs
 * flow is never regressed by scholarship changes. Same pipeline shape:
 * discover → scholarship_queue → process (hard rules + chemistry gate) → publish.
 */

const SCHOLARSHIP_SOURCES_API = "/api/admin/scholarship-sources";
const SCHOLARSHIP_TOGGLE_API = "/api/admin/scraper-sources";
const SCHOLARSHIP_DISCOVER_API = "/api/admin/scraper-sources/scholarships/discover";
const SCHOLARSHIP_PROCESS_API = "/api/admin/scraper-sources/scholarships/process";
const SCHOLARSHIP_QUEUE_API = "/api/admin/scraper-sources/scholarships/queue";

/**
 * `integrations/supabase/types` is generated from the live database, so tables
 * added by an un-applied migration (`scholarships`) are not in its relation
 * union yet. This narrow helper is the single place that acknowledges that:
 * drop it once `supabase gen types` is re-run after the migration.
 */
function fromTable(table: string) {
  return (supabase as unknown as {
    from: (relation: string) => {
      select: (cols: string) => {
        order: (col: string, opts?: { ascending?: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  }).from(table);
}

interface QueueStats {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  /** Real published scholarships (scraped_scholarship_sources with scholarship_id). */
  published?: number;
  /** Done rows the chemistry gate screened out. */
  skipped_non_stem?: number;
  /** Done rows that were duplicates/expiries/eligibility skips. */
  other_done?: number;
}

interface ScholarshipSource {
  id: string;
  source_id: string;
  name: string;
  base_url: string;
  is_active: boolean | null;
  selectors: Record<string, unknown>;
  last_discovered_at: string | null;
  queue_stats: QueueStats;
}

interface ApiResponse {
  sources: ScholarshipSource[];
  totals: QueueStats;
  active_count: number;
}

interface PublishedScholarship {
  id: string;
  title: string;
  provider: string | null;
  application_deadline: string;
  academic_year: number | null;
  level: string[] | null;
  study_destination: string | null;
  status: string;
  source_url: string | null;
}

export default function AdminScholarshipSourcesPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [discoveringAll, setDiscoveringAll] = useState(false);
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);
  // Auto-loop controller, identical to the jobs page: one click drains the
  // whole queue, a second click stops after the in-flight batch.
  const processCancelRef = useRef(false);
  const [processProgress, setProcessProgress] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedScholarship[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [queueDialog, setQueueDialog] = useState<{
    status: QueueDialogStatus;
    sourceId?: string;
    sourceName?: string;
  } | null>(null);
  const busy =
    loading || discoveringAll || !!discoveringId || processingQueue;

  const fetchSources = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in as admin");
        return;
      }

      const response = await fetch(SCHOLARSHIP_SOURCES_API, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to load scholarship sources");

      setData(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load scholarship sources";
      toast.error(message);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  const fetchPublished = useCallback(async () => {
    try {
      setPublishedLoading(true);
      const { data: rows, error } = await fromTable("scholarships")
        .select(
          "id, title, provider, application_deadline, academic_year, level, study_destination, status, source_url"
        )
        .order("application_deadline", { ascending: true })
        .limit(100);
      if (error) throw error
      setPublished((rows || []) as unknown as PublishedScholarship[])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load published scholarships";
      toast.error(message);
    } finally {
      setPublishedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
    fetchPublished();
  }, [fetchSources, fetchPublished]);

  const refreshAll = useCallback(async (options?: { silent?: boolean }) => {
    await Promise.all([fetchSources(options), fetchPublished()]);
  }, [fetchSources, fetchPublished]);

  const toggleSource = async (sourceId: string, isActive: boolean) => {
    try {
      setTogglingId(sourceId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${SCHOLARSHIP_TOGGLE_API}/${sourceId}`, {
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

  /**
   * Auto-loop Process: keeps calling the scholarship process route (batches of
   * PROCESS_QUEUE_BATCH_CAP, each bounded by the server's 270s soft budget)
   * until the queue drains or the user cancels.
   */
  const runProcess = async () => {
    if (processingQueue) {
      processCancelRef.current = true;
      toast.message("Stopping after current batch…");
      return;
    }

    processCancelRef.current = false;
    setProcessingQueue(true);

    let totalProcessed = 0;
    let totalPublished = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Safety cap far above any realistic scholarship queue, guarding against a
    // runaway loop; real termination is processed===0 once the queue drains.
    const MAX_ROUNDS = 500;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        if (processCancelRef.current) break;

        // Re-read the session every round: a long drain outlives the ~1h access
        // token, and getSession() returns the auto-renewed one.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await fetch(SCHOLARSHIP_PROCESS_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ max: PROCESS_QUEUE_BATCH_CAP }),
        });

        const body = await parseJsonResponse(response);
        if (!response.ok) throw new Error(body.error || "Process failed");

        const processed: number = body.processed ?? 0;
        const publishedCount: number = body.published ?? 0;
        const skipped: number = body.skipped ?? 0;
        const errors: number = body.errors ?? 0;

        totalProcessed += processed;
        totalPublished += publishedCount;
        totalSkipped += skipped;
        totalErrors += errors;

        setProcessProgress(
          `Batch ${round + 1}: +${processed} processed (total ${totalProcessed})`
        );

        await refreshAll({ silent: true });

        // Only a batch that claimed nothing means the queue is genuinely empty;
        // a partial batch usually just hit the server's soft time budget.
        if (processed === 0) break;

        await new Promise(r => setTimeout(r, 1_000));
      }

      if (totalProcessed === 0) {
        toast.info("Process complete: scholarship queue was already empty");
      } else {
        const parts = [`Processed ${totalProcessed} scholarship(s)`];
        if (totalPublished > 0) parts.push(`${totalPublished} published`);
        if (totalSkipped > 0) parts.push(`${totalSkipped} skipped (dup/expired/off-topic/ineligible)`);
        if (totalErrors > 0) parts.push(`${totalErrors} errored`);
        const msg = parts.join(", ");
        if (totalErrors > 0) toast.warning(msg);
        else toast.success(msg);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Process failed";
      toast.error(message);
    } finally {
      setProcessingQueue(false);
      setProcessProgress(null);
      await refreshAll({ silent: true });
    }
  };

  const runDiscover = async (sourceId?: string) => {
    try {
      if (sourceId) setDiscoveringId(sourceId);
      else setDiscoveringAll(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(SCHOLARSHIP_DISCOVER_API, {
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

      if (!response.ok || body.success === false) {
        throw new Error(errorSummary)
      }

      const label = sourceId ? result?.source_id || sourceId : `${body.sources_processed} source(s)`;
      const found = typeof body.total_found === "number"
        ? body.total_found
        : results.reduce((sum, r) => sum + (r.found || 0), 0)
      const alreadyKnown = results.reduce((sum, r) => sum + (r.already_known || 0), 0)
      const queued = typeof body.total_queued === "number"
        ? body.total_queued
        : results.reduce((sum, r) => sum + (r.queued || 0), 0)
      const failedCount =
        typeof body.sources_failed === "number" ? body.sources_failed : failedResults.length

      if (queued > 0) {
        toast.success(
          `Discover queued ${queued} scholarship(s) for Process — ${alreadyKnown} already known, ${found} scanned (${label})`
        );
      } else if (found > 0) {
        toast.info(
          `Discover scanned ${found} listing(s); 0 new to Process (${alreadyKnown} already in queue/published) (${label})`
        );
      } else {
        toast.info(`Discover complete: no scholarship listings found (${label})`);
      }

      if (failedCount > 0) {
        toast.error(`Discover: ${failedCount} source(s) failed — ${errorSummary}`);
      }

      if (typeof body.stopped_early === "string" && body.stopped_early) {
        toast.message(body.stopped_early);
      }

      await refreshAll();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Discover failed";
      toast.error(message);
    } finally {
      setDiscoveringAll(false);
      setDiscoveringId(null);
    }
  };

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
          <h1 className="text-3xl font-bold">Scholarship Sources</h1>
          <p className="text-muted-foreground mt-1">
            Chemistry-relevant funding for Kenyan students, scraped on its own pipeline
            (own queue, own gate, own tables). Phase 1 is admin-only — no public pages yet.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => runDiscover()} disabled={busy}>
            {discoveringAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Discover all active
          </Button>
          <Button
            variant="secondary"
            onClick={runProcess}
            disabled={
              (busy && !processingQueue) ||
              (!processingQueue &&
                (data?.totals.pending ?? 0) === 0 &&
                (data?.totals.processing ?? 0) === 0)
            }
            title={
              processingQueue
                ? "Click to stop after the current batch"
                : (data?.totals.pending ?? 0) > 0
                  ? `Process ALL ${data?.totals.pending} pending scholarship(s) automatically (one click, batches of ${PROCESS_QUEUE_BATCH_CAP})`
                  : (data?.totals.processing ?? 0) > 0
                    ? `${data?.totals.processing} item(s) stuck in processing — click to reclaim & process`
                    : "Queue is empty — run Discover first (scanned ≠ queued)"
            }
          >
            {processingQueue ? (
              <Square className="h-4 w-4 mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {processingQueue
              ? processProgress ?? "Stopping after current batch…"
              : "Process queue (all)"}
            {!processingQueue && (data?.totals.pending ?? 0) > 0
              ? ` · ${data?.totals.pending}`
              : !processingQueue && (data?.totals.processing ?? 0) > 0
                ? ` · ${data?.totals.processing} stuck`
                : ""}
          </Button>
          <Button variant="outline" onClick={() => refreshAll()} disabled={busy}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        <StatCard
          label="Published"
          value={data?.totals.published ?? 0}
          emphasize={data?.totals.published ? "success" : undefined}
          hint="Click to list published scholarships"
          onClick={() => setQueueDialog({ status: "published" })}
        />
        <StatCard
          label="Non-chemistry screened"
          value={data?.totals.skipped_non_stem ?? 0}
          hint="Click to review chemistry-gate rejections"
          onClick={() => setQueueDialog({ status: "non_stem" })}
        />
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

      <Card>
        <CardHeader>
          <CardTitle>Configured scholarship sources</CardTitle>
          <CardDescription>
            Sources carry <code className="text-xs">content_type=&#39;scholarship&#39;</code>, so the
            jobs Discover ignores them and this page only ever sees these. Flow: discover →
            scholarship_queue → process (deadline + eligibility hard rules, then the chemistry gate)
            → publish. Seed rows arrive inactive and stay that way until a manual Discover verifies
            the selectors against the live site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading scholarship sources…
            </div>
          ) : (data?.sources || []).length === 0 ? (
            <p className="text-muted-foreground py-8">
              No scholarship sources. Run the latest Supabase migration
              (<code className="text-xs">20261106_create_scholarships_pipeline.sql</code>) to seed them.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Adapter</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Last discover</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.sources || []).map(source => {
                    const stats = source.queue_stats;

                    return (
                      <TableRow key={source.source_id}>
                        <TableCell>
                          <div className="font-medium">{source.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{source.source_id}</div>
                        </TableCell>
                        <TableCell>
                          {/* Scholarships are HTML listings only — no ATS/PDF adapters. */}
                          <Badge variant="secondary">HTML selectors</Badge>
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
                            <div>
                              <span className="text-muted-foreground">Published:</span>{" "}
                              {stats.published ? (
                                <button
                                  type="button"
                                  className="text-emerald-600 hover:underline"
                                  onClick={() =>
                                    setQueueDialog({
                                      status: "published",
                                      sourceId: source.source_id,
                                      sourceName: source.name,
                                    })
                                  }
                                >
                                  {stats.published} — view
                                </button>
                              ) : (
                                0
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Non-chemistry:</span>{" "}
                              {stats.skipped_non_stem ? (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:underline"
                                  onClick={() =>
                                    setQueueDialog({
                                      status: "non_stem",
                                      sourceId: source.source_id,
                                      sourceName: source.name,
                                    })
                                  }
                                >
                                  {stats.skipped_non_stem} — view
                                </button>
                              ) : (
                                0
                              )}
                            </div>
                            <div className="text-muted-foreground/80">
                              Done: {stats.done}
                              {stats.other_done ? ` · ${stats.other_done} dup/expired/skipped` : ""}
                            </div>
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

      <ScrapeQueueJobsDialog
        open={queueDialog !== null}
        onOpenChange={(open) => {
          if (!open) setQueueDialog(null);
        }}
        status={queueDialog?.status ?? "failed"}
        sourceId={queueDialog?.sourceId}
        sourceName={queueDialog?.sourceName}
        baseUrl={SCHOLARSHIP_QUEUE_API}
        entity={SCHOLARSHIP_ENTITY}
        onChanged={() => refreshAll({ silent: true })}
      />

      <Card>
        <CardHeader>
          <CardTitle>Published scholarships</CardTitle>
          <CardDescription>
            Latest 100 rows in <code className="text-xs">scholarships</code>, ordered by deadline —
            the deadline is what makes an award worth showing. A daily cron flips past-due rows to
            <code className="text-xs">expired</code>; Phase 2 will expose these on public pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publishedLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading published scholarships…
            </div>
          ) : published.length === 0 ? (
            <p className="text-muted-foreground py-8">
              Nothing published yet — activate a source, run Discover, then Process the queue.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scholarship</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {published.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[320px]">
                        <div className="font-medium truncate" title={item.title}>{item.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.provider || "Provider not detected"}
                          {item.academic_year ? ` · ${item.academic_year} intake` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {item.application_deadline}
                        {item.status !== "live" && (
                          <Badge variant="outline" className="ml-2 capitalize">{item.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(item.level || []).map(level => (
                            <Badge key={level} variant="secondary" className="text-xs">{level}</Badge>
                          ))}
                          {(item.level || []).length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.study_destination || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.source_url ? (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            View source
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seeded scholarship sources</CardTitle>
          <CardDescription>
            Seeded inactive by <code className="text-xs">20261106_create_scholarships_pipeline.sql</code>.
            Verify each with a manual Discover before switching it on.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>myjobmag-scholarships:</strong> <a href="https://www.myjobmag.co.ke/scholarships" target="_blank" rel="noopener noreferrer">myjobmag.co.ke/scholarships</a> — same site as the proven <code className="text-xs">myjobmag-kenya</code> job adapter, Drupal <code className="text-xs">views-row</code> listing.</p>
          <p><strong>scholarshipportal-ke:</strong> WordPress-style listing; selectors are best-guess until a Discover run confirms them.</p>
          <p><strong>helb:</strong> Higher Education Loans Board scholarship &amp; loan opportunities page (government funding for Kenyan students).</p>
          <p><strong>chevening-program:</strong> Chevening (UK Government) scholarship listing — annual cohorts are kept as separate records by the cohort-aware dedup hash.</p>
          <p><strong>Deadline doctrine:</strong> a scholarship with no parseable future deadline is <em>failed</em> (never defaulted to a guessed window like jobs), and an explicit &quot;not open to Kenyans&quot; signal skips it. The chemistry gate then rejects funding clearly outside chemistry/STEM.</p>
          <p><strong>Crons:</strong> discover 30 5 * * *, process every 15 minutes, expire-scholarships 30 2 * * * (see <code className="text-xs">vercel.json</code>).</p>
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
  emphasize?: "primary" | "warning" | "destructive" | "success";
  hint?: string;
}) {
  const interactive = typeof onClick === "function";
  const hoverClass =
    emphasize === "warning"
      ? "hover:border-amber-500/40 hover:bg-amber-500/5"
      : emphasize === "destructive"
        ? "hover:border-destructive/40 hover:bg-destructive/5"
        : emphasize === "success"
          ? "hover:border-emerald-500/40 hover:bg-emerald-500/5"
          : "hover:border-primary/40 hover:bg-primary/5";
  const valueClass =
    emphasize === "destructive" && value > 0
      ? "text-destructive"
      : emphasize === "warning" && value > 0
        ? "text-amber-600"
        : emphasize === "success" && value > 0
          ? "text-emerald-600"
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
  [key: string]: unknown
}> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 500 || response.status === 504 || response.status === 408) {
      throw new Error(
        `Request timed out or crashed on the server (HTTP ${response.status}). Try Discover on one source, or Process with fewer items. Check Vercel Runtime Logs if it keeps failing.`
      );
    }
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `Server returned non-JSON (HTTP ${response.status})${snippet ? `: ${snippet}` : ""}`
    );
  }
}
