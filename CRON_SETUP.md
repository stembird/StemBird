# Cron Job Setup for Job Management

This document explains how to set up automated tasks for job expiration, renewal, and promotion management.

## Overview

The job management system requires periodic tasks to:
1. Expire old jobs that have passed their expiration date
2. Auto-renew jobs with auto-renewal enabled
3. Expire promotions and featured status when duration ends

## Option 1: Vercel Cron Jobs (Recommended for Vercel Deployments)

### Setup

1. The `vercel.json` file is already configured with cron schedules
2. Add `CRON_SECRET` to your Vercel environment variables:
   ```bash
   vercel env add CRON_SECRET
   # Enter a secure random string
   ```

3. Deploy to Vercel - cron jobs will run automatically

### Schedules

- **Expire Jobs**: Daily at 2:00 AM UTC (`0 2 * * *`)
- **Auto-Renew Jobs**: Daily at 3:00 AM UTC (`0 3 * * *`)
- **Expire Promotions**: Daily at 4:00 AM UTC (`0 4 * * *`)
- **Enrich Company Logos**: Daily at 4:30 AM UTC (`30 4 * * *`)
- **Scrape Discover**: Every 4 hours (`0 */4 * * *`) — queues new jobs from active sources (needed for same-day MyJobMag / board volume)
- **Scrape Process**: Every 15 minutes (`*/15 * * * *`) — publishes pending queue items (default 20/run, Pro)
- **Email Automations**: Daily at 8:00 AM UTC (`0 8 * * *`)
- **Social Auto-Queue**: 03:00 and 07:00 UTC (`0 3,7 * * *`) — 06:00 and 10:00 EAT, so the Buffer 08:00 / 12:30 / 17:00 slots are filled before they fire.

### Endpoints

- `GET /api/cron/expire-jobs`
- `GET /api/cron/auto-renew-jobs`
- `GET /api/cron/expire-promotions`
- `GET /api/cron/enrich-company-logos`
- `GET /api/cron/scrape-discover`
- `GET /api/cron/scrape-process`
- `GET /api/cron/email-automations`
- `GET /api/cron/social-auto-queue`

## Option 2: PostgreSQL pg_cron Extension

### Setup

1. Enable pg_cron extension (requires superuser):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. Run the setup script:
   ```bash
   psql -f scripts/setup-job-management-cron.sql
   ```

3. Verify jobs are scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```

### Schedules

Same as Vercel option, but runs directly in the database.

## Option 3: External Cron Service (GitHub Actions, etc.)

### GitHub Actions Example

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Scheduled Cron Jobs

on:
  schedule:
    # Expire jobs - Daily at 2 AM UTC
    - cron: '0 2 * * *'
    # Auto-renew jobs - Daily at 3 AM UTC
    - cron: '0 3 * * *'
    # Expire promotions - Every hour
    - cron: '0 * * * *'

jobs:
  expire-jobs:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 2 * * *'
    steps:
      - name: Call expire-jobs endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/expire-jobs

  auto-renew-jobs:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 3 * * *'
    steps:
      - name: Call auto-renew-jobs endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/auto-renew-jobs

  expire-promotions:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 * * * *'
    steps:
      - name: Call expire-promotions endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/expire-promotions
```

### Other Services

You can use any cron service that can make HTTP requests:
- AWS EventBridge
- Google Cloud Scheduler
- Azure Logic Apps
- Cron-job.org
- EasyCron

## Manual Testing

Test the endpoints manually:

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret-here"

# Test expire jobs
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/expire-jobs

# Test auto-renew jobs
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/auto-renew-jobs

# Test expire promotions
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/expire-promotions
```

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "expired_count": 5,
  "timestamp": "2024-03-06T12:00:00.000Z"
}
```

Or for promotions:

```json
{
  "success": true,
  "expired_promotions": 3,
  "expired_featured": 2,
  "timestamp": "2024-03-06T12:00:00.000Z"
}
```

## Security

