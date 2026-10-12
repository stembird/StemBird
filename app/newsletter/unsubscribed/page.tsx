'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { MailX, Mail } from 'lucide-react';

function UnsubscribedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const messages: Record<string, { title: string; description: string }> = {
    success: {
      title: 'Successfully Unsubscribed',
      description: 'You have been removed from our newsletter list. You will no longer receive marketing emails from us. Note: You will still receive transactional emails like application updates.',
    },
    already: {
      title: 'Already Unsubscribed',
      description: 'You were already unsubscribed from our newsletter.',
    },
    not_found: {
      title: 'Subscription Not Found',
      description: 'We could not find a subscription matching this link. You may have already unsubscribed.',
    },
  };

  const msg = messages[status || 'not_found'] || messages.not_found;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <MailX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-4">{msg.title}</h1>
        <p className="text-muted-foreground mb-8">{msg.description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/newsletter">Re-subscribe</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterUnsubscribedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Mail className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    }>
      <UnsubscribedContent />
    </Suspense>
  );
}
