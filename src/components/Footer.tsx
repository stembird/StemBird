"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Linkedin, Instagram } from "lucide-react";
import { toast } from "sonner";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const router = useRouter();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to subscribe");
        return;
      }
      if (data.already_subscribed) {
        toast.info(data.message);
      } else {
        toast.success("You\u2019re in! Redirecting to your free toolkit\u2026");
      }
      setEmail("");
      // Redirect to toolkit after short delay so user sees the toast
      setTimeout(() => router.push('/toolkit'), 1500);
    } catch {
      toast.error("Error subscribing to updates");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="w-full bg-background border-t border-border/40 mt-auto">
      {/* Section 1: Subscribe */}
      <div className="w-full bg-gradient-to-br from-[#0A66C2]/10 via-background to-[#E8712B]/10 py-12">
        <div className="container mx-auto px-4 max-w-xl text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">
            Subscribe & <span className="text-[#0A66C2]">Get Hired Faster</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Grab Free Career Toolkit:
          </p>
          <p className="text-sm font-medium tracking-wide">
            CV Template &bull; Cover Letter &bull; Interview Checklist &bull; Salary Guide
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 pt-2">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-11 text-base"
              required
            />
            <Button
              type="submit"
              size="lg"
              className="h-11 px-7 bg-orange-500 hover:bg-orange-600 text-white font-semibold whitespace-nowrap"
              disabled={subscribing}
            >
              {subscribing ? 'Subscribing\u2026' : 'Get Instant Access'}
            </Button>
          </form>
        </div>
      </div>

      {/* Section 2: Footer Columns */}
      <div className="w-full py-12 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
            {/* Column 1: About Us */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">About Us</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    About CareerSasa
                  </Link>
                </li>
                <li>
                  <Link href="/mission" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Mission
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/advertise" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Advertise With Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: For Job Seekers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">For Job Seekers</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link href="/scholarships" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Scholarships
                  </Link>
                </li>
                <li>
                  <Link href="/companies" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Companies
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link href="/job-alerts" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Job Alerts
                  </Link>
                </li>
                <li>
                  <Link href="/newsletter" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Newsletter
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Career Tips
                  </Link>
                </li>
                <li>
                  <Link href="/services/linkedin" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="/services/cv" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    CV Services
                  </Link>
                </li>
                <li>
                  <Link href="/services/cover-letter" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Cover Letters
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: For Employers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">For Employers</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/post-job" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Post a Job
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Employer Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Socials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Follow Us</h3>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://www.facebook.com/CareerSasa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/company/careersasa-jobs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/careersasa/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.tiktok.com/@careersasa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    TikTok
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 5: Legal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Legal</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={true}>
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Bottom Bar */}
      <div className="w-full py-6 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 CareerSasa — Enrich Your Career Now!
          </p>
        </div>
      </div>
    </footer>
  );
}