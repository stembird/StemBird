'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CatalogOffer, CatalogProduct, PricingCatalog, PublicMpesaSettings } from '@/lib/pricing/types';
import { DEFAULT_MPESA_SETTINGS, DEFAULT_PRODUCTS, toPublicMpesaSettings } from '@/lib/pricing';

interface CatalogState {
  products: CatalogProduct[];
  offers: CatalogOffer[];
  mpesa: PublicMpesaSettings;
  loading: boolean;
}

const fallback: Omit<CatalogState, 'loading'> = {
  products: DEFAULT_PRODUCTS.filter((p) => p.is_active),
  offers: [],
  mpesa: toPublicMpesaSettings(DEFAULT_MPESA_SETTINGS),
};

export function usePricingCatalog() {
  const [state, setState] = useState<CatalogState>({ ...fallback, loading: true });

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/pricing/catalog', { cache: 'no-store' });
      const json = (await res.json()) as PricingCatalog;
      setState({
        products: Array.isArray(json.products) && json.products.length ? json.products : fallback.products,
        offers: Array.isArray(json.offers) ? json.offers : [],
        mpesa: json.mpesa || fallback.mpesa,
        loading: false,
      });
    } catch {
      setState({ ...fallback, loading: false });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
