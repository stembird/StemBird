'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Briefcase, BookOpen, TrendingUp, Gift, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to subscribe');
        return;
      }

      if (data.already_subscribed) {
        toast.info(data.message);
      } else {
        toast.success("You\u2019re in! Redirecting to your free toolkit\u2026");
        setSubmitted(true);
      }

      // Redirect to toolkit after short delay
      setTimeout(() => router.push('/toolkit'), 1500);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0A66C2]/10 mb-6">
            <Gift className="h-8 w-8 text-[#0A66C2]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Subscribe & Get Your Free Toolkit <span className="text-[#0A66C2]">Instantly</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            One email. That&apos;s all it takes to unlock your Job Seeker&apos;s Toolkit plus weekly job picks, salary guides, and insider career tips.
          </p>
        </div>

        {/* Free toolkit offer card */}
        <div className="max-w-2xl mx-auto mb-10 bg-gradient-to-r from-[#0A66C2]/10 to-[#0077B5]/10 border border-[#0A66C2]/20 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0A66C2]/20">
              <Gift className="h-6 w-6 text-[#0A66C2]" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Your Free Job Seeker&apos;s Toolkit</h2>
              <p className="text-sm text-muted-foreground">Instant access after you subscribe</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {[
              { label: "Professional CV template (ATS-friendly)" },
              { label: "Cover letter template that gets read" },
              { label: "Interview prep checklist" },
              { label: "Salary negotiation script" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="w-3 h-3" />
            <span>You&apos;ll be taken directly to the toolkit page to edit & download</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="pt-6 text-center">
              <Briefcase className="h-10 w-10 text-[#0A66C2] mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Jobs Before Anyone Else</h3>
              <p className="text-sm text-muted-foreground">
                New jobs in your inbox before they appear on the site. Early applicants get hired.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-10 w-10 text-[#0A66C2] mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Free Salary Guides & Templates</h3>
              <p className="text-sm text-muted-foreground">
                Kenya&apos;s salary benchmarks by industry and role, plus exclusive career tools.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-10 w-10 text-[#0A66C2] mx-auto mb-3" />
              <h3 className="font-semibold mb-2">What Employers Actually Want</h3>
              <p className="text-sm text-muted-foreground">
                Insider insights from Kenyan hiring managers — the advice that gets you shortlisted.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscribe Form */}
        <Card className="max-w-lg mx-auto border-2 border-[#0A66C2]/30 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Get Your Free Toolkit Now</CardTitle>
            <CardDescription>
              No spam. No fluff. Just jobs, tools, and insights that help you land interviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4 animate-pulse">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">You&apos;re In!</h3>
                <p className="text-muted-foreground text-sm">
                  Redirecting you to your free toolkit now. A welcome email with the same link is on its way to <strong>{email}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newsletter-email">Email Address *</Label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Subscribing\u2026' : 'Subscribe & Get My Toolkit'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By subscribing you agree to receive marketing emails from CareerSasa.
                  You can unsubscribe at any time.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
