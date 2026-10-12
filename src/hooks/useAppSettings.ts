'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Reads a single app_settings key. Returns null while loading. */
export function useAppSetting(key: string): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('app_settings' as any)
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        const row = data as unknown as { value: string } | null;
        setValue(row ? row.value === 'true' : true);
      });
  }, [key]);

  return value;
}

/** Updates a single app_settings key. Admin only. */
export async function setAppSetting(key: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('app_settings' as any)
    .update({ value: String(value), updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw error;
}
