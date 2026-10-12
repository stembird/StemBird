import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Building2, Users, Target, Heart } from "lucide-react";
import { fetchPageContentMap, fetchPageSeo } from "@/lib/fetchPageContent";
import { getContentValue } from "@/lib/pageContent";

const FALLBACK_TITLE =
  "About CareerSasa - Kenya's Fastest Path from Job Search to Job Offer";
const FALLBACK_DESCRIPTION =
  "Learn how CareerSasa uses AI-powered matching, free career tools, and verified job listings to help Kenyan professionals land interviews 3x faster than any other job board.";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchPageSeo("about");
  const title = seo?.seo_title || FALLBACK_TITLE;
  const description = seo?.seo_meta_description || FALLBACK_DESCRIPTION;

  return {
    title,
    description,
    alternates: seo?.seo_canonical_url
      ? { canonical: seo.seo_canonical_url }
      : undefined,
    robots: {
      index: seo?.seo_index !== false,
      follow: seo?.seo_follow !== false,
    },
  };
}

export default async function AboutPage() {
  const content = await fetchPageContentMap("about");

  const heroTitle = getContentValue(content, "hero_title", "About CareerSasa");
  const heroSubtitle = getContentValue(
    content,
    "hero_subtitle",
    "Kenya's AI-Powered Job Platform. Where Skills Meet Opportunity"
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {heroTitle}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {heroSubtitle}
            </p>
          </div>

          <section className="prose prose-lg max-w-none">
            <div className="bg-card border border-border rounded-lg p-8 space-y-4">
              <h2 className="text-3xl font-bold text-primary">
                {getContentValue(content, "story_title", "Why We Built CareerSasa")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {getContentValue(
                  content,
                  "story_p1",
                  "We watched thousands of talented Kenyans send 50, 100, even 200 applications and hear nothing back. Not for lack of qualifications. The system was broken. Generic job boards match keywords, not skills. Resumes disappear into black holes. And employers waste weeks sifting through unqualified applicants."
                )}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {getContentValue(
                  content,
                  "story_p2",
                  "CareerSasa was built to fix that. We use AI-powered matching that connects candidates to jobs they'll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months."
                )}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {getContentValue(
                  content,
                  "story_p3",
                  "The result? Our users report 3x more interview callbacks than on other platforms, and employers fill positions faster with candidates who actually fit the role."
                )}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-primary text-center mb-8">
              {getContentValue(content, "values_title", "Our Core Values")}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {getContentValue(content, "value_speed_title", "Speed")}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "value_speed_body",
                    "Getting hired shouldn't take months. Our AI matching and real-time alerts cut job search time in half. Every day without work is a day too long."
                  )}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {getContentValue(content, "value_transparency_title", "Transparency")}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "value_transparency_body",
                    "No hidden fees. No ghost listings. Every job is verified, every salary shown where possible, and every application tracked. You deserve honesty in your job search."
                  )}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {getContentValue(content, "value_fairness_title", "Fairness")}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "value_fairness_body",
                    "Your background shouldn't determine your future. CareerSasa is free for every job seeker. The best candidate might be someone who can't afford a KES 5,000 CV service."
                  )}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {getContentValue(
                    content,
                    "value_innovation_title",
                    "Kenyan-First Innovation"
                  )}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "value_innovation_body",
                    "We build for Kenya's job market, from county-specific job filters to M-Pesa-friendly pricing to Swahili-friendly support. International tools don't understand our market. We do."
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 space-y-6">
            <h2 className="text-3xl font-bold text-primary text-center">
              {getContentValue(content, "stats_title", "CareerSasa by the Numbers")}
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              {getContentValue(content, "stats_subtitle", "Real results, not empty promises")}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary">
                  {getContentValue(content, "stats_jobs_value", "1,070+")}
                </div>
                <p className="text-muted-foreground">
                  {getContentValue(content, "stats_jobs_label", "Verified Active Jobs")}
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary">
                  {getContentValue(content, "stats_companies_value", "103+")}
                </div>
                <p className="text-muted-foreground">
                  {getContentValue(content, "stats_companies_label", "Hiring Companies")}
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-primary">
                  {getContentValue(content, "stats_callbacks_value", "3x")}
                </div>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "stats_callbacks_label",
                    "More Interview Callbacks"
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-8 space-y-4">
            <h2 className="text-3xl font-bold text-primary">
              {getContentValue(content, "commitment_title", "What This Means for You")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {getContentValue(
                content,
                "commitment_seeker",
                "If you're a job seeker: You get AI-matched to jobs that fit your actual skills, alerted in real time, and supported with free career tools, so you stop spraying applications and start landing interviews."
              )}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {getContentValue(
                content,
                "commitment_employer",
                "If you're an employer: You get pre-screened, qualified candidates delivered to your inbox, not 500 unqualified applicants you have to sift through. Post your first 3 jobs free and see the difference yourself."
              )}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
