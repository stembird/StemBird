"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Smartphone } from "lucide-react";
import { getPaidJobActionPricing } from "@/lib/mpesa/pricing";

type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

interface StkPushData {
  paymentId: string;
  transactionReference: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  status: PaymentStatus;
}

interface StatusData {
  id: string;
  status: PaymentStatus;
  mpesa_receipt_number: string | null;
  amount: number;
  phone_number: string;
  result_desc: string | null;
  transaction_reference: string;
}

export default function MpesaPaymentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <MpesaPaymentContent />
    </Suspense>
  );
}

function MpesaPaymentContent() {
  const { user, session, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const presetAction = searchParams.get("action");
  const presetJobId = searchParams.get("jobId");
  const presetTier = searchParams.get("tier") || undefined;
  const presetPricing =
    presetAction === "promote" || presetAction === "feature"
      ? getPaidJobActionPricing(presetAction, presetTier)
      : undefined;

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState(
    presetPricing ? String(presetPricing.amount) : "1"
  );
  const [description, setDescription] = useState(
    presetPricing
      ? `CareerSasa ${presetPricing.label}`
      : "CareerSasa sandbox payment"
  );
  const [submitting, setSubmitting] = useState(false);
  const [stkData, setStkData] = useState<StkPushData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<StatusData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (paymentId: string, accessToken: string) => {
      try {
        const res = await fetch(
          `/api/payments/mpesa/status?paymentId=${encodeURIComponent(paymentId)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const json = await res.json();
        if (!res.ok || !json.data) return;

        const data = json.data as StatusData;
        setPaymentStatus(data);

        if (data.status === "SUCCESS") {
          stopPolling();
          toast.success(
            data.mpesa_receipt_number
              ? `Payment successful. Receipt: ${data.mpesa_receipt_number}`
              : "Payment successful"
          );
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          stopPolling();
          toast.error(data.result_desc || `Payment ${data.status.toLowerCase()}`);
        }
      } catch (err) {
        console.error("[M-Pesa] Status poll failed:", err);
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!session?.access_token) {
      toast.error("Please sign in to make a payment");
      return;
    }

    setSubmitting(true);
    setStkData(null);
    setPaymentStatus(null);
    stopPolling();

    try {
      const res = await fetch("/api/payments/mpesa/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          phoneNumber,
          amount: Number(amount),
          description,
          ...(presetAction && presetJobId
            ? {
                action: presetAction,
                jobId: presetJobId,
                tier: presetTier,
              }
            : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initiate payment");
      }

      const data = json.data as StkPushData;
      setStkData(data);
      toast.success(json.message || "Check your phone for the M-Pesa prompt");

      // Poll for callback result (up to ~2 minutes)
      let attempts = 0;
      pollRef.current = setInterval(() => {
        attempts += 1;
        if (attempts > 40) {
          stopPolling();
          toast.message("Still waiting for confirmation. You can refresh status later.");
          return;
        }
        void pollStatus(data.paymentId, session.access_token);
      }, 3000);

      void pollStatus(data.paymentId, session.access_token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-lg">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">M-Pesa Payment</h1>
            <p className="text-muted-foreground">
              {presetPricing
                ? `${presetPricing.label} — complete the M-Pesa prompt on your phone to confirm.`
                : "Sandbox STK Push test — enter a phone number and amount, then confirm on your phone."}
            </p>
          </div>

          {authLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !user ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center space-y-4">
              <p className="text-muted-foreground">Sign in to initiate an M-Pesa payment.</p>
              <Link href="/auth">
                <Button>Sign in</Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-card border border-border rounded-lg p-6 space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="07XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 07XXXXXXXX or 2547XXXXXXXX
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  readOnly={!!presetPricing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending STK Push…
                  </>
                ) : (
                  "Pay Now"
                )}
              </Button>
            </form>
          )}

          {(stkData || paymentStatus) && (
            <div className="bg-muted/40 border border-border rounded-lg p-5 space-y-2 text-sm">
              <h2 className="font-semibold text-foreground">Payment status</h2>
              {stkData && (
                <>
                  <p>
                    <span className="text-muted-foreground">Reference: </span>
                    {stkData.transactionReference}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Checkout ID: </span>
                    {stkData.checkoutRequestId}
                  </p>
                </>
              )}
              <p>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">
                  {paymentStatus?.status || stkData?.status || "PENDING"}
                </span>
              </p>
              {paymentStatus?.mpesa_receipt_number && (
                <p>
                  <span className="text-muted-foreground">Receipt: </span>
                  {paymentStatus.mpesa_receipt_number}
                </p>
              )}
              {paymentStatus?.result_desc && paymentStatus.status !== "SUCCESS" && (
                <p className="text-muted-foreground">{paymentStatus.result_desc}</p>
              )}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Pay with M-Pesa Send Money to +254 795 564 135, or Buy Goods and Services if a till is configured.
            Admins can switch sandbox and live Daraja credentials from the dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
