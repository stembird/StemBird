import { createClient } from '@supabase/supabase-js';
import { isMissingDbColumnError } from '@/lib/applyDocuments';
import type { CandidateCV } from '@/lib/careerTools';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';

export const SHARE_COLUMN_KEYS = ['share_token', 'is_public', 'shared_at'] as const;

export type CvShareFields = {
  share_token?: string | null;
  is_public?: boolean | null;
  shared_at?: string | null;
};

export type PublicCvRecord = {
  title: string;
  content: unknown;
  template_id: string | null;
};

const TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function isShareToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function buildPublicCvPath(token: string): string {
  return `/cv/${token}`;
}

export function buildPublicCvUrl(token: string, origin = ''): string {
  const path = buildPublicCvPath(token);
  if (!origin) return path;
  return `${origin.replace(/\/$/, '')}${path}`;
}

export function withoutShareFields<T extends CvShareFields>(row: T): Omit<T, keyof CvShareFields> {
  const next = { ...row };
  for (const key of SHARE_COLUMN_KEYS) {
    delete (next as CvShareFields)[key];
  }
  return next;
}

export function isShareColumnMissing(error: { message?: string } | null): boolean {
  return SHARE_COLUMN_KEYS.some((column) => isMissingDbColumnError(error, column));
}

export async function enableCvSharing(
  cvId: string,
  existingToken?: string | null,
): Promise<CandidateCV> {
  const token = isShareToken(existingToken) ? existingToken : generateShareToken();
  const { data, error } = await supabase
    .from('candidate_cvs' as any)
    .update({
      share_token: token,
      is_public: true,
      shared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cvId)
    .select()
    .single();

  if (isShareColumnMissing(error)) {
    throw new Error('Sharing is not available yet. Apply the Career Tools share migration.');
  }
  if (error) throw error;
  return data as unknown as CandidateCV;
}

export async function disableCvSharing(cvId: string): Promise<CandidateCV> {
  const { data, error } = await supabase
    .from('candidate_cvs' as any)
    .update({
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cvId)
    .select()
    .single();

  if (isShareColumnMissing(error)) {
    throw new Error('Sharing is not available yet. Apply the Career Tools share migration.');
  }
  if (error) throw error;
  return data as unknown as CandidateCV;
}

export async function fetchPublicCvByToken(token: string): Promise<PublicCvRecord | null> {
  if (!isShareToken(token)) return null;

  const client = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  const { data, error } = await client
    .from('candidate_cvs' as any)
    .select('title, content, template_id')
    .eq('share_token', token)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    if (isShareColumnMissing(error)) return null;
    console.error('Failed to load shared CV', error);
    return null;
  }
  if (!data) return null;

  return {
    title: String((data as PublicCvRecord).title || 'CV'),
    content: (data as PublicCvRecord).content,
    template_id: (data as PublicCvRecord).template_id ?? null,
  };
}
