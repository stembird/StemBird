-- Migration: Seed salary_data with Kenyan market salary data
-- Description: The salary_data table only had 6 US rows. This adds realistic
-- Kenyan salary data across common job families so the Salary Insights tool
-- returns useful results for CareerSasa users.

-- ============================================================================
-- KENYAN SALARY DATA (monthly, in KES)
-- ============================================================================

INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, currency, industry, company_size, remote_type) VALUES
-- Technology
('Software Engineer', 'Nairobi', 'Kenya', 'entry', 60000, 120000, 80000, 'KES', 'Technology', 'medium', 'hybrid'),
('Software Engineer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Technology', 'large', 'hybrid'),
('Software Engineer', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Technology', 'large', 'hybrid'),
('Software Developer', 'Nairobi', 'Kenya', 'entry', 50000, 100000, 70000, 'KES', 'Technology', 'medium', 'onsite'),
('Software Developer', 'Nairobi', 'Kenya', 'mid', 100000, 200000, 150000, 'KES', 'Technology', 'medium', 'hybrid'),
('Software Developer', 'Nairobi', 'Kenya', 'senior', 200000, 450000, 300000, 'KES', 'Technology', 'large', 'hybrid'),
('Frontend Developer', 'Nairobi', 'Kenya', 'entry', 50000, 100000, 70000, 'KES', 'Technology', 'medium', 'hybrid'),
('Frontend Developer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Technology', 'large', 'hybrid'),
('Backend Developer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Technology', 'large', 'hybrid'),
('Full Stack Developer', 'Nairobi', 'Kenya', 'mid', 130000, 280000, 200000, 'KES', 'Technology', 'large', 'hybrid'),
('DevOps Engineer', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Technology', 'large', 'remote'),
('Data Analyst', 'Nairobi', 'Kenya', 'entry', 50000, 90000, 65000, 'KES', 'Technology', 'medium', 'onsite'),
('Data Analyst', 'Nairobi', 'Kenya', 'mid', 90000, 180000, 130000, 'KES', 'Technology', 'large', 'hybrid'),
('Data Scientist', 'Nairobi', 'Kenya', 'mid', 150000, 350000, 250000, 'KES', 'Technology', 'large', 'hybrid'),
('Product Manager', 'Nairobi', 'Kenya', 'mid', 180000, 350000, 250000, 'KES', 'Technology', 'large', 'hybrid'),
('Product Manager', 'Nairobi', 'Kenya', 'senior', 350000, 600000, 450000, 'KES', 'Technology', 'large', 'hybrid'),
('UI/UX Designer', 'Nairobi', 'Kenya', 'entry', 45000, 80000, 60000, 'KES', 'Technology', 'medium', 'onsite'),
('UI/UX Designer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'hybrid'),
('IT Support', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Technology', 'medium', 'onsite'),
('IT Support', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Technology', 'large', 'onsite'),
('System Administrator', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'onsite'),
('Cybersecurity Analyst', 'Nairobi', 'Kenya', 'mid', 120000, 280000, 200000, 'KES', 'Technology', 'large', 'hybrid'),
('QA Engineer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'hybrid'),

-- Marketing & Communications
('Marketing Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Marketing', 'large', 'onsite'),
('Marketing Manager', 'Nairobi', 'Kenya', 'senior', 250000, 450000, 350000, 'KES', 'Marketing', 'large', 'hybrid'),
('Digital Marketing', 'Nairobi', 'Kenya', 'entry', 40000, 80000, 55000, 'KES', 'Marketing', 'medium', 'onsite'),
('Digital Marketing', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'large', 'hybrid'),
('Content Writer', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Marketing', 'medium', 'remote'),
('Content Writer', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Marketing', 'large', 'remote'),
('Social Media Manager', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 50000, 'KES', 'Marketing', 'medium', 'hybrid'),
('Social Media Manager', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Marketing', 'large', 'hybrid'),
('Communications Officer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'large', 'onsite'),
('Brand Manager', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Marketing', 'large', 'onsite'),

-- Finance & Accounting
('Accountant', 'Nairobi', 'Kenya', 'entry', 45000, 80000, 60000, 'KES', 'Finance', 'medium', 'onsite'),
('Accountant', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Finance', 'large', 'onsite'),
('Accountant', 'Nairobi', 'Kenya', 'senior', 180000, 350000, 250000, 'KES', 'Finance', 'large', 'onsite'),
('Financial Analyst', 'Nairobi', 'Kenya', 'entry', 60000, 100000, 75000, 'KES', 'Finance', 'large', 'onsite'),
('Financial Analyst', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Finance', 'large', 'hybrid'),
('Finance Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Finance', 'large', 'onsite'),
('Auditor', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Finance', 'large', 'onsite'),

-- Human Resources
('HR Officer', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 50000, 'KES', 'Human Resources', 'medium', 'onsite'),
('HR Officer', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Human Resources', 'large', 'onsite'),
('HR Manager', 'Nairobi', 'Kenya', 'senior', 180000, 380000, 280000, 'KES', 'Human Resources', 'large', 'onsite'),
('Recruiter', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Human Resources', 'medium', 'onsite'),
('Recruiter', 'Nairobi', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Human Resources', 'large', 'hybrid'),

-- Sales & Business Development
('Sales Representative', 'Nairobi', 'Kenya', 'entry', 35000, 70000, 50000, 'KES', 'Sales', 'medium', 'onsite'),
('Sales Representative', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Sales', 'large', 'onsite'),
('Sales Manager', 'Nairobi', 'Kenya', 'senior', 180000, 400000, 280000, 'KES', 'Sales', 'large', 'onsite'),
('Business Development', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Sales', 'large', 'hybrid'),
('Business Development', 'Nairobi', 'Kenya', 'senior', 220000, 450000, 320000, 'KES', 'Sales', 'large', 'hybrid'),

-- Operations & Administration
('Operations Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Operations', 'large', 'onsite'),
('Operations Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Operations', 'large', 'onsite'),
('Administrative Assistant', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Administration', 'medium', 'onsite'),
('Administrative Assistant', 'Nairobi', 'Kenya', 'mid', 55000, 100000, 75000, 'KES', 'Administration', 'large', 'onsite'),
('Project Manager', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Operations', 'large', 'hybrid'),
('Project Manager', 'Nairobi', 'Kenya', 'senior', 300000, 550000, 400000, 'KES', 'Operations', 'large', 'hybrid'),
('Supply Chain Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Operations', 'large', 'onsite'),

-- Engineering (non-IT)
('Civil Engineer', 'Nairobi', 'Kenya', 'entry', 50000, 90000, 65000, 'KES', 'Engineering', 'medium', 'onsite'),
('Civil Engineer', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),
('Electrical Engineer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Engineering', 'large', 'onsite'),
('Mechanical Engineer', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),

-- Healthcare
('Nurse', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Nurse', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Healthcare', 'large', 'onsite'),
('Doctor', 'Nairobi', 'Kenya', 'entry', 100000, 200000, 150000, 'KES', 'Healthcare', 'large', 'onsite'),
('Doctor', 'Nairobi', 'Kenya', 'senior', 250000, 600000, 400000, 'KES', 'Healthcare', 'large', 'onsite'),
('Pharmacist', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Healthcare', 'large', 'onsite'),

-- Education
('Teacher', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Education', 'medium', 'onsite'),
('Teacher', 'Nairobi', 'Kenya', 'mid', 55000, 100000, 75000, 'KES', 'Education', 'large', 'onsite'),
('Lecturer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Education', 'large', 'onsite'),
('Lecturer', 'Nairobi', 'Kenya', 'senior', 220000, 400000, 300000, 'KES', 'Education', 'large', 'onsite'),

-- Legal
('Legal Officer', 'Nairobi', 'Kenya', 'entry', 60000, 100000, 75000, 'KES', 'Legal', 'medium', 'onsite'),
('Legal Officer', 'Nairobi', 'Kenya', 'mid', 100000, 250000, 170000, 'KES', 'Legal', 'large', 'onsite'),
('Lawyer', 'Nairobi', 'Kenya', 'mid', 150000, 350000, 250000, 'KES', 'Legal', 'large', 'onsite'),
('Lawyer', 'Nairobi', 'Kenya', 'senior', 350000, 700000, 500000, 'KES', 'Legal', 'large', 'onsite'),

-- Customer Service
('Customer Service', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Customer Service', 'medium', 'onsite'),
('Customer Service', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Customer Service', 'large', 'onsite'),
('Customer Service Manager', 'Nairobi', 'Kenya', 'senior', 120000, 250000, 180000, 'KES', 'Customer Service', 'large', 'onsite'),

-- Mombasa (second largest city, slightly lower salaries)
('Software Engineer', 'Mombasa', 'Kenya', 'mid', 80000, 180000, 130000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Mombasa', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Finance', 'medium', 'onsite'),
('Marketing Manager', 'Mombasa', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'medium', 'onsite'),
('Sales Representative', 'Mombasa', 'Kenya', 'entry', 25000, 55000, 40000, 'KES', 'Sales', 'medium', 'onsite'),
('Teacher', 'Mombasa', 'Kenya', 'entry', 25000, 45000, 35000, 'KES', 'Education', 'medium', 'onsite'),

-- Remote / general Kenya
('Virtual Assistant', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Administration', 'small', 'remote'),
('Virtual Assistant', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Administration', 'medium', 'remote'),
('Graphic Designer', 'Nairobi', 'Kenya', 'entry', 35000, 65000, 45000, 'KES', 'Marketing', 'medium', 'remote'),
('Graphic Designer', 'Nairobi', 'Kenya', 'mid', 65000, 150000, 100000, 'KES', 'Marketing', 'large', 'hybrid'),
('Customer Support', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Customer Service', 'medium', 'onsite')
ON CONFLICT DO NOTHING;
