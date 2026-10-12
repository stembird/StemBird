"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  OG_CARD_SIZES,
  type OgCardSize,
} from "@/lib/ogJobCardDesign";
import {
  OG_TEMPLATE_CATALOG,
  OG_TEMPLATE_REVIEWS_SETTING_KEY,
  buildOgPreviewUrl,
  emptyReview,
  parseOgTemplateReviews,
  type OgTemplateId,
  type OgTemplateReview,
  type OgTemplateReviewStatus,
  type OgTemplateReviewsMap,
} from "@/lib/ogTemplateCatalog";

type SampleJob = {
  id: string;
  job_slug: string | null;
  title: string;
  company: string | null;
};

const STATUS_OPTIONS: Array<{
  value: OgTemplateReviewStatus;
  label: string;
  badge: string;
}> = [
  { value: "pending", label: "Pending review", badge: "bg-amber-100 text-amber-900" },
  { value: "approved", label: "Approved", badge: "bg-emerald-100 text-emerald-900" },
  { value: "needs_changes", label: "Needs changes", badge: "bg-orange-100 text-orange-900" },
  { value: "rejected", label: "Rejected", badge: "bg-rose-100 text-rose-900" },
];

function statusMeta(status: OgTemplateReviewStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

export default function AdminImageTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [jobs, setJobs] = useState<SampleJob[]>([]);
  const [jobKey, setJobKey] = useState<string>("");
  const [manualSlug, setManualSlug] = useState("");
  const [size, setSize] = useState<OgCardSize>("og");
  const [selectedId, setSelectedId] = useState<OgTemplateId>("2");
  const [reviews, setReviews] = useState<OgTemplateReviewsMap>({});
  const [draftNotes, setDraftNotes] = useState("");
  const [draftStatus, setDraftStatus] = useState<OgTemplateReviewStatus>("pending");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const activeJobSlug = useMemo(() => {
    if (manualSlug.trim()) return manualSlug.trim();
    const job = jobs.find((j) => j.id === jobKey || j.job_slug === jobKey);
    return job?.job_slug || job?.id || jobKey || "";
  }, [manualSlug, jobs, jobKey]);

  const previewUrl = useMemo(() => {
    if (!activeJobSlug) return "";
    return buildOgPreviewUrl(activeJobSlug, selectedId, size, true) + `&r=${previewKey}`;
  }, [activeJobSlug, selectedId, size, previewKey]);

  const selectedTemplate = OG_TEMPLATE_CATALOG.find((t) => t.id === selectedId)!;
  const selectedReview = reviews[selectedId] || emptyReview();

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_slug, title, company")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      const rows = (data || []) as SampleJob[];
      setJobs(rows);
      setJobKey((prev) => prev || rows[0]?.job_slug || rows[0]?.id || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sample jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", OG_TEMPLATE_REVIEWS_SETTING_KEY)
        .maybeSingle();

      if (error) throw error;
      const row = data as { value?: string } | null;
      setReviews(parseOgTemplateReviews(row?.value));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load saved reviews");
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/auth";
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (user && role === "admin") {
      void loadJobs();
      void loadReviews();
    }
  }, [user, role, loadJobs, loadReviews]);

  useEffect(() => {
    const current = reviews[selectedId] || emptyReview();
    setDraftNotes(current.notes || "");
    setDraftStatus(current.status || "pending");
  }, [selectedId, reviews]);

  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
  }, [previewUrl]);

  const saveReview = async () => {
    setSaving(true);
    try {
      const next: OgTemplateReviewsMap = {
        ...reviews,
        [selectedId]: {
          status: draftStatus,
          notes: draftNotes.trim(),
          updatedAt: new Date().toISOString(),
        },
      };

      const payload = JSON.stringify(next);
      const { data: existing } = await supabase
        .from("app_settings" as any)
        .select("key")
        .eq("key", OG_TEMPLATE_REVIEWS_SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings" as any)
          .update({
            value: payload,
            updated_at: new Date().toISOString(),
          })
          .eq("key", OG_TEMPLATE_REVIEWS_SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings" as any).insert({
          key: OG_TEMPLATE_REVIEWS_SETTING_KEY,
          value: payload,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setReviews(next);
      toast.success(`Saved review for Template ${selectedId}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not save review — check admin permissions on app_settings");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="container mx-auto py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="container mx-auto py-16 space-y-4">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="text-muted-foreground">Only admins can review image templates.</p>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const approvedCount = OG_TEMPLATE_CATALOG.filter(
    (t) => (reviews[t.id] || emptyReview()).status === "approved",
  ).length;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Admin dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-primary" />
            Image Templates
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Live-preview accepted job social / OG cards (templates 2, 4, 5), leave review notes,
            and store approval status. When a job link is shared, the platform picks one of these
            templates at random (stable per job) so different posts get visual variety.
            Reviews persist in <code className="text-xs">app_settings</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{approvedCount}/{OG_TEMPLATE_CATALOG.length} approved</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewKey((k) => k + 1);
              void loadReviews();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview controls</CardTitle>
          <CardDescription>
            Pick a live job and canvas size — all templates below use the same sample.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Sample job</Label>
            <Select
              value={jobKey}
              onValueChange={(v) => {
                setManualSlug("");
                setJobKey(v);
              }}
              disabled={loadingJobs}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingJobs ? "Loading jobs…" : "Select a job"} />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.job_slug || job.id}>
                    {job.title}
                    {job.company ? ` — ${job.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Or job slug / id</Label>
            <Input
              placeholder="e.g. physiotherapist"
              value={manualSlug}
              onChange={(e) => setManualSlug(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as OgCardSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OG_CARD_SIZES) as OgCardSize[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {OG_CARD_SIZES[key].label} ({OG_CARD_SIZES[key].width}×
                    {OG_CARD_SIZES[key].height})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        {/* Template list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Templates</CardTitle>
            <CardDescription>Select one to preview and review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {OG_TEMPLATE_CATALOG.map((tpl) => {
              const review = reviews[tpl.id] || emptyReview();
              const meta = statusMeta(review.status);
              const active = selectedId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">
                      T{tpl.id} · {tpl.name}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {tpl.description}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Preview + review form */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    Template {selectedId}: {selectedTemplate.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedTemplate.description}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${selectedTemplate.accent}`}>
                    {`?template=${selectedTemplate.queryValue}`}
                  </span>
                  {previewUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open full size
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!activeJobSlug ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                  Choose a sample job to render previews.
                </div>
              ) : (
                <div className="relative rounded-xl border bg-muted/30 overflow-hidden">
                  {(imgLoading || loadingJobs) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {imgError ? (
                    <div className="p-10 text-center space-y-3">
                      <XCircle className="h-8 w-8 text-destructive mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Preview failed for <code>{activeJobSlug}</code>. Try another job slug.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewKey((k) => k + 1)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <img
                      key={previewUrl}
                      src={previewUrl}
                      alt={`OG template ${selectedId}`}
                      className="w-full h-auto block"
                      onLoad={() => {
                        setImgLoading(false);
                        setImgError(false);
                      }}
                      onError={() => {
                        setImgLoading(false);
                        setImgError(true);
                      }}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Review</CardTitle>
              <CardDescription>
                Store approval status and notes for this template.{" "}
                {selectedReview.updatedAt
                  ? `Last saved ${new Date(selectedReview.updatedAt).toLocaleString()}.`
                  : "Not saved yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={draftStatus}
                  onValueChange={(v) => setDraftStatus(v as OgTemplateReviewStatus)}
                  disabled={loadingReviews}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="What to keep, change, or reject — e.g. hex frame needs thicker stroke…"
                  rows={5}
                  disabled={loadingReviews}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveReview()} disabled={saving || loadingReviews}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save review
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraftStatus("approved");
                    setDraftNotes((n) => n || "Looks good — approve for rotation.");
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark approved
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
