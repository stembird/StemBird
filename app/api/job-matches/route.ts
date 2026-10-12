import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callAI, hasAIConfigured } from '@/lib/aiProviders';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';

export const runtime = 'nodejs';

/**
 * POST /api/job-matches
 * AI-powered job matching: reads candidate profile, sends to AI with active jobs,
 * returns scored matches with human-readable reasons.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasAIConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'AI matching is not available. Please try again later.',
      });
    }

    // Auth: get user from session cookie
    const cookie = request.headers.get('cookie') || '';

    const supabaseUser = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { cookie } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Admin client for writes (bypasses RLS)
    const supabaseAdmin = createServiceRoleClient();

    // 1. Read candidate profile
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select(`
        *,
        skills:candidate_skills(skill_name),
        preferences:candidate_preferences(*)
      `)
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({
        success: false,
        message: 'Complete your profile first to get job matches.',
      });
    }

    // 2. Get jobs user already applied to
    const { data: appliedRows } = await supabaseAdmin
      .from('job_applications')
      .select('job_id')
      .eq('user_id', user.id);
    const appliedIds = new Set((appliedRows || []).map((r: any) => r.job_id));

    // 3. Fetch active jobs
    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('id, title, company, location, description, employment_type, experience_level, minimum_experience, salary_min, salary_max, salary_currency, job_function, industry, tags')
      .eq('status', 'active')
      .eq('listing_kind', 'job')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: false, message: 'No active jobs available.' });
    }

    // Filter out applied jobs
    const availableJobs = jobs.filter((j: any) => !appliedIds.has(j.id));
    if (availableJobs.length === 0) {
      return NextResponse.json({ success: false, message: 'You have applied to all available jobs.' });
    }

    // 4. Build profile summary for AI
    const skills = (profile.skills || []).map((s: any) => s.skill_name).join(', ');
    const prefs = Array.isArray(profile.preferences) && profile.preferences.length > 0
      ? profile.preferences[0] : null;

    const profileSummary = [
      `Name: ${profile.full_name || 'Candidate'}`,
      `Current/Past Title: ${profile.current_title || profile.previous_title || 'Not specified'}`,
      `Location: ${profile.location || 'Kenya'}`,
      `Years of Experience: ${profile.years_experience || 'Not specified'}`,
      `Skills: ${skills || 'Not specified'}`,
      `Industry: ${profile.industry || 'Not specified'}`,
      `Education: ${profile.highest_education_level || 'Not specified'}`,
      `Expected Salary: ${profile.expected_salary_min || '?'} - ${profile.expected_salary_max || '?'} KES`,
      prefs?.preferred_job_functions?.length ? `Preferred Functions: ${prefs.preferred_job_functions.join(', ')}` : '',
      prefs?.preferred_locations?.length ? `Preferred Locations: ${prefs.preferred_locations.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    // 5. Build job list for AI (compact format to fit in context window)
    const jobList = availableJobs.slice(0, 60).map((j: any) =>
      `[${j.id}] ${j.title} | ${j.company || 'Unknown'} | ${j.location || 'Kenya'} | ${j.employment_type || 'Full-time'} | Exp: ${j.minimum_experience || '?'}y | Salary: ${j.salary_min || '?'}-${j.salary_max || '?'} KES | ${j.industry || ''}`
    ).join('\n');

    // 6. Call AI
    const systemPrompt = `You are a career matching expert for the Kenyan job market. Your task is to evaluate how well each job matches the candidate's profile.

Consider:
- Semantic skill fit (not just exact keywords - e.g., "React Native" relates to mobile development skills)
- Transferable experience (e.g., Python developer could match a Django role)
- Career trajectory (e.g., junior developer matching mid-level roles if skills align)
- Location and salary alignment
- Industry and function preferences

Score each job 0-100 and provide a brief, specific reason (one sentence) explaining why it's a good or poor match.
Return ONLY valid JSON array. No markdown fences. No explanation outside the JSON.`;

    const userPrompt = `CANDIDATE PROFILE:
${profileSummary}

JOBS TO EVALUATE:
${jobList}

Return JSON array (max 15 best matches, sorted by score descending):
[{"jobId":"<uuid>","score":85,"reason":"Your React and TypeScript skills align well with their frontend stack"}]`;

    const result = await callAI(userPrompt, {
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3,
      json: true,
    });

    const aiMatches: Array<{ jobId: string; score: number; reason: string }> = result.parsed || [];

    if (!aiMatches.length) {
      return NextResponse.json({ success: false, message: 'No suitable matches found by AI.' });
    }

    // 7. Build full match records with job data
    const jobMap = new Map(availableJobs.map((j: any) => [j.id, j]));
    const validMatches = aiMatches
      .filter(m => jobMap.has(m.jobId) && m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 8. Save to job_recommendations (upsert, expire old ones first)
    // Expire old recommendations for this user
    await supabaseAdmin
      .from('job_recommendations')
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('viewed', false);

    // Insert new matches
    const records = validMatches.map(m => {
      const job = jobMap.get(m.jobId);
      return {
        user_id: user.id,
        job_id: m.jobId,
        match_score: Math.min(100, Math.max(0, m.score)),
        skills_match_score: m.score, // AI provides holistic score
        experience_match_score: m.score,
        location_match_score: m.score,
        salary_match_score: m.score,
        match_details: { reason: m.reason, ai_provider: result.provider },
      };
    });

    if (records.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('job_recommendations')
        .upsert(records, { onConflict: 'user_id,job_id' });

      if (insertError) {
        console.error('[job-matches] Insert error:', insertError.message);
      }
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      matches: validMatches.map(m => ({
        jobId: m.jobId,
        score: m.score,
        reason: m.reason,
        job: jobMap.get(m.jobId),
      })),
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('[job-matches] Error:', error.message);
    return NextResponse.json({
      success: false,
      message: 'Unable to find matches right now. Try again later.',
    }, { status: 500 });
  }
}
