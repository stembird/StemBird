-- Add Skills-Focused Entry-Level Cover Letter Template
-- This template is for candidates with little or no formal experience but real, demonstrable skills.
-- Target audience: Self-taught professionals, freelancers, career starters, digital creatives

-- Remove if exists to avoid duplicates
DELETE FROM cover_letter_templates WHERE name = 'Skills-Focused Entry-Level Cover Letter';

-- Insert the new template
INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders, is_premium, is_active) VALUES
(
  'Skills-Focused Entry-Level Cover Letter',
  'For candidates with little or no formal experience who have real, demonstrable skills. Ideal for self-taught professionals, freelancers, career starters, and digital creatives who can do the work.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR {{job_title}}

I am writing to apply for the {{job_title}} position at {{company_name}}. Although I am at the early stage of my career, I have developed strong practical skills in {{field}} through self-learning and hands-on projects.

I have experience {{skill_application_1}} and {{skill_application_2}}. Through {{experience_source}}, I have built skills in {{key_competencies}}.

I am eager to grow in a professional environment where I can apply my skills, learn from experienced professionals, and contribute positively to your team.

KEY SKILLS:
{{key_skills}}

I would be grateful for the opportunity to discuss how my skills can benefit {{company_name}}. Please find my CV attached.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "company_name", "company_address", "job_title", "field", "skill_application_1", "skill_application_2", "experience_source", "key_competencies", "key_skills"]}',
  false,
  true
);
