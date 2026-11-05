"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type QueueDialogStatus = "pending" | "processing" | "failed" | "published" | "non_stem";

export interface QueueScrapeJob {
  id: string;
  source_id: string;
  source_name: string | null;
  job_url: string;
  title: string;
  location: string | null;
  error_message: string | null;
  attempts: number;
  queued_at: string | null;
  processed_at: string | null;
  status?: string;
  /** Present for the published view (join against scraped_job_sources). */
  job_slug?: string | null;
  job_id?: string | null;
}

interface QueueListResponse {
  items: QueueScrapeJob[];
  total: number;
  limit: number;
  offset: number;
  status?: string;
  error?: string;
}

type QueueScope =
  | { ids: string[] }
  | { source_id: string }
  | { all: true };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: QueueDialogStatus;
  sourceId?: string;
  sourceName?: string;
  onChanged: () => Promise<void> | void;
  /**
   * Queue API base. Defaults to the jobs scrape queue; the scholarship admin
   * page passes `/api/admin/scraper-sources/scholarships/queue` so one dialog
   * serves both pipelines (GET list + POST mutate are derived from it).
   */
  baseUrl?: string;
  /** Wording for the reviewed entity. Only the scholarship page overrides it. */
  entity?: QueueEntity;
}

const DEFAULT_QUEUE_BASE_URL = "/api/admin/scraper-sources/queue";

export interface QueueEntity {
  singular: string;
  plural: string;
  publishedTitle: string;
  publishedDescription: string;
  publishedEmpty: string;
  publishedLoading: string;
  publishedDeleteToast: (n: number) => string;
  /**
   * Prefix of the live detail page for published rows (jobs have public
   * pages). null = no in-app link yet, so the dialog links to the source.
   */
  publishedPathPrefix: string | null;
}

const JOB_ENTITY: QueueEntity = {
  singular: "job",
  plural: "jobs",
  publishedTitle: "Published scrape jobs",
  publishedDescription: "Queue rows that completed by publishing a job. View the live listing or the original source.",
  publishedEmpty: "No published jobs in the scrape queue yet.",
  publishedLoading: "Loading published jobs…",
  publishedDeleteToast: (n) => (n === 0 ? "No published rows were deleted" : `Deleted ${n} published queue row(s) — the jobs themselves stay live`),
  publishedPathPrefix: "/jobs/",
};

/**
 * Scholarship wording. Phase 1 publishes no public scholarship pages, so
 * `publishedPathPrefix` is null and the published view links to the source
 * page instead of an in-app detail page (Phase 2 flips this to "/scholarships/").
 */
export const SCHOLARSHIP_ENTITY: QueueEntity = {
  singular: "scholarship",
  plural: "scholarships",
  publishedTitle: "Published scholarships",
  publishedDescription: "Queue rows that completed by publishing a scholarship. View the original source page.",
  publishedEmpty: "No published scholarships in the queue yet.",
  publishedLoading: "Loading published scholarships…",
  publishedDeleteToast: (n) => (n === 0 ? "No published rows were deleted" : `Deleted ${n} published queue row(s) — the scholarships themselves stay live`),
  publishedPathPrefix: null,
};

const ENTITY_COPY_DEFAULTS = {
  pending: {
    description: (e: QueueEntity) => `Review listings waiting in the queue, or delete ones you do not want processed.`,
    empty: (e: QueueEntity) => `No pending ${e.plural} in the scrape queue.`,
    loading: (e: QueueEntity) => `Loading pending ${e.plural}…`,
    deleteToast: (e: QueueEntity, n: number) => (n === 0 ? `No pending ${e.plural} were deleted` : `Deleted ${n} pending ${e.plural}`),
  },
  processing: {
    description: (e: QueueEntity) => `Review in-flight or stuck items. Reclaim puts them back in the pending queue; delete removes them.`,
    empty: (e: QueueEntity) => `No ${e.plural} are currently processing.`,
    loading: (e: QueueEntity) => `Loading processing ${e.plural}…`,
    deleteToast: (e: QueueEntity, n: number) => (n === 0 ? `No processing ${e.plural} were deleted` : `Deleted ${n} processing ${e.plural}`),
  },
  failed: {
    description: (e: QueueEntity) => `Review the original listing, retry to put ${e.plural} back in the pending queue, or delete them from the queue.`,
    empty: (e: QueueEntity) => `No failed ${e.plural} in the scrape queue.`,
    loading: (e: QueueEntity) => `Loading failed ${e.plural}…`,
    deleteToast: (e: QueueEntity, n: number) => (n === 0 ? `No failed ${e.plural} were deleted` : `Deleted ${n} failed ${e.plural}`),
  },
} as const;

const PAGE_SIZE = 25;

interface QueueCopy {
  notesLabel: string;
  requeueLabel: string;
  requeueAllLabel: string;
  requeueToast: (noun: string, n: number) => string;
}

/**
 * Fixed per-status wording. Everything that names the reviewed entity lives in
 * `ENTITY_COPY_DEFAULTS` / `QueueEntity` so the scholarship page can reuse this
 * dialog without touching the jobs page (the jobs defaults stay as they were).
 */
