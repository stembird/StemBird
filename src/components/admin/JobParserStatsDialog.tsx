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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { parserJobTitle } from "@/lib/jobParserStats";

export type ParserDialogFilter = "all" | "pending" | "processing" | "completed" | "failed" | "cache";

interface ParserJobRow {
  id: string;
  status: string;
  created_at: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number | null;
  job_text: string;
  result: Json | null;
}

interface CacheRow {
  id: string;
  input_text: string;
  model_used: string;
  hit_count: number | null;
  created_at: string;
  expires_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: ParserDialogFilter;
  onChanged: () => Promise<void> | void;
}

const PAGE_SIZE = 25;

const COPY: Record<ParserDialogFilter, { title: string; description: string; empty: string }> = {
  all: {
    title: "All parser jobs",
    description: "Every job in the AI parsing queue. Review the text, retry failed items, or delete.",
    empty: "No parser jobs found.",
  },
  pending: {
    title: "Pending parser jobs",
    description: "Waiting to be parsed. Delete ones you do not want processed, or use Process Queue.",
    empty: "No pending parser jobs.",
  },
  processing: {
    title: "Processing parser jobs",
    description: "In-flight or stuck items. Requeue puts them back to pending; delete removes them.",
    empty: "No parser jobs are currently processing.",
  },
  completed: {
    title: "Completed parser jobs",
    description: "Successfully parsed jobs. Review the extracted title or delete old rows.",
    empty: "No completed parser jobs.",
  },
  failed: {
    title: "Failed parser jobs",
    description: "Review the error, retry to put jobs back in the pending queue, or delete them.",
    empty: "No failed parser jobs.",
  },
  cache: {
    title: "AI response cache",
    description: "Cached parse responses. Review the input preview or delete entries.",
    empty: "No cache entries.",
  },
};

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "processing") return "secondary";
  return "outline";
}

