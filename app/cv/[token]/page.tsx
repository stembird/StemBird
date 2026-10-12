import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicCvView from '@/components/cv/PublicCvView';
import { fetchPublicCvByToken } from '@/lib/cvShare';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';

export const dynamic = 'force-dynamic';

async function templateNameFor(templateId: string | null): Promise<string> {
  if (!templateId) return 'Classic Professional';
  const client = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  const { data } = await client
    .from('cv_templates')
    .select('name')
    .eq('id', templateId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name || 'Classic Professional';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const cv = await fetchPublicCvByToken(token);
  if (!cv) return { title: 'CV', robots: { index: false, follow: false } };
  const name = (cv.content as { personal?: { name?: string } } | null)?.personal?.name;
  return {
    title: name ? `${name} – CV` : cv.title,
    robots: { index: false, follow: false },
  };
}

export default async function PublicCvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cv = await fetchPublicCvByToken(token);
  if (!cv) notFound();

  const templateName = await templateNameFor(cv.template_id);
  return <PublicCvView title={cv.title} content={cv.content} templateName={templateName} />;
}
