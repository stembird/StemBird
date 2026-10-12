'use client';

import { useCallback, useRef, useState } from 'react';
import { MpesaCheckoutDialog } from '@/components/payments/MpesaCheckoutDialog';
import { loadPurchasedSkus } from '@/lib/pricing/purchases';
import {
  templateUnlockDescription,
  unpaidTemplateUnlock,
  type TemplateProductKind,
  type TemplateUnlock,
} from '@/lib/pricing/templateAccess';
import { usePricingCatalog } from '@/hooks/usePricingCatalog';

export function useTemplateUnlock() {
  const { products, offers } = usePricingCatalog();
  const [purchasedSkus, setPurchasedSkus] = useState<Set<string>>(new Set());
  const [checkout, setCheckout] = useState<TemplateUnlock | null>(null);
  const purchasedSkusRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<(() => void | Promise<void>) | null>(null);

  const refreshPurchases = useCallback(async (userId: string) => {
    const next = await loadPurchasedSkus(userId);
    purchasedSkusRef.current = next;
    setPurchasedSkus(next);
  }, []);

  const requireUnlock = useCallback(
    (
      kind: TemplateProductKind,
      templateName: string,
      onUnlocked: () => void | Promise<void>,
    ): boolean => {
      const unpaid = unpaidTemplateUnlock(
        kind,
        templateName,
        products,
        offers,
        purchasedSkusRef.current,
      );
      if (!unpaid) return false;
      pendingRef.current = onUnlocked;
      setCheckout(unpaid);
      return true;
    },
    [products, offers],
  );

  const handlePaid = useCallback(async () => {
    if (checkout) {
      const next = new Set(purchasedSkusRef.current).add(checkout.sku);
      purchasedSkusRef.current = next;
      setPurchasedSkus(next);
    }
    setCheckout(null);
    const resume = pendingRef.current;
    pendingRef.current = null;
    await resume?.();
  }, [checkout]);

  return {
    products,
    offers,
    purchasedSkus,
    refreshPurchases,
    requireUnlock,
    checkout,
    setCheckout,
    handlePaid,
  };
}

export function TemplateUnlockDialog({
  checkout,
  onOpenChange,
  onSuccess,
}: {
  checkout: TemplateUnlock | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
}) {
  if (!checkout) return null;
  return (
    <MpesaCheckoutDialog
      open={!!checkout}
      onOpenChange={onOpenChange}
      title={checkout.title}
      description={templateUnlockDescription(checkout.kind)}
      amount={checkout.amount}
      sku={checkout.sku}
      onSuccess={onSuccess}
    />
  );
}
