"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STORAGE_KEY = "careersasa_popup_dismissed";
const SUBSCRIBED_KEY = "careersasa_subscribed";
const SHOW_DELAY_MS = 45_000; // Show after 45 seconds if no exit intent

export function LeadMagnetPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  const shouldShow = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return false;
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        // Don't show again for 7 days after dismissal
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const open = useCallback(() => {
    if (!hasBeenShown && shouldShow()) {
      setIsOpen(true);
      setHasBeenShown(true);
    }
  }, [hasBeenShown, shouldShow]);

  const close = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch { /* ignore */ }
  }, []);

  // Exit intent detection (desktop: mouse leaves viewport from top)
  useEffect(() => {
    if (!shouldShow()) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasBeenShown) {
        open();
      }
    };

    // Timer fallback for mobile (no exit intent possible)
    const timer = setTimeout(() => {
      if (!hasBeenShown) open();
    }, SHOW_DELAY_MS);

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasBeenShown, open, shouldShow]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }

      if (data.already_subscribed) {
        toast.info(data.message);
      } else {
        toast.success("You\u2019re in! Redirecting to your free toolkit\u2026");
      }

      setIsSuccess(true);
      try { localStorage.setItem(SUBSCRIBED_KEY, "true"); } catch { /* ignore */ }

      // Redirect to toolkit after a short success flash
      setTimeout(() => {
        close();
        window.location.href = '/toolkit';
      }, 2500);
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={close}
      />

      {/* Compact modal — mirrors footer subscribe box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-magnet-title"
        className="relative w-full max-w-[22rem] bg-background rounded-xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-1.5 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-2xl leading-none font-light"
          aria-label="Close"
        >
          ×
        </button>

        {isSuccess ? (
          <div className="px-4 py-5 text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-base font-bold mb-0.5 text-foreground">
              You&apos;re in!
            </h2>
            <p className="text-xs text-muted-foreground">
              Redirecting to your free toolkit…
            </p>
          </div>
        ) : (
          <div className="px-4 pt-5 pb-4 text-center space-y-2.5 bg-gradient-to-br from-[#0A66C2]/10 via-background to-[#E8712B]/10">
            <h2
              id="lead-magnet-title"
              className="text-lg font-bold leading-snug pr-6"
            >
              Subscribe &{" "}
              <span className="text-[#0A66C2]">Get Hired Faster</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Grab Free Career Toolkit:
            </p>
            <p className="text-[11px] font-medium tracking-wide text-foreground/90 leading-snug">
              CV Template &bull; Cover Letter &bull; Interview Checklist &bull; Salary Guide
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-0.5">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
                required
                autoFocus
              />
              <Button
                type="submit"
                className="w-full h-9 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Get Instant Access"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
