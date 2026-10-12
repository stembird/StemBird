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

export type QueueDialogStatus = "pending" | "processing" | "failed";

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
  status?: QueueDialogStatus;
}

interface QueueListResponse {
  items: QueueScrapeJob[];
  total: number;
  limit: number;
  offset: number;
  status?: QueueDialogStatus;
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
}

const PAGE_SIZE = 25;

const COPY: Record<
  QueueDialogStatus,
  {
    title: string;
    description: string;
    empty: string;
    loading: string;
    notesLabel: string;
    requeueLabel: string;
    requeueAllLabel: string;
    requeueToast: (n: number) => string;
    deleteToast: (n: number) => string;
  }
> = {
  pending: {
    title: "Pending scrape jobs",
    description: "Review listings waiting in the queue, or delete ones you do not want processed.",
    empty: "No pending jobs in the scrape queue.",
    loading: "Loading pending jobs…",
    notesLabel: "Notes",
    requeueLabel: "Retry",
    requeueAllLabel: "Retry all",
    requeueToast: () => "",
    deleteToast: (n) => (n === 0 ? "No pending jobs were deleted" : `Deleted ${n} pending job(s)`),
  },
  processing: {
    title: "Processing scrape jobs",
    description: "Review in-flight or stuck items. Reclaim puts them back in the pending queue; delete removes them.",
    empty: "No jobs are currently processing.",
    loading: "Loading processing jobs…",
    notesLabel: "Notes",
    requeueLabel: "Reclaim",
    requeueAllLabel: "Reclaim all",
    requeueToast: (n) =>
      n === 0
        ? "No processing jobs were reclaimed"
        : `Reclaimed ${n} job(s) as pending — use Process queue to run them`,
    deleteToast: (n) => (n === 0 ? "No processing jobs were deleted" : `Deleted ${n} processing job(s)`),
  },
  failed: {
    title: "Failed scrape jobs",
    description: "Review the original listing, retry to put jobs back in the pending queue, or delete them from the queue.",
    empty: "No failed jobs in the scrape queue.",
    loading: "Loading failed jobs…",
    notesLabel: "Error",
    requeueLabel: "Retry",
    requeueAllLabel: "Retry all",
    requeueToast: (n) =>
      n === 0
        ? "No failed jobs were requeued"
        : `Requeued ${n} job(s) as pending — use Process queue to run them`,
    deleteToast: (n) => (n === 0 ? "No failed jobs were deleted" : `Deleted ${n} failed job(s)`),
  },
};

function statusNoun(status: QueueDialogStatus): string {
  if (status === "pending") return "pending";
  if (status === "processing") return "processing";
  return "failed";
}

export function ScrapeQueueJobsDialog({
  open,
  onOpenChange,
  status,
  sourceId,
  sourceName,
  onChanged,
}: Props) {
  const copy = COPY[status];
  const canRequeue = status !== "pending";
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
        status,
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (sourceId) params.set("source_id", sourceId);

      const response = await fetch(`/api/admin/scraper-sources/queue?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await response.json()) as QueueListResponse;
      if (!response.ok) throw new Error(body.error || `Failed to load ${statusNoun(status)} jobs`);

      setItems(body.items || []);
      setTotal(body.total || 0);
      setOffset(body.offset ?? nextOffset);
      setSelected(new Set());
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${statusNoun(status)} jobs`);
    } finally {
      setLoading(false);
    }
  }, [sourceId, status]);

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

      const response = await fetch("/api/admin/scraper-sources/queue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, status, ...scope }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `${action} failed`);

      const affected = typeof body.affected === "number" ? body.affected : 0;
      toast.success(action === "requeue" ? copy.requeueToast(affected) : copy.deleteToast(affected));

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
    ? `${copy.title} — ${sourceName}`
    : sourceId
      ? `${copy.title} — ${sourceId}`
      : copy.title;

  const deleteScopeLabel = (scope: QueueScope | null) => {
    if (!scope) return "";
    if ("ids" in scope) return `${scope.ids.length} selected job(s)`;
    if ("source_id" in scope) return `all ${statusNoun(status)} jobs for ${sourceName || scope.source_id}`;
    return `all ${statusNoun(status)} jobs`;
  };

  const whenLabel = (item: QueueScrapeJob) => {
    if (status === "failed" && item.processed_at) {
      return `Failed ${new Date(item.processed_at).toLocaleString()}`;
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
            <DialogDescription>{copy.description}</DialogDescription>
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
                {copy.loading}
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">{copy.empty}</p>
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
                        aria-label={`Select all ${statusNoun(status)} jobs on this page`}
                      />
                    </TableHead>
                    <TableHead>Job</TableHead>
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
            <AlertDialogTitle>Delete {statusNoun(status)} job(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteScopeLabel(confirmDelete)} from the scrape queue. They will not be processed unless Discover finds them again.
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
