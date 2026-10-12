/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.SITE_URL || 'https://www.careersasa.co.ke',
  generateRobotsTxt: true,
  exclude: [
    '/api/*',
    '/_next/*',
    '/_app/*',
    '/_document/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  additionalPaths: async (config) => {
    const result = [
      {
        loc: '/companies',
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: '/companies/industry/all',
        changefreq: 'daily',
        priority: 0.75,
      },
      {
        loc: '/jobs/industries',
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: '/jobs/functions',
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: '/jobs/counties',
        changefreq: 'daily',
        priority: 0.8,
      },
      {
        loc: '/scholarships',
        changefreq: 'daily',
        priority: 0.8,
      },
    ];
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js').then(m => m);
    
    // Get environment variables
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qxuvqrfqkdpfjfwkqatf.supabase.co';
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8';
    
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Supabase caps REST responses at 1000 rows by default; loop with offsets so
    // the sitemap never silently drops jobs/companies again.
    async function fetchAllPaginated(select, table, order, filter) {
      const rows = [];
      let from = 0;
      const pageSize = 1000;
      for (;;) {
        let query = supabase
          .from(table)
          .select(select)
          .order(order, { ascending: false })
          .range(from, from + pageSize - 1);
        if (filter) query = query.eq(filter[0], filter[1]);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return rows;
    }
    
    try {
      // Fetch all active jobs (paginated — a bare query silently caps at 1000)
      const jobs = await fetchAllPaginated(
        'id, job_slug, updated_at, listing_kind',
        'jobs',
        'updated_at',
        ['status', 'active']
      );
      
      jobs.forEach(job => {
        const isScholarship = job.listing_kind === 'scholarship';
        result.push({
          loc: `/${isScholarship ? 'scholarships' : 'jobs'}/${job.job_slug || job.id}`,
          lastmod: job.updated_at,
          changefreq: 'daily',
          priority: 0.8,
        });
      });
    } catch (error) {
      console.error('Error generating job URLs for sitemap:', error);
    }

    try {
      // Public company profile pages (paginated)
      const companies = await fetchAllPaginated('id, updated_at', 'companies', 'updated_at');
      companies.forEach(company => {
        result.push({
          loc: `/companies/${company.id}`,
          lastmod: company.updated_at,
          changefreq: 'weekly',
          priority: 0.7,
        });
      });
    } catch (error) {
      console.error('Error generating company URLs for sitemap:', error);
    }

    try {
      const { data: industries, error: industriesError } = await supabase
        .from('industries')
        .select('name')
        .order('name');

      if (industriesError) {
        console.error('Error fetching industries for sitemap:', industriesError);
      } else {
        const toSlug = (name) =>
          String(name || '')
            .toLowerCase()
            .trim()
            .replace(/&/g, ' and ')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        industries.forEach((industry) => {
          result.push({
            loc: `/companies/industry/${toSlug(industry.name)}`,
            changefreq: 'daily',
            priority: 0.7,
          });
        });
      }
    } catch (error) {
      console.error('Error generating industry URLs for sitemap:', error);
    }
    
    return result;
  },
};