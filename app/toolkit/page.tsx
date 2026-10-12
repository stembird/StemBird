import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Briefcase, ArrowRight } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "Free Job Seeker's Toolkit - CareerSasa",
  description: "Download your free Kenyan Job Seeker's Toolkit: CV template, cover letter template, interview checklist, and salary negotiation script.",
  robots: { index: false, follow: false },
};

export default function ToolkitPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0A66C2]/10 mb-4">
            <FileText className="w-8 h-8 text-[#0A66C2]" />
          </div>
          <h1 className="text-4xl font-bold mb-3">The Kenyan Job Seeker&apos;s Toolkit</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to get more interviews, faster. Print this page or save as PDF for offline use.
          </p>
        </div>

        {/* Print/Save Button */}
        <div className="flex justify-center mb-10 print:hidden">
          <PrintButton />
        </div>

        {/* Section 1: CV Template */}
        <section className="mb-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-[#0A66C2]">1.</span> Professional CV Template (ATS-Friendly)
          </h2>
          <p className="text-muted-foreground mb-6">
            Use this structure for your CV. ATS systems read top-to-bottom, left-to-right. Keep it clean, achievement-focused, and keyword-rich.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-6 font-mono text-sm space-y-4">
            <div>
              <p className="font-bold text-base">YOUR FULL NAME</p>
              <p>Nairobi, Kenya | +254 7XX XXX XXX | email@example.com | LinkedIn URL</p>
            </div>
            <div>
              <p className="font-bold text-base uppercase border-b pb-1">Professional Summary</p>
              <p>2-3 sentences: Your role + years of experience + key achievement + what you bring. Tailor this to every job application.</p>
            </div>
            <div>
              <p className="font-bold text-base uppercase border-b pb-1">Key Skills</p>
              <p>[Skill 1] | [Skill 2] | [Skill 3] | [Skill 4] | [Skill 5] | [Skill 6]</p>
              <p className="text-xs text-muted-foreground mt-1">Match these to the job description keywords</p>
            </div>
            <div>
              <p className="font-bold text-base uppercase border-b pb-1">Work Experience</p>
              <p className="font-semibold">Job Title | Company Name | Month Year - Month Year</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Achievement with numbers: &quot;Increased sales by 40% in Q3 2025&quot;</li>
                <li>Achievement with impact: &quot;Managed team of 8, delivered project 2 weeks early&quot;</li>
                <li>Achievement with scope: &quot;Handled 50+ client accounts worth KES 15M annually&quot;</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-base uppercase border-b pb-1">Education</p>
              <p>Degree Name | University | Year of Graduation</p>
            </div>
            <div>
              <p className="font-bold text-base uppercase border-b pb-1">Certifications (Optional)</p>
              <p>Certification Name | Issuing Body | Year</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/services/cv">
              <Button variant="outline" size="sm">
                Get a Professionally Written CV <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Section 2: Cover Letter Template */}
        <section className="mb-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-[#0A66C2]">2.</span> Cover Letter Template
          </h2>
          <p className="text-muted-foreground mb-6">
            A cover letter should explain why you&apos;re the right fit for THIS specific role. Never send a generic one.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-6 text-sm space-y-3 leading-relaxed">
            <p>Dear [Hiring Manager&apos;s Name or &quot;Hiring Team&quot;],</p>
            <p>
              <strong>Opening (1-2 sentences):</strong> State the role you&apos;re applying for and lead with your strongest relevant achievement. Example: &quot;With 3 years of experience managing KES 20M marketing budgets at [Company], I&apos;m excited to apply for the Marketing Manager role at [Target Company].&quot;
            </p>
            <p>
              <strong>Body (2-3 paragraphs):</strong> Connect your specific experience to their requirements. Use numbers. Show you understand their challenges. Example: &quot;At [Previous Company], I increased lead generation by 65% through a targeted social media strategy, which is directly relevant to your goal of expanding digital presence.&quot;
            </p>
            <p>
              <strong>Closing (1-2 sentences):</strong> Reiterate enthusiasm and include a clear call to action. Example: &quot;I would welcome the opportunity to discuss how my background in [specific skill] can help [Company] achieve [specific goal mentioned in the job ad].&quot;
            </p>
            <p>Best regards,<br />[Your Name]<br />[Phone] | [Email]</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/services/cover-letter">
              <Button variant="outline" size="sm">
                Get a Professionally Written Cover Letter <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Section 3: Interview Prep Checklist */}
        <section className="mb-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-[#0A66C2]">3.</span> Interview Preparation Checklist
          </h2>
          <p className="text-muted-foreground mb-6">
            Run through this checklist before every interview. Preparation is the single biggest factor in interview success.
          </p>
          <div className="space-y-3">
            {[
              { title: "Research the company", desc: "Read their website, recent news, LinkedIn page, and Glassdoor reviews. Know their products, mission, and competitors." },
              { title: "Study the job description", desc: "Highlight every requirement. Prepare a specific example from your experience for each one." },
              { title: "Prepare your STAR stories", desc: "Have 5-7 stories ready using Situation, Task, Action, Result format. Focus on achievements with numbers." },
              { title: "Practice common questions", desc: "\"Tell me about yourself\" (60-second pitch), \"Why this company?\", \"What's your greatest strength?\", \"Describe a challenge you overcame.\"" },
              { title: "Prepare smart questions to ask", desc: "\"What does success look like in this role?\", \"What are the biggest challenges the team is facing?\", \"What's the growth trajectory?\"" },
              { title: "Know your numbers", desc: "Be ready to discuss your current/expected salary, notice period, and specific achievements with metrics." },
              { title: "Plan logistics", desc: "Confirm time, location (or video link), dress code, and interviewer names. Arrive 10 minutes early." },
              { title: "Follow up within 24 hours", desc: "Send a thank-you email referencing a specific point from the conversation. This alone puts you ahead of 80% of candidates." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Salary Negotiation Script */}
        <section className="mb-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-[#0A66C2]">4.</span> Salary Negotiation Script
          </h2>
          <p className="text-muted-foreground mb-6">
            Most Kenyans accept the first offer. Don&apos;t. Research shows that negotiating increases offers by 10-30%. Use these scripts.
          </p>
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-5">
              <p className="font-semibold mb-2">When asked your expected salary:</p>
              <p className="text-sm italic text-muted-foreground">
                &quot;Based on my research of similar roles in the Kenyan market and my [X years] of experience in [specific skill], I&apos;m looking at a range of KES [lower bound] to KES [upper bound]. I&apos;m flexible depending on the full package, including growth opportunities.&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-2">Tip: Always give a range. Set the lower bound at the minimum you&apos;d actually accept.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-5">
              <p className="font-semibold mb-2">When the offer is below your range:</p>
              <p className="text-sm italic text-muted-foreground">
                &quot;Thank you for the offer. I&apos;m very excited about this role and the team. Based on my experience with [specific achievement] and the market rate for similar positions, would there be flexibility to move closer to KES [your target]?&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-2">Tip: Never say &quot;no&quot; immediately. Express enthusiasm first, then negotiate.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 border rounded-lg p-5">
              <p className="font-semibold mb-2">When they can&apos;t increase salary:</p>
              <p className="text-sm italic text-muted-foreground">
                &quot;I understand the budget constraints. Could we discuss other elements like a performance review at 6 months, additional leave days, professional development allowance, or a signing bonus?&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-2">Tip: Total compensation includes more than base salary. Negotiate the whole package.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-[#0A66C2]/10 to-[#0077B5]/10 border border-[#0A66C2]/20 rounded-xl p-8 print:hidden">
          <h2 className="text-2xl font-bold mb-3">Want Us to Do This for You?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Our career services team can write your CV, cover letter, and optimize your LinkedIn profile professionally.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/services/cv">
              <Button className="h-10 bg-[#0A66C2] px-4 text-white hover:bg-[#004182]">
                <Briefcase className="h-4 w-4" />
                CV Services
              </Button>
            </Link>
            <Link href="/services/cover-letter">
              <Button variant="outline" className="h-10 px-4">Cover Letters</Button>
            </Link>
            <Link href="/services/linkedin">
              <Button variant="outline" className="h-10 px-4">Boost LinkedIn</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
