'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  attachJobToCV,
  createTargetedCvCopy,
  type CandidateCV,
} from '@/lib/careerTools';
import {
  buildJobDescriptionText,
  compareCvToJd,
  targetingHeadline,
} from '@/lib/jobTargeting';
import { getSavedJobs, type SavedJob } from '@/lib/savedJobs';
import { Copy, Target } from 'lucide-react';

type JobRow = {
  id: string;
  title: string;
  company: string | null;
  job_slug: string | null;
  description: string | null;
  responsibilities: string | null;
  required_qualifications: unknown;
  qualifications: string | null;
  additional_info: string | null;
};

async function fetchJobForTargeting(jobId: string): Promise<JobRow | null> {
  const select = 'id, title, company, job_slug, description, responsibilities, required_qualifications, qualifications, additional_info';
  const byId = await supabase.from('jobs').select(select).eq('id', jobId).maybeSingle();
  if (byId.data) return byId.data as JobRow;
  const bySlug = await supabase.from('jobs').select(select).eq('job_slug', jobId).maybeSingle();
  return (bySlug.data as JobRow | null) ?? null;
}

export default function JobTargetingPanel({
  cvs,
  activeCv,
  initialJobId,
  onCvUpdated,
  onOpenCv,
}: {
  cvs: CandidateCV[];
  activeCv: CandidateCV | null;
  initialJobId?: string | null;
  onCvUpdated: (cv: CandidateCV, all?: CandidateCV[]) => void;
  onOpenCv?: (cv: CandidateCV) => void;
}) {
  const { toast } = useToast();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [job, setJob] = useState<JobRow | null>(null);
  const [pastedJd, setPastedJd] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState('');

  const workingCv = activeCv || cvs.find((cv) => cv.id === selectedCvId) || cvs.find((cv) => cv.is_primary) || cvs[0] || null;

  useEffect(() => {
    if (activeCv?.id) setSelectedCvId(activeCv.id);
    else if (!selectedCvId && cvs[0]) setSelectedCvId(cvs.find((cv) => cv.is_primary)?.id || cvs[0].id);
  }, [activeCv?.id, cvs, selectedCvId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = await getSavedJobs().catch(() => [] as SavedJob[]);
        if (!cancelled) setSavedJobs(saved);
      } catch {
        if (!cancelled) setSavedJobs([]);
      }

      if (initialJobId) {
        const fetched = await fetchJobForTargeting(initialJobId).catch(() => null);
        if (!cancelled && fetched) {
          setJob(fetched);
          setPastedJd('');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [initialJobId]);

  const jdText = useMemo(() => {
    if (pastedJd.trim()) return pastedJd.trim();
    if (job) return buildJobDescriptionText(job);
    return workingCv?.target_jd_text || '';
  }, [pastedJd, job, workingCv?.target_jd_text]);

  const gap = useMemo(
    () => (jdText ? compareCvToJd(workingCv?.content ?? {}, jdText) : null),
    [workingCv, jdText],
  );

  async function persist(target: CandidateCV, copy: boolean) {
    if (!jdText.trim()) {
      toast({ title: 'Add a job description', description: 'Attach a listing or paste the JD first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        target_job_id: job?.id || target.target_job_id || null,
        target_jd_text: jdText,
        jobTitle: job?.title || targetingHeadline(jdText),
      };
      const updated = copy
        ? await createTargetedCvCopy(target, payload)
        : await attachJobToCV(target.id, payload);

      onCvUpdated(updated);
      onOpenCv?.(updated);
      toast({
        title: copy ? 'Tailored copy saved' : 'Job attached',
        description: copy
          ? 'A copy of this CV is now targeted at the listing. Edit the copy — the original is unchanged.'
          : 'Keyword gaps use this job description.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not attach job',
        description: error.message || 'Try again after the targeting migration is applied.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearTargeting() {
    if (!workingCv) return;
    setSaving(true);
    try {
      const updated = await attachJobToCV(workingCv.id, { target_job_id: null, target_jd_text: null });
      setJob(null);
      setPastedJd('');
      onCvUpdated(updated);
      toast({ title: 'Targeting cleared' });
    } catch (error: any) {
      toast({ title: 'Could not clear targeting', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function chooseSavedJob(jobId: string) {
    const saved = savedJobs.find((row) => row.job_id === jobId);
    const listing = saved?.jobs as JobRow | undefined;
    if (listing?.id) {
      setJob(listing);
      setPastedJd('');
    }
  }

  const attachedHeadline = workingCv?.target_jd_text ? targetingHeadline(workingCv.target_jd_text) : '';

  return (
    <div className="rounded-xl border border-[#0A66C2]/20 bg-[#0A66C2]/5 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Target className="h-5 w-5 shrink-0 text-[#0A66C2] mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#0A66C2]">Target this job</h3>
          <p className="text-xs text-muted-foreground">
            Attach a CareerSasa listing or paste a JD. We highlight listing keywords that are missing from this CV. Nothing is rewritten automatically.
          </p>
        </div>
      </div>

      {job && (
        <p className="text-sm">
          Listing: <span className="font-medium">{job.title}</span>
          {job.company ? <span className="text-muted-foreground"> · {job.company}</span> : null}
        </p>
      )}
      {!job && attachedHeadline && (
        <p className="text-sm text-muted-foreground">Currently attached: {attachedHeadline}</p>
      )}

      {savedJobs.length > 0 && (
        <div className="space-y-1.5">
          <Label>Saved job</Label>
          <Select onValueChange={chooseSavedJob}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a saved job" />
            </SelectTrigger>
            <SelectContent>
              {savedJobs.map((row) => (
                <SelectItem key={row.id} value={row.job_id}>
                  {row.jobs?.title || 'Saved job'}
                  {row.jobs?.company ? ` · ${row.jobs.company}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="paste-jd">Or paste a job description</Label>
        <Textarea
          id="paste-jd"
          rows={4}
          placeholder="Paste the vacancy text here…"
          value={pastedJd}
          onChange={(e) => setPastedJd(e.target.value)}
        />
      </div>

      {!activeCv && cvs.length > 1 && (
        <div className="space-y-1.5">
          <Label>CV to target</Label>
          <Select value={selectedCvId} onValueChange={setSelectedCvId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a CV" />
            </SelectTrigger>
            <SelectContent>
              {cvs.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>
                  {cv.title}{cv.is_primary ? ' (Primary)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {workingCv ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving || !jdText.trim()} onClick={() => persist(workingCv, false)}>
            Attach to this CV
          </Button>
          <Button size="sm" variant="outline" disabled={saving || !jdText.trim()} onClick={() => persist(workingCv, true)}>
            <Copy className="h-4 w-4 mr-1" />
            Save tailored copy
          </Button>
          {(workingCv.target_job_id || workingCv.target_jd_text) && (
            <Button size="sm" variant="ghost" disabled={saving} onClick={clearTargeting}>
              Clear
            </Button>
          )}
          {job?.job_slug || job?.id ? (
            <Button asChild size="sm" variant="link" className="px-0">
              <Link href={`/jobs/${job.job_slug || job.id}`}>Open listing</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Create a CV first, then attach this job to it.</p>
      )}

      {gap && gap.totalCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {gap.matchedCount} of {gap.totalCount} listing keywords appear on this CV.
            {gap.missingCount > 0 ? ' Add the missing ones where they are true for you — do not invent them.' : ' This CV already covers the extracted keywords.'}
          </p>
          {gap.missing.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Missing from this CV</p>
              <div className="flex flex-wrap gap-1.5">
                {gap.missing.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 capitalize">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {gap.matched.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Already on this CV</p>
              <div className="flex flex-wrap gap-1.5">
                {gap.matched.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="capitalize">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
