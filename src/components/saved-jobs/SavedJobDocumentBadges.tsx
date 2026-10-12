'use client';

import Link from 'next/link';
import { FileText, Mail, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  applyHrefForJob,
  careerToolsHrefForJob,
  documentsForSavedJob,
} from '@/lib/savedJobDocuments';
import { buildPublicCvUrl, isShareToken } from '@/lib/cvShare';
import type { CandidateCoverLetter, CandidateCV } from '@/lib/careerTools';

export default function SavedJobDocumentBadges({
  job,
  cvs,
  letters,
}: {
  job: { id: string; title?: string | null; job_slug?: string | null };
  cvs: CandidateCV[];
  letters: CandidateCoverLetter[];
}) {
  const docs = documentsForSavedJob(job.id, cvs, letters);
  const applyHref = applyHrefForJob(job, docs);
  const toolsHref = careerToolsHrefForJob(job.id, docs.cv?.id);
  const shared = Boolean(docs.cv?.is_public && isShareToken(docs.cv.share_token));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Career Tools documents</p>
        <div className="space-y-2">
          {docs.cv ? (
            <div className="rounded-md border bg-background p-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-[#0A66C2]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{docs.cv.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {docs.cvIsTargeted ? (
                      <Badge variant="outline" className="border-[#0A66C2]/30 text-[#0A66C2]">
                        Targeted
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{docs.cv.is_primary ? 'Primary' : 'Saved CV'}</Badge>
                    )}
                    {shared && (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700">Shared</Badge>
                    )}
                    {docs.extraTargetedCount > 0 && (
                      <Badge variant="outline">+{docs.extraTargetedCount} more</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No CV targeted for this job yet.</p>
          )}

          {docs.letter ? (
            <div className="rounded-md border bg-background p-2.5">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-[#0A66C2]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{docs.letter.title}</p>
                  <Badge variant="outline" className="mt-1 border-[#0A66C2]/30 text-[#0A66C2]">
                    Linked letter
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button asChild size="sm" className="w-full">
          <Link href={applyHref}>Apply with Career Tools</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={toolsHref}>
            <Target className="h-4 w-4 mr-1" />
            {docs.cvIsTargeted ? 'Open targeted CV' : 'Target a CV'}
          </Link>
        </Button>
        {shared && docs.cv?.share_token && (
          <Button asChild size="sm" variant="ghost" className="w-full">
            <Link href={buildPublicCvPathSafe(docs.cv.share_token)} target="_blank">
              Open public link
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function buildPublicCvPathSafe(token: string) {
  return buildPublicCvUrl(token);
}