### CRON_SECRET

Always use a strong, random secret for `CRON_SECRET`:

```bash
# Generate a secure secret
openssl rand -base64 32
```

Add to your environment:
- Vercel: Project Settings → Environment Variables
- Local: `.env.local` file
- GitHub Actions: Repository Settings → Secrets

### Service Role Key

The cron endpoints use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Keep this secret secure and never expose it to the client.

## Monitoring

### Logs

Check cron job execution:

**Vercel:**
- Dashboard → Deployments → Functions → Cron Logs

**pg_cron:**
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**GitHub Actions:**
- Actions tab → Workflow runs

### Alerts

Set up alerts for failed cron jobs:
- Vercel: Integrations → Monitoring
- GitHub Actions: Workflow notifications
- Custom: Parse response and send to monitoring service

## Troubleshooting

### Jobs not expiring

1. Check cron is running:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://your-domain.com/api/cron/expire-jobs
   ```

2. Verify database function:
   ```sql
   SELECT expire_old_jobs();
   ```

3. Check job expiration dates:
   ```sql
   SELECT id, title, expires_at, status
   FROM jobs
   WHERE expires_at <= NOW()
   AND status = 'active';
   ```

### Auto-renew not working

1. Check auto_renew flag:
   ```sql
   SELECT id, title, auto_renew, expires_at
   FROM jobs
   WHERE auto_renew = TRUE;
   ```

2. Test renewal function:
   ```sql
   SELECT auto_renew_expired_jobs();
   ```

### Promotions not expiring

1. Check promotion dates:
   ```sql
   SELECT id, title, is_promoted, promotion_end_date
   FROM jobs
   WHERE is_promoted = TRUE
   AND promotion_end_date <= NOW();
   ```

2. Run manual update:
   ```sql
   UPDATE jobs
   SET is_promoted = FALSE
   WHERE promotion_end_date <= NOW();
   ```

## Best Practices

1. **Monitor execution**: Set up alerts for failed cron jobs
2. **Test regularly**: Run manual tests to verify functionality
3. **Log results**: Keep logs of cron job executions
4. **Backup strategy**: Have fallback if primary cron fails
5. **Time zones**: All times are UTC - adjust schedules accordingly
6. **Rate limits**: Don't run too frequently to avoid rate limits
7. **Idempotency**: Cron jobs are idempotent - safe to run multiple times

## Recommended Schedule

- **Expire jobs**: Once daily (low priority)
- **Auto-renew**: Once daily (after expiration check)
- **Expire promotions**: Hourly (time-sensitive)
- **Expire featured**: Hourly (time-sensitive)

## Job scraping (Vercel Pro)

Scrape crons require **Vercel Pro** (Hobby does not run production crons reliably).

Required env vars on Vercel:
- `CRON_SECRET` — Vercel sends `Authorization: Bearer <CRON_SECRET>`
- `SCRAPER_SECRET` — used by `/api/scrape-jobs/*` if called externally
- `SCRAPER_USER_ID` — admin user UUID that owns scraped jobs
- `SUPABASE_SERVICE_ROLE_KEY`
- AI keys for parsing (`DEEPSEEK_API_KEY` primary, `GEMINI_API_KEY*` backup)

Manual kickoff after deploy:
```bash
export CRON_SECRET="your-secret-here"

curl -X GET -H "Authorization: Bearer $CRON_SECRET" \
  https://careersasa.co.ke/api/cron/scrape-discover

curl -X GET -H "Authorization: Bearer $CRON_SECRET" \
  "https://careersasa.co.ke/api/cron/scrape-process?max=15"
```

Or use **Admin → Scraper Sources** → Discover all active / Process queue (10).

## Cost Considerations

- **Vercel Cron**: Included on Pro plan (required for scrape-discover / scrape-process)
- **pg_cron**: Free, runs in database
- **GitHub Actions**: 2000 minutes/month free
- **External services**: Varies by provider

Choose based on your deployment platform and budget.
