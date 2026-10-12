'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, FileText, Mail, ArrowRight } from 'lucide-react';

function ConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const already = status === 'already';

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center max-w-lg mx-auto px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          {already ? 'Already Subscribed!' : 'Subscription Confirmed!'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {already
            ? 'You are already subscribed to our newsletter. Welcome back!'
            : 'Welcome! You are now subscribed to the CareerSasa newsletter. You will receive curated job opportunities, career tips, and industry updates.'}
        </p>

        {/* Toolkit Download Section */}
        <div className="bg-gradient-to-r from-[#0A66C2]/10 to-[#0077B5]/10 border border-[#0A66C2]/20 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2]/20">
              <Gift className="h-5 w-5 text-[#0A66C2]" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Your Free Toolkit Is Ready</h2>
              <p className="text-sm text-muted-foreground">Download your Job Seeker&apos;s Toolkit now</p>
            </div>
          </div>
          <div className="space-y-2 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Professional CV template (ATS-friendly)
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Cover letter template that gets read
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Interview prep checklist
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Salary negotiation script
            </div>
          </div>
          <Button asChild className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white">
            <Link href="/toolkit">
              <Gift className="mr-2 h-4 w-4" />
              Access My Free Toolkit
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/jobs">Browse Jobs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Mail className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    }>
      <ConfirmedContent />
    </Suspense>
  );
}
