"use client";

import ServiceLanding, {
  type ServiceLandingContent,
} from "@/components/services/ServiceLanding";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";

export default function CVServicesPage() {
  const { data: content } = usePageContent("services-cv");

  const page: ServiceLandingContent = {
    heroTitle: getContentValue(
      content,
      "hero_title",
      "Your CV Has 6 Seconds. Make Them Count.",
    ),
    heroSubtitle: getContentValue(
      content,
      "hero_subtitle",
      "Recruiters scan your CV in 6 seconds. Most CVs fail that test. Ours don't.",
    ),
    heroDescriptions: [
      getContentValue(
        content,
        "hero_description_1",
        "You've been sending applications for weeks. Zero callbacks. Not because you're unqualified — your CV just doesn't survive the 6-second scan.",
      ),
      getContentValue(
        content,
        "hero_description_2",
        "At CareerSasa, we engineer CVs to beat ATS systems, pass the recruiter scan, and get you shortlisted for the Kenyan job market.",
      ),
      getContentValue(
        content,
        "hero_description_3",
        "Whether you're writing your first CV or repositioning for a board role, we build documents recruiters actually read.",
      ),
    ],
    heroImage:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1470&q=80",
    heroImageAlt: "Professional CV documents",
    painTitle: "The 6-Second Problem That's Costing You Interviews",
    painPoints: [
      "Recruiters spend about 6 seconds scanning a CV — if yours doesn't pass, you never interview.",
      "ATS systems reject most CVs before a human sees them when they aren't keyword-optimized.",
      "Generic CVs that list responsibilities instead of achievements get ignored.",
      "If your CV doesn't match your LinkedIn profile, recruiters question your credibility.",
    ],
    painClosing:
      "A weak CV silently blocks opportunities. We engineer yours to pass every filter and land on the interview pile.",
    differentiatorsTitle: "Why CareerSasa CVs Get More Interview Callbacks",
    differentiators: [
      "ATS-friendly formatting",
      "Achievement-focused writing (not job descriptions)",
      "Industry-specific keywords",
      "Recruiter-tested formats",
      "Clear, honest positioning",
      "Built for Kenya's job market — not generic international templates",
    ],
    differentiatorsNote:
      "We don't stuff keywords. We tell your professional story clearly and credibly.",
    packagesTitle: "Our CV & Resume Services",
    serviceKey: "cv",
    packages: [
      {
        id: "writing",
        title: "CV / Resume Writing",
        subtitle: "Clear, professional, and recruiter-friendly",
        features: [
          "Professionally written CV from scratch or rewrite",
          "Clean, modern format",
          "Achievement-focused experience",
          "Industry-specific keywords",
        ],
        bestFor: "Best for job seekers & professionals",
        price: "KES 3,000 – 5,000",
        whatsappMessage: "Hi, I'm interested in the CV/Resume Writing service.",
      },
      {
        id: "graduate",
        title: "Graduate & Entry-Level CVs",
        subtitle: "Start strong, even with limited experience",
        features: [
          "Skills-based CV structure",
          "Internship, attachment & project positioning",
          "Academic achievements highlighted",
          "Career-ready formatting",
        ],
        bestFor: "Best for students & fresh graduates",
        price: "KES 2,000 – 3,500",
        whatsappMessage:
          "Hi, I'm interested in the Graduate & Entry-Level CVs service.",
      },
      {
        id: "transition",
        title: "Career Transition CVs",
        subtitle: "Change direction without confusing recruiters",
        features: [
          "Reposition experience for new roles",
          "Transferable skills highlighting",
          "Clear career narrative",
          "Role-specific targeting",
        ],
        bestFor: "Best for career switchers",
        price: "KES 4,000 – 6,000",
        whatsappMessage:
          "Hi, I'm interested in the Career Transition CVs service.",
      },
      {
        id: "executive",
        title: "Executive & Senior-Level CVs",
        subtitle: "Position yourself as a leader",
        features: [
          "Strategic, results-driven CV",
          "Leadership & impact focus",
          "Board-level and executive positioning",
          "Confidential handling",
        ],
        bestFor: "Best for managers, directors & executives",
        price: "KES 8,000 – 12,000",
        whatsappMessage:
          "Hi, I'm interested in the Executive & Senior-Level CVs service.",
      },
      {
        id: "alignment",
        title: "CV + LinkedIn Alignment",
        subtitle: "Consistency recruiters trust",
        features: [
          "Align CV with LinkedIn profile",
          "ATS-friendly language",
          "Clear, credible professional brand",
        ],
        bestFor: "Highly recommended for all job seekers",
        price: "KES 2,500 – 4,000",
        whatsappMessage:
          "Hi, I'm interested in the CV + LinkedIn Alignment service.",
      },
    ],
    customTitle: "Custom CV Solutions",
    customSubtitle: "Need something more specific? Let's build it together.",
    customIntro:
      "Not every career fits a standard package. If you have unique experience, multiple roles, international targets, or confidential needs, we offer custom CV packages tailored to your goals.",
    customIncludes: [
      "Multiple CV versions for different roles",
      "International or regional market targeting",
      "Technical, academic, or specialist CVs",
      "Portfolio-style CVs",
      "Confidential job search support",
    ],
    customWhatsappMessage: "Hi, I'm interested in a custom CV solution.",
    processTitle: "How It Works",
    processSteps: [
      "Choose a CV service or package",
      "Complete a short onboarding form",
      "We write, review, and refine your CV",
      "You receive a professional, job-ready CV",
    ],
    audiencesTitle: "Who These Services Are For",
    audiencesIntro:
      "Whether you're starting out, changing direction, or aiming higher — your CV is the first filter. We help you pass it.",
    audiences: [
      {
        title: "Students & Fresh Graduates",
        description:
          "We position internships, attachments, projects, and skills so you look ready to contribute — even with limited experience.",
      },
      {
        title: "Job Seekers & Career Switchers",
        description:
          "We rewrite your CV to highlight transferable skills, clarify your narrative, and make you shortlist-ready for the roles you want.",
      },
      {
        title: "Professionals Seeking Promotion",
        description:
          "We shift your CV from responsibilities to impact, leadership, and results — so it reflects the next-level professional you've become.",
      },
      {
        title: "Managers & Senior Leaders",
        description:
          "Strategic CVs that reflect leadership, decision-making, and measurable business impact — with the confidentiality your career demands.",
      },
    ],
    ctaTitle: "Ready to Get Shortlisted?",
    ctaLines: [
      "Every week with a weak CV is a week of interviews you missed.",
      "Our clients report far more callbacks after switching to a CareerSasa CV.",
    ],
    ctaWhatsappMessage: "Hi, I'd like to choose a CV package today!",
    ctaButtonLabel: "I'm Ready",
  };

  return <ServiceLanding content={page} />;
}
