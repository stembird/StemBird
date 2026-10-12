import { supabase } from '@/integrations/supabase/client';

export async function loadPurchasedSkus(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('payments')
    .select('metadata')
    .eq('user_id', userId)
    .eq('status', 'SUCCESS');

  if (error || !data) return new Set();

  const skus = new Set<string>();
  for (const row of data as { metadata?: Record<string, unknown> | null }[]) {
    const sku = row.metadata?.sku;
    if (typeof sku === 'string' && sku) skus.add(sku);
  }
  return skus;
}