const COPY: Record<QueueDialogStatus, QueueCopy> = {
  pending: {
    notesLabel: "Notes",
    requeueLabel: "Retry",
    requeueAllLabel: "Retry all",
    requeueToast: () => "",
  },
  processing: {
    notesLabel: "Notes",
    requeueLabel: "Reclaim",
    requeueAllLabel: "Reclaim all",
    requeueToast: (noun, n) =>
      n === 0
        ? `No processing ${noun} were reclaimed`
        : `Reclaimed ${n} ${noun} as pending — use Process queue to run them`,
  },
  failed: {
    notesLabel: "Error",
    requeueLabel: "Retry",
    requeueAllLabel: "Retry all",
    requeueToast: (noun, n) =>
      n === 0
        ? `No failed ${noun} were requeued`
        : `Requeued ${n} ${noun} as pending — use Process queue to run them`,
  },
  published: {
    notesLabel: "Published",
    requeueLabel: "",
    requeueAllLabel: "",
    requeueToast: () => "",
  },
  non_stem: {
    notesLabel: "Reason",
    requeueLabel: "",
    requeueAllLabel: "",
    requeueToast: () => "",
  },
};

/** Status → heading, parameterised by the reviewed entity. */
function titleFor(status: QueueDialogStatus, e: QueueEntity): string {
  if (status === "published") return e.publishedTitle;
  if (status === "non_stem") return "Screened out — non-chemistry";
  return `${status[0].toUpperCase()}${status.slice(1)} scrape ${e.plural}`;
}

function descriptionFor(status: QueueDialogStatus, e: QueueEntity): string {
  if (status === "published") return e.publishedDescription;
  if (status === "non_stem") {
    return `Processed ${e.plural} the chemistry gate rejected (marked done with 'outside chemistry focus'). Review them here if you suspect the filter missed something.`;
  }
  return ENTITY_COPY_DEFAULTS[status].description(e);
}

function emptyFor(status: QueueDialogStatus, e: QueueEntity): string {
  if (status === "published") return e.publishedEmpty;
  if (status === "non_stem") return `No ${e.plural} have been screened out as non-chemistry.`;
  return ENTITY_COPY_DEFAULTS[status].empty(e);
}

function loadingFor(status: QueueDialogStatus, e: QueueEntity): string {
  if (status === "published") return e.publishedLoading;
  if (status === "non_stem") return "Loading screened-out jobs…";
  return ENTITY_COPY_DEFAULTS[status].loading(e);
}

function deleteToastFor(status: QueueDialogStatus, e: QueueEntity, n: number): string {
  const noun = `${status} ${e.plural}`;
  if (status === "published") return e.publishedDeleteToast(n);
  if (status === "non_stem") {
    return n === 0 ? "No screened-out rows were deleted" : `Deleted ${n} screened-out queue row(s)`;
  }
  return ENTITY_COPY_DEFAULTS[status].deleteToast(e, n);
}

/** Done-derived views are read-only apart from deleting the queue row. */
function isDoneView(status: QueueDialogStatus): boolean {
  return status === "published" || status === "non_stem";
}

function statusNoun(status: QueueDialogStatus): string {
  if (status === "pending") return "pending";
  if (status === "processing") return "processing";
  if (status === "published") return "published";
  if (status === "non_stem") return "screened-out";
  return "failed";
}

