import { supabase } from '@/integrations/supabase/client';
import type { SuggestKind, SuggestRequest, SuggestUsage } from '@/lib/careerSuggest';

export type SuggestApiResponse = {
  suggestions?: string[];
  kind?: SuggestKind;
  usage?: SuggestUsage;
  error?: string;
  aiConfigured?: boolean;
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function fetchSuggestUsage(): Promise<SuggestApiResponse> {
  const response = await fetch('/api/career-tools/suggest', {
    method: 'GET',
    headers: await authHeaders(),
  });
  return response.json();
}

export async function requestCareerSuggest(
  body: SuggestRequest,
): Promise<SuggestApiResponse & { status: number }> {
  const response = await fetch('/api/career-tools/suggest', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as SuggestApiResponse;
  return { ...json, status: response.status };
}
