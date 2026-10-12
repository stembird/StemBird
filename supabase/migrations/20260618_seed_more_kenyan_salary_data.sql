-- Migration: Expand salary_data with more Kenyan towns/counties
-- Covers: Kisumu, Nakuru, Eldoret, Thika, Machakos, Nyeri, Meru, Kisii,
-- Garissa, Kitale, Malindi, Nanyuki, Naivasha, and more roles.

INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, currency, industry, company_size, remote_type) VALUES

-- Kisumu (3rd largest city, Western Kenya)
('Software Engineer', 'Kisumu', 'Kenya', 'mid', 70000, 160000, 110000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Kisumu', 'Kenya', 'mid', 55000, 120000, 80000, 'KES', 'Finance', 'medium', 'onsite'),
('Teacher', 'Kisumu', 'Kenya', 'entry', 28000, 50000, 38000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Kisumu', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Sales Representative', 'Kisumu', 'Kenya', 'entry', 28000, 55000, 40000, 'KES', 'Sales', 'medium', 'onsite'),
('Marketing Manager', 'Kisumu', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Marketing', 'medium', 'onsite'),

-- Nakuru
('Software Developer', 'Nakuru', 'Kenya', 'mid', 65000, 150000, 100000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Nakuru', 'Kenya', 'entry', 40000, 70000, 52000, 'KES', 'Finance', 'medium', 'onsite'),
('Civil Engineer', 'Nakuru', 'Kenya', 'mid', 70000, 160000, 110000, 'KES', 'Engineering', 'medium', 'onsite'),
('HR Officer', 'Nakuru', 'Kenya', 'mid', 55000, 120000, 80000, 'KES', 'Human Resources', 'medium', 'onsite'),
('Teacher', 'Nakuru', 'Kenya', 'entry', 28000, 48000, 36000, 'KES', 'Education', 'medium', 'onsite'),

-- Eldoret
('Software Engineer', 'Eldoret', 'Kenya', 'mid', 60000, 140000, 95000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Eldoret', 'Kenya', 'mid', 50000, 110000, 75000, 'KES', 'Finance', 'medium', 'onsite'),
('Doctor', 'Eldoret', 'Kenya', 'entry', 90000, 180000, 130000, 'KES', 'Healthcare', 'large', 'onsite'),
('Agricultural Officer', 'Eldoret', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Agriculture', 'medium', 'onsite'),
('Sales Representative', 'Eldoret', 'Kenya', 'entry', 25000, 50000, 36000, 'KES', 'Sales', 'medium', 'onsite'),

-- Thika
('Software Developer', 'Thika', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Thika', 'Kenya', 'entry', 38000, 68000, 50000, 'KES', 'Finance', 'medium', 'onsite'),
('Operations Manager', 'Thika', 'Kenya', 'mid', 100000, 200000, 145000, 'KES', 'Operations', 'large', 'onsite'),
('Mechanical Engineer', 'Thika', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Engineering', 'large', 'onsite'),

-- Machakos
('IT Support', 'Machakos', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Machakos', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Finance', 'medium', 'onsite'),
('Teacher', 'Machakos', 'Kenya', 'entry', 27000, 48000, 35000, 'KES', 'Education', 'medium', 'onsite'),

-- Nyeri
('Teacher', 'Nyeri', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Nyeri', 'Kenya', 'entry', 32000, 55000, 42000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Accountant', 'Nyeri', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Finance', 'medium', 'onsite'),

-- Meru
('Teacher', 'Meru', 'Kenya', 'entry', 27000, 48000, 36000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Meru', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Agricultural Officer', 'Meru', 'Kenya', 'entry', 40000, 75000, 55000, 'KES', 'Agriculture', 'medium', 'onsite'),

-- Kisii
('Teacher', 'Kisii', 'Kenya', 'entry', 27000, 48000, 35000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Kisii', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Sales Representative', 'Kisii', 'Kenya', 'entry', 22000, 45000, 32000, 'KES', 'Sales', 'small', 'onsite'),

-- Garissa
('Teacher', 'Garissa', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Garissa', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Healthcare', 'medium', 'onsite'),

-- Kitale
('Teacher', 'Kitale', 'Kenya', 'entry', 26000, 46000, 34000, 'KES', 'Education', 'medium', 'onsite'),
('Agricultural Officer', 'Kitale', 'Kenya', 'entry', 38000, 70000, 52000, 'KES', 'Agriculture', 'medium', 'onsite'),

-- Naivasha
('Software Developer', 'Naivasha', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Technology', 'medium', 'remote'),
('Operations Manager', 'Naivasha', 'Kenya', 'mid', 90000, 180000, 130000, 'KES', 'Operations', 'large', 'onsite'),
('HR Officer', 'Naivasha', 'Kenya', 'mid', 50000, 110000, 75000, 'KES', 'Human Resources', 'medium', 'onsite'),

-- Nanyuki
('Teacher', 'Nanyuki', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Software Developer', 'Nanyuki', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Technology', 'small', 'remote'),

-- Malindi
('Teacher', 'Malindi', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Malindi', 'Kenya', 'entry', 32000, 55000, 42000, 'KES', 'Healthcare', 'medium', 'onsite'),

-- More Nairobi roles (broader coverage)
('Pharmacist', 'Nairobi', 'Kenya', 'entry', 60000, 110000, 80000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Pharmacist', 'Nairobi', 'Kenya', 'senior', 130000, 280000, 200000, 'KES', 'Healthcare', 'large', 'onsite'),
('Dentist', 'Nairobi', 'Kenya', 'mid', 120000, 280000, 200000, 'KES', 'Healthcare', 'large', 'onsite'),
('Architect', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Engineering', 'large', 'hybrid'),
('Quantity Surveyor', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),
('Procurement Officer', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Operations', 'large', 'onsite'),
('Logistics Coordinator', 'Nairobi', 'Kenya', 'mid', 65000, 140000, 95000, 'KES', 'Operations', 'large', 'onsite'),
('Bank Teller', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Finance', 'large', 'onsite'),
('Insurance Agent', 'Nairobi', 'Kenya', 'entry', 30000, 60000, 42000, 'KES', 'Finance', 'medium', 'onsite'),
('Real Estate Agent', 'Nairobi', 'Kenya', 'entry', 35000, 80000, 55000, 'KES', 'Sales', 'medium', 'onsite'),
('Real Estate Agent', 'Nairobi', 'Kenya', 'mid', 80000, 200000, 130000, 'KES', 'Sales', 'large', 'onsite'),
('Journalist', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 52000, 'KES', 'Media', 'medium', 'onsite'),
('Journalist', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Media', 'large', 'onsite'),
('Photographer', 'Nairobi', 'Kenya', 'entry', 30000, 60000, 42000, 'KES', 'Media', 'small', 'remote'),
('Videographer', 'Nairobi', 'Kenya', 'mid', 50000, 120000, 80000, 'KES', 'Media', 'medium', 'hybrid'),
('Chef', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Hospitality', 'medium', 'onsite'),
('Chef', 'Nairobi', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Hospitality', 'large', 'onsite'),
('Hotel Manager', 'Nairobi', 'Kenya', 'senior', 150000, 350000, 240000, 'KES', 'Hospitality', 'large', 'onsite'),
('Plumber', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Construction', 'small', 'onsite'),
('Plumber', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Construction', 'medium', 'onsite'),
('Electrician', 'Nairobi', 'Kenya', 'entry', 28000, 55000, 38000, 'KES', 'Construction', 'small', 'onsite'),
('Electrician', 'Nairobi', 'Kenya', 'mid', 55000, 110000, 78000, 'KES', 'Construction', 'medium', 'onsite'),
('Driver', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'Transport', 'medium', 'onsite'),
('Driver', 'Nairobi', 'Kenya', 'mid', 45000, 80000, 60000, 'KES', 'Transport', 'large', 'onsite'),
('Security Guard', 'Nairobi', 'Kenya', 'entry', 18000, 35000, 25000, 'KES', 'Security', 'large', 'onsite'),
('Security Manager', 'Nairobi', 'Kenya', 'senior', 100000, 220000, 150000, 'KES', 'Security', 'large', 'onsite'),
('Warehouse Manager', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Operations', 'large', 'onsite'),
('Receptionist', 'Nairobi', 'Kenya', 'entry', 22000, 40000, 30000, 'KES', 'Administration', 'medium', 'onsite'),
('Secretary', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'Administration', 'medium', 'onsite'),
('Office Manager', 'Nairobi', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Administration', 'large', 'onsite'),
('Nutritionist', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Physiotherapist', 'Nairobi', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Lab Technician', 'Nairobi', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Lab Technician', 'Nairobi', 'Kenya', 'mid', 65000, 130000, 92000, 'KES', 'Healthcare', 'large', 'onsite'),
('Veterinarian', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Agriculture', 'medium', 'onsite'),
('Surveyor', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Engineering', 'medium', 'onsite'),
('Town Planner', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Government', 'large', 'onsite'),
('Economist', 'Nairobi', 'Kenya', 'mid', 120000, 260000, 180000, 'KES', 'Finance', 'large', 'hybrid'),
('Statistician', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Government', 'large', 'onsite'),
('Research Officer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Research', 'large', 'hybrid'),
('Monitoring and Evaluation', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 155000, 'KES', 'NGO', 'large', 'hybrid'),
('Program Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 360000, 'KES', 'NGO', 'large', 'hybrid'),
('Program Officer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'NGO', 'large', 'hybrid'),
('Community Health Worker', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'NGO', 'medium', 'onsite')
ON CONFLICT DO NOTHING;
