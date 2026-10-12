import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callAI, hasAIConfigured } from '@/lib/aiProviders';
import {
  buildSuggestMessages,
  filterGroundedSuggestions,
  hasEnoughSourceFacts,
  parseSuggestRequest,
  parseSuggestResponse,
  suggestCorpus,
  usageSnapshot,
} from '@/lib/careerSuggest';
import { consumeSuggestUsage, readSuggestUsage } from '@/lib/careerSuggestUsage';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';

export const runtime = 'nodejs';

function userClientFromRequest(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const cookie = request.headers.get('cookie') || '';
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : { cookie },
    },
  });
}

async function requireUser(request: NextRequest) {
  const client = userClientFromRequest(request);
  const { data: { user } } = await client.auth.getUser();
  return { client, user };
}

export async function GET(request: NextRequest) {
  const { client, user } = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use Career Tools suggestions' }, { status: 401 });
  }
  const usage = await readSuggestUsage(client, user.id);
  return NextResponse.json({ usage, aiConfigured: hasAIConfigured() });
}

export async function POST(request: NextRequest) {
  try {
    const { client, user } = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in to use Career Tools suggestions' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseSuggestRequest(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!hasEnoughSourceFacts(parsed)) {
      return NextResponse.json(
        { error: 'Add more CV or letter facts first. Suggestions only rewrite what is already on the document.' },
        { status: 400 },
      );
    }

    if (!hasAIConfigured()) {
      const current = await readSuggestUsage(client, user.id);
      return NextResponse.json(
        { error: 'AI suggestions are not configured on this server.', usage: current },
        { status: 503 },
      );
    }

    const usage = await consumeSuggestUsage(client, user.id);
    if (!usage) {
      const current = await readSuggestUsage(client, user.id);
      return NextResponse.json(
        { error: `Daily suggestion limit reached (${current.limit}/day). Try again tomorrow.`, usage: current },
        { status: 429 },
      );
    }

    const { systemPrompt, userPrompt } = buildSuggestMessages(parsed);
    const result = await callAI(userPrompt, {
      systemPrompt,
      json: true,
      temperature: 0.3,
      maxTokens: 700,
    });

    const grounded = filterGroundedSuggestions(
      parseSuggestResponse(result.parsed),
      suggestCorpus(parsed),
    );

    if (grounded.length === 0) {
      return NextResponse.json(
        {
          error: 'No grounded rewrite came back. Add more detail to the field, or try again.',
          suggestions: [],
          usage,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      suggestions: grounded,
      kind: parsed.kind,
      usage,
      model: result.model,
    });
  } catch (error: any) {
    console.error('career-tools/suggest', error);
    return NextResponse.json(
      { error: error.message || 'Could not generate a suggestion' },
      { status: 500 },
    );
  }
}
