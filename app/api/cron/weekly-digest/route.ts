import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import { sendWeeklyDigest } from '@/lib/email';

/**
 * GET /api/cron/weekly-digest
 * Sends a weekly digest to users who opted in.
 * Should be called once per week (e.g., Monday morning).
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get users who opted into weekly digest
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('weekly_digest', true)
      .not('email', 'is', null);

    if (profilesError) {
      console.error('[Cron:WeeklyDigest] Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No users opted in', sent: 0 });
    }

    // Get featured jobs from the last week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: featuredJobs } = await supabase
      .from('jobs')
      .select('id, title, job_location_city, company_id')
      .eq('status', 'active')
      .eq('listing_kind', 'job')
      .gte('created_at', weekAgo.toISOString())
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    const jobs = (featuredJobs || []).map(j => ({
      id: j.id,
      title: j.title,
      company: '', // Would need a join to companies table
      location: j.job_location_city || 'Kenya',
    }));

    // Get recent blog posts as "tips"
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';
    const tips = (blogPosts || []).map(p => ({
      title: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
    }));

    let sent = 0;
    let failed = 0;

    // Send to each opted-in user
    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        const result = await sendWeeklyDigest(
          profile.email,
          profile.full_name || 'there',
          jobs,
          tips,
          profile.id
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Cron:WeeklyDigest] Failed to send to ${profile.email}:`, err);
        failed++;
      }

      // Rate limit between sends
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      total: profiles.length,
      sent,
      failed,
      jobs_count: jobs.length,
      tips_count: tips.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron:WeeklyDigest] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
