-- Migration: Add Digital Professional CV Template
-- Template #8: Digital Professional CV for tech and digital professionals

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Digital Professional';

-- Insert the new Digital Professional template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Digital Professional',
  'Modern tech-focused CV highlighting projects, tech stack, and certifications. Perfect for software developers, data scientists, and IT professionals.',
  'technical',
  '{
    "name": "Kevin Otieno Ouma",
    "title": "Full Stack Software Developer",
    "contact": {
      "location": "Nairobi, Kenya",
      "phone": "+254 712 888 999",
      "email": "kevin.otieno@email.com",
      "github": "github.com/kevinotieno",
      "linkedin": "linkedin.com/in/kevinotieno"
    },
    "summary": "Full stack developer with 4+ years of experience building scalable web applications using modern JavaScript frameworks and cloud technologies. Specialized in React, Next.js, and Node.js ecosystems with a strong focus on performance optimization, user experience, and clean code architecture. Proven track record of delivering high-quality solutions for startups and enterprise clients across fintech, e-commerce, and SaaS industries.",
    "techStack": [
      "JavaScript / TypeScript",
      "React / Next.js",
      "Node.js / Express",
      "PostgreSQL / MongoDB",
      "Supabase / Firebase",
      "Tailwind CSS",
      "GraphQL / REST APIs",
      "Python / Django"
    ],
    "tools": [
      "Git / GitHub",
      "Docker / Kubernetes",
      "AWS / Vercel",
      "Postman / Insomnia",
      "VS Code / WebStorm",
      "Figma / Adobe XD",
      "Jira / Linear",
      "Jest / Cypress"
    ],
    "certifications": [
      "AWS Certified Developer Associate (2023)",
      "Google Data Analytics Professional Certificate",
      "Meta Front-End Developer Professional Certificate",
      "MongoDB Certified Developer"
    ],
    "projects": [
      {
        "name": "E-Commerce Platform",
        "tech": "Next.js, Supabase, Stripe, Tailwind CSS",
        "description": "Built a full-stack e-commerce platform with authentication, payment integration, inventory management, and admin dashboard. Implemented real-time order tracking and email notifications. Achieved 99.9% uptime and handled 10K+ monthly transactions.",
        "link": "demo.ecommerce-platform.com"
      },
      {
        "name": "Job Board Application",
        "tech": "React, Node.js, PostgreSQL, Redis",
        "description": "Developed a comprehensive job board platform allowing companies to post jobs and candidates to apply online. Features include advanced search filters, application tracking, and automated email campaigns. Serves 500+ active employers.",
        "link": "github.com/kevinotieno/job-board"
      },
      {
        "name": "Real-Time Analytics Dashboard",
        "tech": "React, D3.js, WebSocket, Express",
        "description": "Created a real-time analytics dashboard for monitoring business metrics with interactive charts and live data updates. Integrated with multiple data sources and implemented custom visualization components.",
        "link": "analytics-demo.vercel.app"
      },
      {
        "name": "Mobile Banking App (Backend)",
        "tech": "Node.js, PostgreSQL, JWT, Docker",
        "description": "Designed and implemented secure RESTful APIs for a mobile banking application. Handled transaction processing, account management, and third-party payment gateway integration with PCI DSS compliance."
      }
    ],
    "experience": [
      {
        "role": "Senior Software Developer",
        "company": "TechNova Solutions",
        "location": "Nairobi, Kenya",
        "dates": "Jan 2022 – Present",
        "responsibilities": [
          "Lead development of client-facing web applications using React and Next.js",
          "Architect and implement scalable backend services with Node.js and PostgreSQL",
          "Mentor junior developers and conduct code reviews",
          "Reduced application load time by 40% through performance optimization"
        ]
      },
      {
        "role": "Full Stack Developer",
        "company": "Digital Edge Ltd",
        "location": "Nairobi, Kenya",
        "dates": "Mar 2020 – Dec 2021",
        "responsibilities": [
          "Developed and maintained multiple client projects using MERN stack",
          "Implemented CI/CD pipelines using GitHub Actions and Docker",
          "Collaborated with designers to create responsive user interfaces",
          "Integrated third-party APIs including payment gateways and analytics tools"
        ]
      },
      {
        "role": "Junior Developer",
        "company": "StartUp Hub Kenya",
        "location": "Nairobi, Kenya",
        "dates": "Jun 2019 – Feb 2020",
        "responsibilities": [
          "Built responsive web applications using React and Bootstrap",
          "Assisted in database design and optimization",
          "Participated in agile development processes and daily standups"
        ]
      }
    ],
    "education": [
      {
        "degree": "BSc Computer Science",
        "institution": "University of Nairobi",
        "dates": "2016 – 2020",
        "gpa": "3.7/4.0"
      }
    ]
  }'::jsonb,
  false,
  true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
