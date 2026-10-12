"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Smartphone, CheckCircle2, XCircle, Store, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import {
  formatKenyanPhoneDisplay,
  formatKes,
  normalizeCouponCode,
  quoteProductPrice,
} from "@/lib/pricing";
import type { MpesaCustomerMethod, QuotedPrice } from "@/lib/pricing/types";

type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount?: number;
  sku?: string;
  jobId?: string;
  action?: "promote" | "feature";
  tier?: string;
  onSuccess: () => void | Promise<void>;
}

export function MpesaCheckoutDialog({
  open,
  onOpenChange,
  title,
  description,
  amount,
  sku,
  jobId,
  action,
  tier,
  onSuccess,
}: CheckoutDialogProps) {
  const { session } = useAuth();
  const { products, offers, mpesa } = usePricingCatalog();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [method, setMethod] = useState<MpesaCustomerMethod>("phone");
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [submittedManual, setSubmittedManual] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const product = useMemo(
    () => (sku ? products.find((p) => p.sku === sku) : undefined),
    [products, sku]
  );

  const quote: QuotedPrice | null = useMemo(() => {
    if (!product) return null;
    return quoteProductPrice(product, offers);
  }, [product, offers]);

  const [liveQuote, setLiveQuote] = useState<QuotedPrice | null>(null);
  const payable = liveQuote?.amount ?? quote?.amount ?? amount ?? 0;

  useEffect(() => {
    setLiveQuote(quote);
  }, [quote]);

  useEffect(() => {
    if (!open) return;
    const preferred = mpesa.defaultMethod;
    const available = mpesa.methods.map((m) => m.id);
    setMethod(available.includes(preferred) ? preferred : available[0] || "phone");
  }, [open, mpesa.defaultMethod, mpesa.methods]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollStatus = useCallback(
    async (paymentId: string, accessToken: string) => {
      try {
        const res = await fetch(
          `/api/payments/mpesa/status?paymentId=${encodeURIComponent(paymentId)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const json = await res.json();
        if (!res.ok || !json.data) return;

        const data = json.data as {
          status: PaymentStatus;
          mpesa_receipt_number: string | null;
          result_desc: string | null;
        };
        setPaymentStatus(data.status);
        if (data.mpesa_receipt_number) setReceipt(data.mpesa_receipt_number);

        if (data.status === "SUCCESS") {
          stopPolling();
          toast.success(
            data.mpesa_receipt_number
              ? `Payment successful. Receipt: ${data.mpesa_receipt_number}`
              : "Payment successful"
          );
          await onSuccess();
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          stopPolling();
          toast.error(data.result_desc || `Payment ${data.status.toLowerCase()}`);
        }
      } catch (err) {
        console.error("[M-Pesa] Status poll failed:", err);
      }
    },
    [stopPolling, onSuccess]
  );

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponInput);
    if (!sku || !code) return;
    setCouponError(null);
    try {
      const res = await fetch("/api/pricing/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invalid coupon");
      setLiveQuote(json.quote as QuotedPrice);
      setAppliedCoupon(code);
      toast.success(`Coupon ${code} applied`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid coupon";
      setCouponError(msg);
      setAppliedCoupon(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) {
      toast.error("Please sign in to make a payment");
      return;
    }

    setSubmitting(true);
    setPaymentStatus(null);
    setReceipt(null);
    setTransactionRef(null);
    setSubmittedManual(false);
    stopPolling();

    try {
      if (method === "stk") {
        const res = await fetch("/api/payments/mpesa/stkpush", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            phoneNumber,
            amount: payable,
            jobId,
            action,
            tier,
            sku,
            couponCode: appliedCoupon,
            description: title,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to initiate payment");

        const data = json.data as { paymentId: string; transactionReference: string };
        setTransactionRef(data.transactionReference);
        toast.success(json.message || "Check your phone for the M-Pesa prompt");

        let attempts = 0;
        pollRef.current = setInterval(() => {
          attempts += 1;
          if (attempts > 40) {
            stopPolling();
            toast.message("Still waiting for confirmation. You can check the payment status later.");
            return;
          }
          void pollStatus(data.paymentId, session.access_token);
        }, 3000);
        void pollStatus(data.paymentId, session.access_token);
      } else {
        const res = await fetch("/api/payments/mpesa/manual", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            method,
            phoneNumber,
            receiptNumber,
            amount: payable,
            jobId,
            action,
            tier,
            sku,
            couponCode: appliedCoupon,
            description: title,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to record payment");
        setTransactionRef(json.data?.transactionReference || null);
        setSubmittedManual(true);
        setPaymentStatus("PENDING");
        toast.success(json.message || "Payment submitted for confirmation");
        await onSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    stopPolling();
    setSubmitting(false);
    setPaymentStatus(null);
    setReceipt(null);
    setTransactionRef(null);
    setSubmittedManual(false);
    setReceiptNumber("");
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const selectedMethod = mpesa.methods.find((m) => m.id === method);
  const compareAt = liveQuote?.compareAtPrice ?? quote?.compareAtPrice ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mpesa.environment === "sandbox" && (
            <p className="text-xs rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
              M-Pesa is in sandbox (test) mode. Switch to live from the admin dashboard when you are ready.
            </p>
          )}

          <div className="bg-muted/40 border border-border rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
            {compareAt && compareAt > payable && (
              <p className="text-sm text-muted-foreground line-through">{formatKes(compareAt)}</p>
            )}
            <p className="text-3xl font-bold text-foreground">{formatKes(payable)}</p>
            {liveQuote?.offer?.badge_text && (
              <p className="text-xs text-primary mt-1">{liveQuote.offer.badge_text}</p>
            )}
          </div>

          {sku && payable > 0 && (
            <div className="space-y-2">
              <Label htmlFor="coupon">Coupon code</Label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="SAVE10"
                  disabled={submitting}
                />
                <Button type="button" variant="outline" onClick={() => void applyCoupon()} disabled={submitting}>
                  Apply
                </Button>
              </div>
              {appliedCoupon && (
                <p className="text-xs text-green-600">Applied {appliedCoupon}</p>
              )}
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            </div>
          )}

          {transactionRef && (
            <p className="text-xs text-muted-foreground break-all">
              Reference: <span className="font-mono">{transactionRef}</span>
            </p>
          )}

          {paymentStatus === "SUCCESS" ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground space-y-1">
                <p className="font-medium">Payment successful</p>
                {receipt && <p className="text-muted-foreground">Receipt: {receipt}</p>}
              </div>
            </div>
          ) : submittedManual ? (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground space-y-1">
                <p className="font-medium">Payment submitted</p>
                <p className="text-muted-foreground">
                  We will confirm your M-Pesa receipt shortly. Keep your confirmation message.
                </p>
              </div>
            </div>
          ) : paymentStatus === "FAILED" || paymentStatus === "CANCELLED" ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <p className="font-medium">Payment {paymentStatus.toLowerCase()}</p>
                <p className="text-muted-foreground">You can retry the payment if you wish.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mpesa.methods.length > 1 && (
                <RadioGroup
                  value={method}
                  onValueChange={(value) => setMethod(value as MpesaCustomerMethod)}
                  className="space-y-2"
                >
                  {mpesa.methods.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem value={item.id} className="mt-1" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {item.id === "till" ? <Store className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {method === "phone" && selectedMethod?.phoneNumber && (
                <div className="rounded-lg border border-dashed border-border p-3 text-sm space-y-1">
                  <p className="font-medium">Send Money</p>
                  <p>
                    Name: <span className="font-semibold">CareerSasa</span>
                  </p>
                  <p>
                    Number:{" "}
                    <span className="font-mono font-semibold">
                      {formatKenyanPhoneDisplay(selectedMethod.phoneNumber)}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    On your phone: M-Pesa → Send Money → enter the number above →{" "}
                    {formatKes(payable)} → PIN.
                  </p>
                </div>
              )}

              {method === "till" && selectedMethod?.tillNumber && (
                <div className="rounded-lg border border-dashed border-border p-3 text-sm space-y-1">
                  <p className="font-medium">Buy Goods and Services</p>
                  <p>
                    Till number:{" "}
                    <span className="font-mono font-semibold">{selectedMethod.tillNumber}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    On your phone: M-Pesa → Lipa na M-Pesa → Buy Goods and Services → enter till{" "}
                    {selectedMethod.tillNumber} → {formatKes(payable)} → PIN.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">
                  {method === "stk" ? "M-Pesa phone number" : "Number you paid from"}
                </Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="07XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  autoComplete="tel"
                  disabled={submitting}
                />
              </div>

              {method !== "stk" && (
                <div className="space-y-2">
                  <Label htmlFor="mpesa-receipt">M-Pesa receipt / confirmation code</Label>
                  <Input
                    id="mpesa-receipt"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g. QH12ABC456"
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting || payable < 1}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {method === "stk" ? "Sending STK Push…" : "Submitting…"}
                  </>
                ) : method === "stk" ? (
                  `Pay ${formatKes(payable)}`
                ) : (
                  `I have paid ${formatKes(payable)}`
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
