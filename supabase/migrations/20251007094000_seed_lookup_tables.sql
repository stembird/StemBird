-- Seed lookup tables: education_levels, experience_levels, job_functions, industries
BEGIN;

-- Education Levels
INSERT INTO public.education_levels (name, slug)
VALUES
  ('KCSE', 'kcse'),
  ('Diploma', 'diploma'),
  ('Bachelor’s', 'bachelors'),
  ('Master’s', 'masters'),
  ('PhD', 'phd')
ON CONFLICT (name) DO NOTHING;

-- Experience Levels
INSERT INTO public.experience_levels (name, slug, description)
VALUES
  ('Internship', 'internship', 'For students, fresh graduates, or field entry'),
  ('Entry Level', 'entry-level', '0–2 years, training and supervision common'),
  ('Mid Level', 'mid-level', '2–5 years, growing autonomy'),
  ('Senior Level', 'senior-level', '5–10 years, leads projects, mentors'),
  ('Management / Supervisory', 'management-supervisory', 'Team leads, supervisors, heads'),
  ('Executive / Director', 'executive-director', 'Top leadership and strategy'),
  ('Volunteer / Casual', 'volunteer-casual', 'Unpaid/part-time roles (optional)')
ON CONFLICT (name) DO NOTHING;

-- Job Functions (Kenya)
INSERT INTO public.job_functions (name, slug)
VALUES
  ('Accounting, Auditing & Finance', 'accounting-auditing-finance'),
  ('Admin & Office', 'admin-office'),
  ('Agriculture, Food & Natural Resources', 'agriculture-food-natural-resources'),
  ('Building & Architecture', 'building-architecture'),
  ('Community & Social Services', 'community-social-services'),
  ('Consulting & Strategy', 'consulting-strategy'),
  ('Creative & Design', 'creative-design'),
  ('Customer Service & Support', 'customer-service-support'),
  ('Driver & Transport Services', 'driver-transport-services'),
  ('Education & Training', 'education-training'),
  ('Engineering & Technology', 'engineering-technology'),
  ('Environment, Energy & Natural Resources', 'environment-energy-natural-resources'),
  ('Estate Agents & Property Management', 'estate-agents-property-management'),
  ('Farming & Veterinary', 'farming-veterinary'),
  ('Food Services & Catering', 'food-services-catering'),
  ('Health & Safety', 'health-safety'),
  ('Healthcare & Medical', 'healthcare-medical'),
  ('Hospitality & Leisure', 'hospitality-leisure'),
  ('Human Resources & Recruitment', 'human-resources-recruitment'),
  ('IT & Software', 'it-software'),
  ('Legal Services', 'legal-services'),
  ('Management & Business Development', 'management-business-development'),
  ('Manufacturing & Warehousing', 'manufacturing-warehousing'),
  ('Marketing & Communications', 'marketing-communications'),
  ('Product & Project Management', 'product-project-management'),
  ('Quality Control & Assurance', 'quality-control-assurance'),
  ('Research, Teaching & Training', 'research-teaching-training'),
  ('Sales', 'sales'),
  ('Security', 'security'),
  ('Supply Chain & Procurement', 'supply-chain-procurement'),
  ('Trades & Services', 'trades-services'),
  ('Travel, Tourism & Leisure', 'travel-tourism-leisure'),
  ('Volunteer & NGO Work', 'volunteer-ngo-work'),
  ('Government & Public Service', 'government-public-service'),
  ('Banking, Insurance & Financial Services', 'banking-insurance-financial-services'),
  ('Media, Advertising & PR', 'media-advertising-pr'),
  ('Science & Laboratory', 'science-laboratory'),
  ('Telecommunications', 'telecommunications'),
  ('Sports, Fitness & Recreation', 'sports-fitness-recreation'),
  ('NGO, NPO & Charity', 'ngo-npo-charity'),
  ('Beauty, Wellness & Fitness', 'beauty-wellness-fitness'),
  ('Real Estate & Construction', 'real-estate-construction'),
  ('Logistics & Transportation', 'logistics-transportation'),
  ('Retail, Fashion & FMCG', 'retail-fashion-fmcg'),
  ('Maintenance, Repair & Installation', 'maintenance-repair-installation'),
  ('Data, Analytics & AI', 'data-analytics-ai'),
  ('Other / Miscellaneous', 'other-miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- Industries (Kenya)
INSERT INTO public.industries (name, slug)
VALUES
  ('Accounting, Auditing & Finance', 'accounting-auditing-finance'),
  ('Advertising, Media & Communications', 'advertising-media-communications'),
  ('Agriculture, Fishing & Forestry', 'agriculture-fishing-forestry'),
  ('Automotive & Aviation', 'automotive-aviation'),
  ('Banking, Insurance & Financial Services', 'banking-insurance-financial-services'),
  ('Building, Construction & Real Estate', 'building-construction-real-estate'),
  ('Charity, NGO & Non-Profit', 'charity-ngo-non-profit'),
  ('Community & Social Services', 'community-social-services'),
  ('Consulting & Professional Services', 'consulting-professional-services'),
  ('Creative Arts, Entertainment & Design', 'creative-arts-entertainment-design'),
  ('Education & Training', 'education-training'),
  ('Energy, Utilities & Waste Management', 'energy-utilities-waste-management'),
  ('Engineering & Technical Services', 'engineering-technical-services'),
  ('Environment & Natural Resources', 'environment-natural-resources'),
  ('Fashion & Beauty', 'fashion-beauty'),
  ('Food Services, Hospitality & Catering', 'food-services-hospitality-catering'),
  ('Government & Public Administration', 'government-public-administration'),
  ('Healthcare, Medical & Pharmaceutical', 'healthcare-medical-pharmaceutical'),
  ('Human Resources & Recruitment', 'human-resources-recruitment'),
  ('ICT & Telecommunications', 'ict-telecommunications'),
  ('Import & Export', 'import-export'),
  ('Legal Services', 'legal-services'),
  ('Logistics & Transportation', 'logistics-transportation'),
  ('Manufacturing & Warehousing', 'manufacturing-warehousing'),
  ('Marketing & Public Relations', 'marketing-public-relations'),
  ('Mining, Oil & Gas', 'mining-oil-gas'),
  ('NGO, NPO & Charity', 'ngo-npo-charity'),
  ('Printing, Publishing & Packaging', 'printing-publishing-packaging'),
  ('Real Estate & Property Management', 'real-estate-property-management'),
  ('Research, Science & Technology', 'research-science-technology'),
  ('Retail, Wholesale, E-commerce & FMCG', 'retail-wholesale-ecommerce-fmcg'),
  ('Security & Defence', 'security-defence'),
  ('Sports, Fitness & Recreation', 'sports-fitness-recreation'),
  ('Tourism, Travel & Leisure', 'tourism-travel-leisure'),
  ('Agriculture & Agribusiness', 'agriculture-agribusiness'),
  ('Financial Technology (FinTech)', 'financial-technology-fintech'),
  ('Media, Film & Broadcasting', 'media-film-broadcasting'),
  ('Maritime & Shipping', 'maritime-shipping'),
  ('Education Technology (EdTech)', 'education-technology-edtech'),
  ('Arts, Culture & Heritage', 'arts-culture-heritage'),
  ('Renewable Energy & Climate', 'renewable-energy-climate'),
  ('Chemical & Process Industry', 'chemical-process-industry'),
  ('Transport & Infrastructure', 'transport-infrastructure'),
  ('Business Process Outsourcing (BPO)', 'business-process-outsourcing-bpo'),
  ('Health Tech & Biotechnology', 'health-tech-biotechnology'),
  ('Non-classified / Miscellaneous', 'non-classified-miscellaneous')
ON CONFLICT (name) DO NOTHING;

COMMIT;