export function JobParserStatsDialog({ open, onOpenChange, filter, onChanged }: Props) {
  const copy = COPY[filter];
  const isCache = filter === "cache";
  const [jobs, setJobs] = useState<ParserJobRow[]>([]);
  const [cache, setCache] = useState<CacheRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<"selected" | "all" | null>(null);

  const items = isCache ? cache : jobs;
  const pageLabel = useMemo(() => {
    if (total === 0) return "0 of 0";
    const from = offset + 1;
    const to = Math.min(offset + items.length, total);
    return `${from}–${to} of ${total}`;
  }, [items.length, offset, total]);

  const fetchPage = useCallback(async (nextOffset = 0) => {
    try {
      setLoading(true);
      if (filter === "cache") {
        const { data, error, count } = await supabase
          .from("ai_response_cache")
          .select("id, input_text, model_used, hit_count, created_at, expires_at", { count: "exact" })
          .order("hit_count", { ascending: false })
          .order("created_at", { ascending: false })
          .range(nextOffset, nextOffset + PAGE_SIZE - 1);
        if (error) throw error;
        setCache(data || []);
        setJobs([]);
        setTotal(count ?? 0);
      } else {
        let query = supabase
          .from("job_parsing_queue")
          .select(
            "id, status, created_at, error_message, started_at, completed_at, retry_count, job_text, result",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(nextOffset, nextOffset + PAGE_SIZE - 1);
        if (filter !== "all") query = query.eq("status", filter);
        const { data, error, count } = await query;
        if (error) throw error;
        setJobs((data || []) as ParserJobRow[]);
        setCache([]);
        setTotal(count ?? 0);
      }
      setOffset(nextOffset);
      setSelected(new Set());
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!open) return;
    setOffset(0);
    setSelected(new Set());
    void fetchPage(0);
  }, [open, filter, fetchPage]);

  const selectedIds = items.filter(item => selected.has(item.id)).map(item => item.id);
  const allOnPageSelected = items.length > 0 && items.every(item => selected.has(item.id));

  const retryJobs = async (ids: string[]) => {
    if (ids.length === 0) return;
    setActing(true);
    try {
      const { error } = await supabase
        .from("job_parsing_queue")
        .update({
          status: "pending",
          error_message: null,
          started_at: null,
          completed_at: null,
        })
        .in("id", ids)
        .in("status", ["failed", "processing"]);
      if (error) throw error;
      toast.success(`Requeued ${ids.length} job(s) as pending — use Process Queue to run them`);
      await onChanged();
      await fetchPage(0);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setActing(false);
    }
  };

  const deleteSelected = async (mode: "selected" | "all") => {
    setActing(true);
    try {
      if (isCache) {
        let query = supabase.from("ai_response_cache").delete();
        if (mode === "selected") query = query.in("id", selectedIds);
        else query = query.gte("created_at", "1970-01-01");
        const { error } = await query;
        if (error) throw error;
        toast.success(mode === "all" ? "Deleted cache entries" : `Deleted ${selectedIds.length} cache entr${selectedIds.length === 1 ? "y" : "ies"}`);
      } else {
        let query = supabase.from("job_parsing_queue").delete();
        if (mode === "selected") query = query.in("id", selectedIds);
        else if (filter !== "all") query = query.eq("status", filter);
        else query = query.gte("created_at", "1970-01-01");
        const { error } = await query;
        if (error) throw error;
        toast.success(mode === "all" ? "Deleted parser jobs" : `Deleted ${selectedIds.length} job(s)`);
      }
      await onChanged();
      await fetchPage(0);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setActing(false);
      setConfirmDelete(null);
    }
  };

  const canRetry = !isCache && (filter === "failed" || filter === "processing" || filter === "all");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {canRetry && (
              <Button
                variant="secondary"
                size="sm"
                disabled={acting || loading || selectedIds.length === 0}
                onClick={() => retryJobs(selectedIds)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Retry selected
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={acting || loading || selectedIds.length === 0}
              onClick={() => setConfirmDelete("selected")}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={acting || loading || total === 0}
              onClick={() => setConfirmDelete("all")}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete all
            </Button>
            <div className="w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground">{pageLabel}</div>
          </div>

          <div className="min-h-[180px] overflow-auto rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{copy.empty}</p>
            ) : (
              <ul className="divide-y">
                {isCache
                  ? cache.map(entry => (
                      <li key={entry.id} className="flex items-start gap-3 p-3 min-w-0">
                        <Checkbox
                          className="mt-1"
                          checked={selected.has(entry.id)}
                          onCheckedChange={(checked) => {
                            setSelected(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(entry.id);
                              else next.delete(entry.id);
                              return next;
                            });
                          }}
                          aria-label={`Select cache ${entry.id.slice(0, 8)}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words">
                            {(entry.input_text || "").trim().slice(0, 120) || `Cache ${entry.id.slice(0, 8)}`}
                            {(entry.input_text || "").trim().length > 120 ? "…" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {entry.model_used} · {entry.hit_count || 0} hits · expires{" "}
                            {new Date(entry.expires_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          disabled={acting}
                          onClick={() => {
                            setSelected(new Set([entry.id]));
                            setConfirmDelete("selected");
                          }}
                        >
                          Delete
                        </Button>
                      </li>
                    ))
                  : jobs.map(job => {
                      const title = parserJobTitle(job.job_text, job.result, job.id);
                      const showRetry = job.status === "failed" || job.status === "processing";
                      return (
                        <li key={job.id} className="flex items-start gap-3 p-3 min-w-0">
                          <Checkbox
                            className="mt-1"
                            checked={selected.has(job.id)}
                            onCheckedChange={(checked) => {
                              setSelected(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(job.id);
                                else next.delete(job.id);
                                return next;
                              });
                            }}
                            aria-label={`Select ${title}`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium break-words">{title}</p>
                              <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString()}
                              {job.retry_count ? ` · ${job.retry_count} retr${job.retry_count === 1 ? "y" : "ies"}` : ""}
                            </p>
                            {job.error_message && (
                              <p className="text-xs text-destructive break-words whitespace-pre-wrap">
                                {job.error_message}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            {showRetry && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={acting}
                                onClick={() => retryJobs([job.id])}
                              >
                                Retry
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={acting}
                              onClick={() => {
                                setSelected(new Set([job.id]));
                                setConfirmDelete("selected");
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      );
                    })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || acting || offset === 0}
              onClick={() => fetchPage(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              disabled={loading || items.length === 0}
              onClick={() => {
                setSelected(allOnPageSelected ? new Set() : new Set(items.map(item => item.id)));
              }}
            >
              {allOnPageSelected ? "Clear" : "Select page"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || acting || offset + items.length >= total}
              onClick={() => fetchPage(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(next) => { if (!next) setConfirmDelete(null); }}>
        <AlertDialogContent className="w-[calc(100vw-1.5rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {isCache ? "cache entries" : "parser jobs"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === "all"
                ? `This removes ${total} ${isCache ? "cache entries" : "jobs"} in this view.`
                : `This removes ${selectedIds.length} selected ${isCache ? "cache entries" : "jobs"}.`}
              {" "}This cannot be undone.
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
                void deleteSelected(confirmDelete);
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
