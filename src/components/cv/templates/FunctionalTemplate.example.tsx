/**
 * Skills-Based (Functional) CV Template - Example Usage
 * 
 * This template emphasizes skills and competencies over chronological work history.
 * Perfect for career changers, candidates with employment gaps, or those with strong transferable skills.
 */

import FunctionalTemplate from './FunctionalTemplate';

// Example data structure for the Functional Template
const exampleData = {
  name: "Mary Achieng Odhiambo",
  title: "Customer Service Specialist",
  contact: {
    location: "Kisumu, Kenya",
    phone: "+254 710 234 567",
    email: "mary.odhiambo@email.com",
    linkedin: "linkedin.com/in/mary-odhiambo"
  },
  summary: "Customer-focused professional with strong communication and problem-solving skills developed through experience in retail, community service, and administrative roles. Proven ability to build rapport with diverse clients, resolve conflicts efficiently, and maintain high satisfaction rates. Seeking to leverage transferable skills in a full-time customer service position where I can contribute to organizational success while continuing professional growth.",
  
  // Core competencies - 6-8 key skills displayed prominently
  coreSkills: [
    "Customer Support & Retention",
    "Effective Communication",
    "Conflict Resolution",
    "Team Collaboration",
    "Problem Solving & Critical Thinking",
    "Data Entry & Management",
    "Time Management",
    "Client Relationship Management"
  ],
  
  // Skill categories - grouped by type with detailed descriptions
  skillCategories: [
    {
      title: "Customer Service Skills",
      skills: [
        "Handling customer inquiries, complaints, and feedback with professionalism and empathy",
        "Providing accurate product and service information to support purchasing decisions",
        "Maintaining high customer satisfaction through attentive service and follow-up",
        "Managing multiple customer interactions simultaneously in fast-paced environments"
      ]
    },
    {
      title: "Administrative & Technical Skills",
      skills: [
        "Document management and filing systems (physical and digital)",
        "Data entry, reporting, and basic database management",
        "Scheduling, coordination, and calendar management",
        "Proficient in Microsoft Office Suite (Word, Excel, PowerPoint)",
        "Basic CRM software experience"
      ]
    },
    {
      title: "Interpersonal & Soft Skills",
      skills: [
        "Active listening and clear verbal/written communication",
        "Adaptability and quick learning in new environments",
        "Cultural sensitivity and ability to work with diverse populations",
        "Positive attitude and professional demeanor under pressure"
      ]
    }
  ],
  
  // Work experience - brief summary only (no detailed bullet points)
  experience: [
    {
      role: "Retail Assistant",
      company: "QuickMart Supermarket",
      dates: "2021 – 2023"
    },
    {
      role: "Volunteer Administrative Assistant",
      company: "Community Development Initiative",
      dates: "2020 – 2021"
    },
    {
      role: "Customer Service Intern",
      company: "Kisumu County Government",
      dates: "2019"
    }
  ],
  
  education: [
    {
      degree: "Diploma in Business Administration",
      institution: "Kisumu National Polytechnic",
      dates: "2018 – 2020"
    }
  ],
  
  certifications: [
    "Customer Service Excellence Certificate – Alison (2023)",
    "Basic Computer Applications – Kenya Institute of ICT (2020)",
    "Communication Skills for Customer Service – Coursera (2022)"
  ]
};

// Usage example
export default function FunctionalCVExample() {
  return <FunctionalTemplate data={exampleData} />;
}

/**
 * KEY DIFFERENCES FROM OTHER TEMPLATES:
 * 
 * 1. SKILLS-FIRST APPROACH
 *    - Core competencies section is prominent and early
 *    - Skills categories take up the most space
 *    - Work experience is minimized to just role, company, dates
 * 
 * 2. STRUCTURE
 *    - Header
 *    - Professional Summary
 *    - Core Competencies (bullet points)
 *    - Professional Skills (categorized with detailed descriptions)
 *    - Relevant Work Experience (brief summary only)
 *    - Education
 *    - Certifications
 * 
 * 3. WHEN TO USE
 *    - Career changers transitioning to new industries
 *    - Candidates with employment gaps
 *    - Entry-level candidates with transferable skills
 *    - People with diverse experience backgrounds
 *    - Those whose skills are more impressive than job titles
 * 
 * 4. CONTENT TIPS
 *    - Focus on transferable skills
 *    - Group skills by category (technical, soft skills, etc.)
 *    - Use action-oriented skill descriptions
 *    - Keep work experience brief - just enough to show you've worked
 *    - Emphasize what you CAN DO rather than where you've been
 * 
 * 5. ATS OPTIMIZATION
 *    - Still ATS-friendly despite different structure
 *    - Uses standard section headings
 *    - Keywords in skills sections help with ATS matching
 *    - Simple formatting without complex layouts
 */
