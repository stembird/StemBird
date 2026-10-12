-- Cover Letter Templates: 8 templates across 3 categories
-- Mirrors the CV template structure for consistency

-- Clear existing seeded templates to avoid duplicates
DELETE FROM cover_letter_templates WHERE name IN (
  'Classic Professional Cover Letter',
  'Modern Professional Cover Letter',
  'Short & Direct Cover Letter',
  'Graduate / Entry-Level Cover Letter',
  'Internship / Attachment Cover Letter',
  'Career Change Cover Letter',
  'Personal Brand Cover Letter',
  'International / ATS-Friendly Cover Letter'
);

-- ============================================================================
-- CATEGORY 1: PROFESSIONAL COVER LETTERS
-- ============================================================================

INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders, is_premium, is_active) VALUES
(
  'Classic Professional Cover Letter',
  'A formal, structured cover letter with traditional formatting. The safest option — works for government, NGOs, banking, corporate, and administrative roles.',
  'professional',
  '[Your Name]
[Your Address]
[City, Country]
[Phone] | [Email]
[Date]

The Hiring Manager
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR THE POSITION OF {{job_title}}

I write to express my interest in the above-mentioned position as advertised. With {{years_experience}} years of experience in {{industry}}, I am confident that my qualifications and professional background make me a strong candidate for this role.

In my current/previous role as {{current_role}} at {{current_company}}, I have {{key_achievement}}. I have developed strong competencies in {{key_skills}}, which I believe align well with the requirements of this position.

{{custom_paragraph}}

I am particularly drawn to {{company_name}} because of {{company_reason}}. I am eager to bring my expertise and dedication to your esteemed organisation and contribute meaningfully to your team.

I have attached my curriculum vitae for your consideration. I would welcome the opportunity to discuss my application further at your convenience.

Yours faithfully,

{{candidate_name}}',
  '{"placeholders": ["company_name", "company_address", "hiring_manager", "job_title", "years_experience", "industry", "current_role", "current_company", "key_achievement", "key_skills", "custom_paragraph", "company_reason", "candidate_name"]}',
  false,
  true
),

(
  'Modern Professional Cover Letter',
  'A cleaner layout with better spacing and a contemporary tone. Ideal for private sector, marketing, business, and mid-level professional roles.',
  'professional',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{job_title}} Hiring Team
{{company_name}}

Dear {{hiring_manager}},

I am excited to apply for the {{job_title}} role at {{company_name}}. With a background in {{industry}} and {{years_experience}} years of hands-on experience, I bring a results-driven approach and a track record of {{key_achievement}}.

At {{current_company}}, I have honed my skills in {{key_skills}}. I thrive in environments that value {{work_value}}, and I am confident I can deliver similar results at {{company_name}}.

{{custom_paragraph}}

What draws me to {{company_name}} is {{company_reason}}. I am eager to contribute to your team and grow alongside your organisation.

I would love the opportunity to discuss how my experience aligns with your needs. Thank you for your time and consideration.

Best regards,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "industry", "years_experience", "key_achievement", "current_company", "key_skills", "work_value", "custom_paragraph", "company_reason"]}',
  false,
  true
),

(
  'Short & Direct Cover Letter',
  'A concise, high-impact letter of 3 short paragraphs. Perfect for startups, tech companies, online applications, and busy recruiters who value brevity.',
  'professional',
  'Hi {{hiring_manager}},

I am applying for the {{job_title}} position at {{company_name}}. I have {{years_experience}} years of experience in {{industry}} and a proven ability to {{key_achievement}}.

My core strengths — {{key_skills}} — match what you are looking for. At {{current_company}}, I {{specific_contribution}}.

I would love to bring this energy to {{company_name}}. Happy to chat at your convenience.

{{candidate_name}}
{{candidate_phone}} | {{candidate_email}}',
  '{"placeholders": ["hiring_manager", "job_title", "company_name", "years_experience", "industry", "key_achievement", "key_skills", "current_company", "specific_contribution", "candidate_name", "candidate_phone", "candidate_email"]}',
  false,
  true
),

-- ============================================================================
-- CATEGORY 2: ENTRY-LEVEL COVER LETTERS
-- ============================================================================

(
  'Graduate / Entry-Level Cover Letter',
  'Focuses on education, projects, and potential rather than experience. Solves the "I don''t have experience" problem for fresh graduates and first-time job seekers.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

The Hiring Manager
{{company_name}}

Dear {{hiring_manager}},

RE: APPLICATION FOR {{job_title}}

I am a recent graduate of {{institution}} with a {{degree}} in {{field_of_study}}, and I am eager to begin my professional career with {{company_name}}.

Although I am at the start of my career, I have built a strong foundation through my academic work and practical experiences. During my studies, I {{academic_achievement}}. I also {{project_or_internship}}, which gave me hands-on exposure to {{relevant_skills}}.

I am a fast learner, highly motivated, and committed to delivering quality work. I am particularly drawn to {{company_name}} because {{company_reason}}, and I believe this role will allow me to grow while contributing meaningfully to your team.

I would be grateful for the opportunity to discuss my application. Please find my CV attached.

Yours sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "institution", "degree", "field_of_study", "academic_achievement", "project_or_internship", "relevant_skills", "company_reason"]}',
  false,
  true
),

