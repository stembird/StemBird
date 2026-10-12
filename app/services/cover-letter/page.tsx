"use client";

import ServiceLanding, {
  type ServiceLandingContent,
} from "@/components/services/ServiceLanding";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";

export default function CoverLetterServicesPage() {
  const { data: content } = usePageContent("services-cover-letter");

  const page: ServiceLandingContent = {
    heroTitle: getContentValue(
      content,
      "hero_title",
      "Your CV Gets You Seen. Your Cover Letter Gets You Hired.",
    ),
    heroSubtitle: getContentValue(
      content,
      "hero_subtitle",
      "The letter that explains why you're the right fit — not just another applicant.",
    ),
    heroDescriptions: [
      getContentValue(
        content,
        "hero_description_1",
        "Your CV shows what you've done. A strong cover letter explains why you're perfect for this role at this company.",
      ),
      getContentValue(
        content,
        "hero_description_2",
        "At CareerSasa, we write cover letters that connect your experience to the job, speak to the hiring manager's needs, and give them a reason to call you.",
      ),
      getContentValue(
        content,
        "hero_description_3",
        "From first graduate roles to C-suite opportunities, our letters are built for the Kenyan job market — not recycled templates.",
      ),
    ],
    heroImage:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1470&q=80",
    heroImageAlt: "Writing a professional cover letter",
    painTitle: "The Cover Letter Mistake That Costs Interviews",
    painPoints: [
      "Many serious employers still read cover letters — a weak one undermines even a strong CV.",
      "Cover letters explain gaps, transitions, and motivation — things your CV can't.",
      "A generic letter tells the recruiter you didn't want this specific job.",
      "When two CVs are equal, the cover letter often decides who gets the call.",
    ],
    painClosing:
      "A great cover letter doesn't repeat your CV — it explains your value in a way your CV can't.",
    differentiatorsTitle: "Why CareerSasa Cover Letters Get Read",
    differentiators: [
      "Job-specific, not generic templates",
      "Recruiter-focused writing",
      "Clear structure and strong opening lines",
      "Honest, confident positioning",
      "Aligned with your CV and LinkedIn profile",
      "Built for Kenya's job market",
    ],
    differentiatorsNote:
      "We write letters that feel personal, specific, and credible — not copy-paste applications.",
    packagesTitle: "Our Cover Letter Services",
    serviceKey: "cover-letter",
    packages: [
      {
        id: "professional",
        title: "Professional Cover Letter Writing",
        subtitle: "Clear, tailored, and compelling",
        features: [
          "Fully written cover letter from scratch",
          "Customized to a specific job or role",
          "Professional tone and structure",
          "Strong opening lines that grab attention",
          "Achievement-focused content",
        ],
        bestFor: "Best for most job seekers",
        price: "KES 2,500 – 4,000",
        whatsappMessage:
          "Hi, I'm interested in the Professional Cover Letter Writing service.",
      },
      {
        id: "graduate",
        title: "Graduate & Entry-Level Cover Letters",
        subtitle: "Tell your story, even with limited experience",
        features: [
          "Skills-based approach",
          "Internship, attachment & academic positioning",
          "Confidence without exaggeration",
          "Clear motivation narrative",
        ],
        bestFor: "Best for students & fresh graduates",
        price: "KES 1,500 – 2,500",
        whatsappMessage:
          "Hi, I'm interested in the Graduate & Entry-Level Cover Letters service.",
      },
      {
        id: "transition",
        title: "Career Transition Cover Letters",
        subtitle: "Change direction without confusing recruiters",
        features: [
          "Clear explanation of career change",
          "Transferable skills highlighted",
          "Strong motivation narrative",
          "Honest, confident positioning",
        ],
        bestFor: "Best for career switchers",
        price: "KES 3,000 – 5,000",
        whatsappMessage:
          "Hi, I'm interested in the Career Transition Cover Letters service.",
      },
      {
        id: "executive",
        title: "Executive & Senior-Level Cover Letters",
        subtitle: "Position yourself as a leader",
        features: [
          "Strategic, impact-focused writing",
          "Leadership & decision-making emphasis",
          "Confidential handling",
          "Board-level positioning",
        ],
        bestFor: "Best for managers & executives",
        price: "KES 5,000 – 8,000",
        whatsappMessage:
          "Hi, I'm interested in the Executive & Senior-Level Cover Letters service.",
      },
      {
        id: "alignment",
        title: "CV + Cover Letter Alignment",
        subtitle: "One clear professional message",
        features: [
          "Cover letter aligned with CV",
          "Consistent tone and positioning",
          "Strong, credible personal narrative",
          "Complementary, not repetitive",
        ],
        bestFor: "Highly recommended",
        price: "KES 2,500 – 4,000",
        whatsappMessage:
          "Hi, I'm interested in the CV + Cover Letter Alignment service.",
      },
    ],
    customTitle: "Custom Cover Letter Solutions",
    customSubtitle: "Need something more specific? Let's write it together.",
    customIntro:
      "Not every application fits a standard package. For unique roles, multiple applications, or confidential searches, we offer custom cover letter packages.",
    customIncludes: [
      "Multiple letters for different roles",
      "Career-change narratives",
      "Executive or board-level positioning",
      "Industry-specific tone and language",
      "Confidential handling",
    ],
    customWhatsappMessage:
      "Hi, I'm interested in a custom cover letter solution.",
    processTitle: "How It Works",
    processSteps: [
      "Choose a cover letter service",
      "Share the role and your background",
      "We draft, refine, and polish your letter",
      "You receive a job-ready cover letter",
    ],
    audiencesTitle: "Who These Services Are For",
    audiencesIntro:
      "A strong letter helps you stand out — whether you're starting out or moving up.",
    audiences: [
      {
        title: "Students & Fresh Graduates",
        description:
          "We help you explain motivation and potential clearly, even when experience is limited.",
      },
      {
        title: "Active Job Seekers",
        description:
          "Stop sending the same generic letter. We tailor your story to the role you want.",
      },
      {
        title: "Career Switchers",
        description:
          "We make the transition story clear so recruiters understand your transferable value.",
      },
      {
        title: "Managers & Executives",
        description:
          "Strategic letters that communicate leadership impact with the right tone and confidentiality.",
      },
    ],
    ctaTitle: "Ready to Strengthen Your Applications?",
    ctaLines: [
      "A tailored cover letter can be the difference between silence and a callback.",
      "Let's write one that makes recruiters want to meet you.",
    ],
    ctaWhatsappMessage: "Hi, I'd like to choose a cover letter package today!",
    ctaButtonLabel: "I'm Ready",
  };

  return <ServiceLanding content={page} />;
}
