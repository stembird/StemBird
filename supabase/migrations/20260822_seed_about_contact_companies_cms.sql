-- Seed About Us, Contact Us, and Companies CMS rows so the admin editors are never empty.
-- Existing keys are left unchanged.

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('about', 'hero_title', 'text', 'About CareerSasa', '{}'::jsonb, 'About CareerSasa - Kenya''s Fastest Path from Job Search to Job Offer', 'Learn how CareerSasa uses AI-powered matching, free career tools, and verified job listings to help Kenyan professionals land interviews 3x faster than any other job board.', '/about', 'https://www.careersasa.co.ke/about', 'About CareerSasa', true, true),
  ('about', 'hero_subtitle', 'text', 'Kenya''s AI-Powered Job Platform. Where Skills Meet Opportunity', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_title', 'text', 'Why We Built CareerSasa', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p1', 'text', 'We watched thousands of talented Kenyans send 50, 100, even 200 applications and hear nothing back. Not for lack of qualifications. The system was broken. Generic job boards match keywords, not skills. Resumes disappear into black holes. And employers waste weeks sifting through unqualified applicants.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p2', 'text', 'CareerSasa was built to fix that. We use AI-powered matching that connects candidates to jobs they''ll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p3', 'text', 'The result? Our users report 3x more interview callbacks than on other platforms, and employers fill positions faster with candidates who actually fit the role.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'values_title', 'text', 'Our Core Values', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_speed_title', 'text', 'Speed', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_speed_body', 'text', 'Getting hired shouldn''t take months. Our AI matching and real-time alerts cut job search time in half. Every day without work is a day too long.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_transparency_title', 'text', 'Transparency', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_transparency_body', 'text', 'No hidden fees. No ghost listings. Every job is verified, every salary shown where possible, and every application tracked. You deserve honesty in your job search.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_fairness_title', 'text', 'Fairness', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_fairness_body', 'text', 'Your background shouldn''t determine your future. CareerSasa is free for every job seeker. The best candidate might be someone who can''t afford a KES 5,000 CV service.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_innovation_title', 'text', 'Kenyan-First Innovation', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_innovation_body', 'text', 'We build for Kenya''s job market, from county-specific job filters to M-Pesa-friendly pricing to Swahili-friendly support. International tools don''t understand our market. We do.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_title', 'text', 'CareerSasa by the Numbers', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_subtitle', 'text', 'Real results, not empty promises', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_jobs_value', 'text', '1,070+', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_jobs_label', 'text', 'Verified Active Jobs', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_companies_value', 'text', '103+', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_companies_label', 'text', 'Hiring Companies', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_callbacks_value', 'text', '3x', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_callbacks_label', 'text', 'More Interview Callbacks', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_title', 'text', 'What This Means for You', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_seeker', 'text', 'If you''re a job seeker: You get AI-matched to jobs that fit your actual skills, alerted in real time, and supported with free career tools, so you stop spraying applications and start landing interviews.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_employer', 'text', 'If you''re an employer: You get pre-screened, qualified candidates delivered to your inbox, not 500 unqualified applicants you have to sift through. Post your first 3 jobs free and see the difference yourself.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('contact', 'hero_title', 'text', 'Contact Us', '{}'::jsonb, 'Contact CareerSasa | Support for Job Seekers and Employers', 'Get in touch with CareerSasa. Email support@careersasa.co.ke or send a message — we typically respond within 24 hours on business days.', '/contact', 'https://www.careersasa.co.ke/contact', 'Contact Us', true, true),
  ('contact', 'hero_subtitle', 'text', 'We''re here to help. Reach out with any questions or concerns.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_title', 'text', 'Send Us a Message', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_subtitle', 'text', 'Fill out the form below and we''ll get back to you soon.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_button', 'text', 'Send Message', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'info_title', 'text', 'Contact Information', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'email_label', 'text', 'Email', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'email_value', 'text', 'support@careersasa.co.ke', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_label', 'text', 'Business Hours', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_weekday', 'text', 'Monday - Friday: 8:00 AM - 6:00 PM', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_saturday', 'text', 'Saturday: 9:00 AM - 2:00 PM', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_sunday', 'text', 'Sunday: Closed', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'support_title', 'text', 'Quick Support', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'support_body', 'text', 'Email us anytime — we typically respond within 24 hours during business days.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'faq_title', 'text', 'FAQ', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'faq_body', 'text', 'Before reaching out, check our FAQ section for quick answers to common questions about job postings, applications, and account management.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('companies', 'eyebrow', 'text', 'Employers on CareerSasa', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('companies', 'hero_title', 'text', 'Companies', '{}'::jsonb, 'Companies by Industry | CareerSasa', 'Browse Kenyan employers by industry on CareerSasa. Pick a sector to see company profiles and open jobs.', '/companies', 'https://www.careersasa.co.ke/companies', 'Companies', true, true),
  ('companies', 'hero_subtitle', 'text', 'Choose an industry to explore employers hiring in Kenya — or browse all companies at once.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;
