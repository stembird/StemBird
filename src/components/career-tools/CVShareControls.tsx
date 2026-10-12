'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { disableCvSharing, enableCvSharing, buildPublicCvUrl, isShareToken } from '@/lib/cvShare';
import type { CandidateCV } from '@/lib/careerTools';

export default function CVShareControls({
  cv,
  onUpdated,
  onBeforeShare,
}: {
  cv: CandidateCV;
  onUpdated: (cv: CandidateCV) => void;
  /** Return false to delay sharing (e.g. wait for payment). Call proceed after unlock. */
  onBeforeShare?: (proceed: () => void) => boolean;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const shared = Boolean(cv.is_public && isShareToken(cv.share_token));

  const copyLink = async (token: string) => {
    const url = buildPublicCvUrl(token, window.location.origin);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const proceed = async () => {
      try {
        setBusy(true);
        const updated = await enableCvSharing(cv.id, cv.share_token);
        onUpdated(updated);
        if (updated.share_token) await copyLink(updated.share_token);
        toast({ title: 'Link copied', description: 'Anyone with the link can view this CV.' });
      } catch (error: any) {
        toast({ title: 'Could not share', description: error.message, variant: 'destructive' });
      } finally {
        setBusy(false);
      }
    };

    if (onBeforeShare && !onBeforeShare(() => { void proceed(); })) return;
    await proceed();
  };

  const handleStop = async () => {
    try {
      setBusy(true);
      onUpdated(await disableCvSharing(cv.id));
      toast({ title: 'Sharing off', description: 'The public link no longer works.' });
    } catch (error: any) {
      toast({ title: 'Could not stop sharing', description: error.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shared ? (
        <>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700">Shared</Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => cv.share_token && copyLink(cv.share_token)}
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={handleStop}>
            Stop sharing
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-1" />
          {busy ? 'Sharing…' : 'Share'}
        </Button>
      )}
    </div>
  );
}
