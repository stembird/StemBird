import type { SupabaseClient } from '@supabase/supabase-js';
import { canConsumeUsage, DAILY_SUGGEST_LIMIT, usageSnapshot, type SuggestUsage } from '@/lib/careerSuggest';
import { isMissingDbColumnError } from '@/lib/applyDocuments';

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function readSuggestUsage(
  client: SupabaseClient,
  userId: string,
): Promise<SuggestUsage> {
  try {
    const { data, error } = await client
      .from('career_tools_ai_usage' as any)
      .select('request_count')
      .eq('user_id', userId)
      .eq('usage_date', todayStamp())
      .maybeSingle();
    if (error) {
      if (isMissingDbColumnError(error, 'career_tools_ai_usage') || /does not exist|schema cache/i.test(error.message || '')) {
        return usageSnapshot(0);
      }
      console.error('Failed to read suggest usage', error);
      return usageSnapshot(0);
    }
    return usageSnapshot(Number((data as { request_count?: number } | null)?.request_count || 0));
  } catch {
    return usageSnapshot(0);
  }
}

/** Reserve one suggestion. Returns null when the daily cap is already reached. */
export async function consumeSuggestUsage(
  client: SupabaseClient,
  userId: string,
): Promise<SuggestUsage | null> {
  const current = await readSuggestUsage(client, userId);
  if (!canConsumeUsage(current.used, DAILY_SUGGEST_LIMIT)) return null;

  const nextCount = current.used + 1;
  const { error } = await client
    .from('career_tools_ai_usage' as any)
    .upsert(
      {
        user_id: userId,
        usage_date: todayStamp(),
        request_count: nextCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,usage_date' },
    );

  if (error) {
    if (isMissingDbColumnError(error, 'career_tools_ai_usage') || /does not exist|schema cache/i.test(error.message || '')) {
      return usageSnapshot(nextCount);
    }
    console.error('Failed to increment suggest usage', error);
    return usageSnapshot(nextCount);
  }
  return usageSnapshot(nextCount);
}
