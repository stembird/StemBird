"use client";

import ServiceLanding, {
  type ServiceLandingContent,
} from "@/components/services/ServiceLanding";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";

export default function LinkedInServicesPage() {
  const { data: content } = usePageContent("services-linkedin");

  const page: ServiceLandingContent = {
    heroTitle: getContentValue(
      content,
      "hero_title",
      "Recruiters Google You Before They Call. What Do They Find?",
    ),
    heroSubtitle: getContentValue(
      content,
      "hero_subtitle",
      "Your LinkedIn profile is the interview filter most people don't know is working against them.",
    ),
    heroDescriptions: [
      getContentValue(
        content,
        "hero_description_1",
        "Before a recruiter calls, they search your LinkedIn. If your profile is weak, outdated, or doesn't match your CV, you've lost the interview before it started.",
      ),
      getContentValue(
        content,
        "hero_description_2",
        "At CareerSasa, we turn LinkedIn into a recruiter magnet — not just a digital CV — so you get found, verified, and contacted.",
      ),
      getContentValue(
        content,
        "hero_description_3",
        "Built for the Kenyan and East African job market, not generic social media advice.",
      ),
    ],
    heroImage:
      "https://images.unsplash.com/photo-1611944212129-29977ae1398c?auto=format&fit=crop&w=1470&q=80",
    heroImageAlt: "Professional LinkedIn networking",
    painTitle: "The LinkedIn Problem That's Silently Costing You Jobs",
    painPoints: [
      "Most recruiters use LinkedIn to vet candidates before making a call.",
      "Hiring managers Google you — a blank or outdated profile signals disinterest.",
      "If your CV and LinkedIn tell different stories, recruiters question your credibility.",
      "A weak profile blocks opportunities you never even see.",
    ],
    painClosing:
      "Many people lose interviews without knowing why. Often, LinkedIn told a different story than their CV. We fix that.",
    differentiatorsTitle: "Why CareerSasa LinkedIn Services Actually Work",
    differentiators: [
      "Career-focused, not generic marketing",
      "Industry-specific optimization",
      "Recruiter-oriented writing style",
      "Practical strategies, not theory",
      "Built for Kenya's job market",
    ],
    differentiatorsNote:
      "We optimize for how recruiters actually search, shortlist, and decide — not vanity metrics.",
    packagesTitle: "Our LinkedIn Services",
    serviceKey: "linkedin",
    packages: [
      {
        id: "audit",
        title: "LinkedIn Profile Audit",
        subtitle: "Understand what's holding you back",
        features: [
          "Recruiter-readiness score",
          "Visibility & keyword gaps",
          "Clear improvement checklist",
        ],
        bestFor: "Best for students & first-time job seekers",
        price: "KES 2,500 – 4,000",
        whatsappMessage:
          "Hi, I'm interested in the LinkedIn Profile Audit service.",
      },
      {
        id: "optimization",
        title: "LinkedIn Profile Optimization",
        subtitle: "Turn your profile into a recruiter magnet",
        features: [
          "Optimized headline & About section",
          "Achievement-focused experience rewrite",
          "Skills & LinkedIn SEO optimization",
        ],
        bestFor: "Best for active job seekers & professionals",
        price: "KES 5,000 – 8,000",
        whatsappMessage:
          "Hi, I'm interested in the LinkedIn Profile Optimization service.",
      },
      {
        id: "alignment",
        title: "LinkedIn + CV Alignment",
        subtitle: "Consistency recruiters trust",
        features: [
          "CV and LinkedIn alignment",
          "ATS-friendly language",
          "One professionally optimized CV",
        ],
        bestFor: "Best for serious job seekers",
        price: "KES 4,000 – 6,000",
        whatsappMessage:
          "Hi, I'm interested in the LinkedIn + CV Alignment service.",
      },
      {
        id: "branding",
        title: "LinkedIn Personal Branding",
        subtitle: "Be visible, credible, and memorable",
        features: [
          "Personal brand positioning",
          "Banner & profile branding direction",
          "Industry-specific content ideas",
          "Networking & visibility strategy",
        ],
        bestFor: "Best for professionals & managers",
        price: "KES 8,000 – 12,000",
        whatsappMessage:
          "Hi, I'm interested in the LinkedIn Personal Branding service.",
      },
      {
        id: "management",
        title: "LinkedIn Social Media Management",
        subtitle: "We manage your LinkedIn. You focus on your career",
        features: [
          "Professionally written posts",
          "Content calendar & scheduling",
          "Engagement & visibility strategy",
          "Authentic, human content",
        ],
        bestFor: "Best for busy professionals, executives & consultants",
        price: "KES 10,000 – 15,000/month",
        whatsappMessage:
          "Hi, I'm interested in the LinkedIn Social Media Management service.",
      },
    ],
    customTitle: "Custom LinkedIn Solutions",
    customSubtitle: "Need a package built around your goals?",
    customIntro:
      "Whether you need executive branding, industry positioning, or ongoing visibility, we build custom LinkedIn packages around your career goals.",
    customIncludes: [
      "Executive personal branding",
      "Industry-specific positioning",
      "Ongoing content strategy",
      "Profile + CV alignment packs",
      "Confidential career-move support",
    ],
    customWhatsappMessage:
      "Hi, I'm interested in a custom LinkedIn solution.",
    processTitle: "How It Works",
    processSteps: [
      "Choose a service or bundle",
      "Complete a short onboarding form",
      "We optimize, position, and manage your LinkedIn",
      "You get visibility, confidence, and opportunities",
    ],
    audiencesTitle: "Who These Services Are For",
    audiencesIntro:
      "From first profiles to executive brands — LinkedIn should work for your career, not against it.",
    audiences: [
      {
        title: "Students & Fresh Graduates",
        description:
          "Build a credible first profile that helps recruiters find and trust you early.",
      },
      {
        title: "Active Job Seekers",
        description:
          "Get found for the right roles with keywords, clarity, and a profile that matches your CV.",
      },
      {
        title: "Professionals & Managers",
        description:
          "Strengthen visibility and personal brand so opportunities find you, not the other way around.",
      },
      {
        title: "Executives & Consultants",
        description:
          "Position yourself for high-stakes conversations with a polished, confidential LinkedIn presence.",
      },
    ],
    ctaTitle: "Ready to Be Found for the Right Reasons?",
    ctaLines: [
      "Your next opportunity may start with a LinkedIn search — make sure you show up well.",
      "Let's make your profile work as hard as you do.",
    ],
    ctaWhatsappMessage: "Hi, I'd like to choose a LinkedIn package today!",
    ctaButtonLabel: "I'm Ready",
  };

  return <ServiceLanding content={page} />;
}