(
  'Internship / Attachment Cover Letter',
  'Tailored for students applying for industrial attachment or internships. Highly relevant for university and TVET students in Kenya.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}
{{institution}} — {{course}} (Year {{year_of_study}})

{{date}}

The Supervisor / HR Manager
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR INDUSTRIAL ATTACHMENT / INTERNSHIP — {{department}}

I am a {{year_of_study}}-year student pursuing a {{course}} at {{institution}}. I am writing to apply for an industrial attachment opportunity at {{company_name}} as part of my academic programme requirements.

I am keen to gain practical experience in {{department}} and believe that {{company_name}} offers an ideal environment for this. Through my coursework, I have developed foundational knowledge in {{relevant_skills}}. I am also {{personal_quality}}, which I believe will allow me to contribute positively during my attachment period.

I am available for attachment from {{start_date}} to {{end_date}} and am flexible to work within your team''s schedule.

I would be grateful for the chance to learn from your team. I have attached my CV and a letter of introduction from my institution.

Yours faithfully,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "institution", "course", "year_of_study", "date", "hiring_manager", "company_name", "company_address", "department", "relevant_skills", "personal_quality", "start_date", "end_date"]}',
  false,
  true
),

-- ============================================================================
-- CATEGORY 3: SPECIALIZED COVER LETTERS
-- ============================================================================

(
  'Career Change Cover Letter',
  'Helps candidates explain transitions between industries or roles. Ideal for career switchers, self-taught professionals, and people re-entering the workforce.',
  'specialized',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{company_name}}

Dear {{hiring_manager}},

I am writing to apply for the {{job_title}} position at {{company_name}}. While my background is in {{previous_industry}}, I have been intentionally building skills and experience in {{target_industry}} and am ready to make this transition fully.

Over the past {{transition_period}}, I have {{transition_actions}} — including {{specific_training_or_project}}. These experiences have equipped me with {{transferable_skills}}, which I believe are directly applicable to this role.

My time in {{previous_industry}} also gave me a unique perspective: {{unique_value}}. I see this as a strength that sets me apart from candidates with a more traditional background in {{target_industry}}.

I am genuinely passionate about {{target_industry}} and committed to growing in this field. I would welcome the opportunity to discuss how my background and drive can add value to {{company_name}}.

Thank you for your consideration.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "previous_industry", "target_industry", "transition_period", "transition_actions", "specific_training_or_project", "transferable_skills", "unique_value"]}',
  false,
  true
),

(
  'Personal Brand Cover Letter',
  'Highlights personality, online presence, and unique voice. Pairs perfectly with the Personal Brand CV for creatives, consultants, marketers, and public speakers.',
  'specialized',
  'Hi {{hiring_manager}},

I am {{candidate_name}} — {{personal_tagline}}.

I am reaching out about the {{job_title}} opportunity at {{company_name}}. I have been following your work in {{company_focus}} and I believe there is a strong alignment between what you are building and what I do best.

My work speaks for itself: {{portfolio_or_achievement}}. Whether it is {{skill_1}} or {{skill_2}}, I bring a distinctive approach that blends {{quality_1}} with {{quality_2}}.

You can see more of my work at {{portfolio_link}}. I would love to explore how I can contribute to {{company_name}}''s next chapter.

Let''s connect.

{{candidate_name}}
{{candidate_phone}} | {{candidate_email}} | {{portfolio_link}}',
  '{"placeholders": ["hiring_manager", "candidate_name", "personal_tagline", "job_title", "company_name", "company_focus", "portfolio_or_achievement", "skill_1", "skill_2", "quality_1", "quality_2", "portfolio_link", "candidate_phone", "candidate_email"]}',
  false,
  true
),

(
  'International / ATS-Friendly Cover Letter',
  'Simple, clean, keyword-focused format optimised for global applications, remote jobs, multinational companies, and ATS-based hiring systems.',
  'specialized',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

Hiring Team
{{job_title}} — {{company_name}}

Dear Hiring Team,

I am applying for the {{job_title}} position (Ref: {{job_ref}}) at {{company_name}}. I have {{years_experience}} years of experience in {{industry}}, with demonstrated expertise in {{keyword_skills}}.

In my most recent role as {{current_role}} at {{current_company}}, I {{quantified_achievement}}. I am proficient in {{tools_and_technologies}} and have a strong track record of {{core_competency}}.

I am particularly interested in {{company_name}} because of {{company_reason}}. I am available to work {{availability}} and am open to {{remote_or_relocation}}.

I look forward to the opportunity to contribute to your team.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "job_title", "company_name", "job_ref", "years_experience", "industry", "keyword_skills", "current_role", "current_company", "quantified_achievement", "tools_and_technologies", "core_competency", "company_reason", "availability", "remote_or_relocation"]}',
  false,
  true
);