export function ScrapeQueueJobsDialog({
  open,
  onOpenChange,
  status,
  sourceId,
  sourceName,
  onChanged,
  baseUrl = DEFAULT_QUEUE_BASE_URL,
  entity = JOB_ENTITY,
}: Props) {
  const copy = COPY[status];
  const noun = entity.plural;
  const doneView = isDoneView(status);
  const canRequeue = !doneView && status !== "pending";
  const apiStatus = status === "published" || status === "non_stem" ? "done" : status;
  const apiBucket = status === "published" ? "published" : status === "non_stem" ? "non_stem" : undefined;
  const [items, setItems] = useState<QueueScrapeJob[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<QueueScope | null>(null);

  const pageLabel = useMemo(() => {
    if (total === 0) return "0 of 0";
    const from = offset + 1;
    const to = Math.min(offset + items.length, total);
    return `${from}–${to} of ${total}`;
  }, [items.length, offset, total]);

  const fetchItems = useCallback(async (nextOffset = 0) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const params = new URLSearchParams({
        status: apiStatus,
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (apiBucket) params.set("bucket", apiBucket);
      if (sourceId) params.set("source_id", sourceId);

      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await response.json()) as QueueListResponse;
      if (!response.ok) throw new Error(body.error || `Failed to load ${statusNoun(status)} ${noun}`);

      setItems(body.items || []);
      setTotal(body.total || 0);
      setOffset(body.offset ?? nextOffset);
      setSelected(new Set());
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${statusNoun(status)} ${noun}`);
    } finally {
      setLoading(false);
    }
  }, [sourceId, status, apiStatus, apiBucket, baseUrl, noun]);

  useEffect(() => {
    if (!open) return;
    setOffset(0);
    setSelected(new Set());
    void fetchItems(0);
  }, [open, sourceId, status, fetchItems]);

  const mutate = async (action: "requeue" | "delete", scope: QueueScope) => {
    try {
      setActing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, status: apiStatus, ...scope }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `${action} failed`);

      const affected = typeof body.affected === "number" ? body.affected : 0;
      toast.success(
        action === "requeue" ? copy.requeueToast(noun, affected) : deleteToastFor(status, entity, affected)
      );

      await onChanged();
      await fetchItems(0);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setActing(false);
    }
  };

  const selectedIds = items.filter(item => selected.has(item.id)).map(item => item.id);
  const allOnPageSelected = items.length > 0 && items.every(item => selected.has(item.id));
  const heading = sourceName
    ? `${titleFor(status, entity)} — ${sourceName}`
    : sourceId
      ? `${titleFor(status, entity)} — ${sourceId}`
      : titleFor(status, entity);

  const deleteScopeLabel = (scope: QueueScope | null) => {
    if (!scope) return "";
    if ("ids" in scope) return `${scope.ids.length} selected ${noun}`;
    if ("source_id" in scope) return `all ${statusNoun(status)} ${noun} for ${sourceName || scope.source_id}`;
    return `all ${statusNoun(status)} ${noun}`;
  };

  const whenLabel = (item: QueueScrapeJob) => {
    if (status === "failed" && item.processed_at) {
      return `Failed ${new Date(item.processed_at).toLocaleString()}`;
    }
    if (doneView && item.processed_at) {
      return `Processed ${new Date(item.processed_at).toLocaleString()}`;
    }
    if (item.queued_at) return `Queued ${new Date(item.queued_at).toLocaleString()}`;
    return "";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{descriptionFor(status, entity)}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {canRequeue && (
              <Button
                variant="secondary"
                size="sm"
                disabled={acting || loading || selectedIds.length === 0}
                onClick={() => mutate("requeue", { ids: selectedIds })}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {copy.requeueLabel} selected{selectedIds.length ? ` · ${selectedIds.length}` : ""}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={acting || loading || selectedIds.length === 0}
              onClick={() => setConfirmDelete({ ids: selectedIds })}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete selected
            </Button>
            {canRequeue && (
              <Button
                variant="secondary"
                size="sm"
                disabled={acting || loading || total === 0}
                onClick={() => mutate("requeue", sourceId ? { source_id: sourceId } : { all: true })}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {copy.requeueAllLabel}{total ? ` · ${total}` : ""}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={acting || loading || total === 0}
              onClick={() => setConfirmDelete(sourceId ? { source_id: sourceId } : { all: true })}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete all
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">{pageLabel}</div>
          </div>

          <div className="overflow-auto border rounded-md min-h-[200px]">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingFor(status, entity)}
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">{emptyFor(status, entity)}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={(checked) => {
                          setSelected(checked ? new Set(items.map(item => item.id)) : new Set());
                        }}
                        aria-label={`Select all ${statusNoun(status)} ${noun} on this page`}
                      />
                    </TableHead>
                    <TableHead>{entity.singular[0].toUpperCase() + entity.singular.slice(1)}</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>{copy.notesLabel}</TableHead>
                    <TableHead>Tries</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={(checked) => {
                            setSelected(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            });
                          }}
                          aria-label={`Select ${item.title}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium truncate" title={item.title}>{item.title}</div>
                        {item.location && (
                          <div className="text-xs text-muted-foreground truncate">{item.location}</div>
                        )}
                        {status === "published" && item.job_slug && entity.publishedPathPrefix ? (
                          <a
                            href={`${entity.publishedPathPrefix}${item.job_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full"
                            title={`Open the published ChemistryLens ${entity.singular}`}
                          >
                            View {entity.singular}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <a
                            href={item.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full"
                            title={item.job_url}
                          >
                            Open listing
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{item.source_name || item.source_id}</div>
                        {item.source_name && (
                          <div className="text-xs text-muted-foreground font-mono">{item.source_id}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <div
                          className={`text-xs whitespace-pre-wrap break-words ${
                            status === "failed" ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          {item.error_message || (status === "failed" ? "No error message recorded" : "—")}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{whenLabel(item)}</div>
                      </TableCell>
                      <TableCell className="text-sm">{item.attempts}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canRequeue && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={acting}
                              onClick={() => mutate("requeue", { ids: [item.id] })}
                            >
                              {copy.requeueLabel}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={acting}
                            onClick={() => setConfirmDelete({ ids: [item.id] })}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || acting || offset === 0}
              onClick={() => fetchItems(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || acting || offset + items.length >= total}
              onClick={() => fetchItems(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(next) => { if (!next) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {statusNoun(status)} {noun}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteScopeLabel(confirmDelete)} from the queue. They will not be processed unless Discover finds them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={acting}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmDelete) return;
                const scope = confirmDelete;
                setConfirmDelete(null);
                void mutate("delete", scope);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
