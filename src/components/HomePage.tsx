"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, ArrowRight, MapPin, CheckCircle2, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import CanonicalTag from "@/components/CanonicalTag";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Autoplay from "embla-carousel-autoplay";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";
import { formatJobSeoTitle, jobPostedLabel } from "@/lib/textUtils";
import type { CountyJobCount } from "@/lib/jobsByCounty";
import type { FunctionJobCount } from "@/lib/jobsByFunction";
import type { IndustryJobCount } from "@/lib/jobsByIndustry";
import type { JobCardRow } from "@/lib/jobCardSelect";
import type { HomeBlogPost } from "@/lib/latestJobs";
import { ExploreJobsByFunction } from "@/components/ExploreJobsByFunction";
import { ExploreJobsByIndustry } from "@/components/ExploreJobsByIndustry";
import { ExploreJobsByCountyTeaser } from "@/components/ExploreJobsByCounty";

type HomeJobCompany = {
  id?: string | null;
  name?: string | null;
  logo?: string | null;
  website?: string | null;
} | null;

function homeJobCompanyName(job: {
  company?: string | null;
  companies?: HomeJobCompany | HomeJobCompany[];
}) {
  const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
  return company?.name || job.company || "";
}

function homeJobHref(job: { id: string; job_slug?: string | null }) {
  return `/jobs/${job.job_slug || job.id}`;
}

/** Shared with Latest Job Openings — keep every homepage section header identical. */
const SECTION_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2 text-[#0A66C2]";
const SECTION_SUBCOPY_CLASS = "text-muted-foreground";
const SECTION_HEADER_WRAP_CLASS = "mb-4 md:mb-6 text-center";
/** Final CTA sits on primary gradient — keep heading light for contrast. */
const CTA_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2";

type HomePageProps = {
  topCompanies: CompanyCardData[];
  activeJobsCount: number;
  companiesCount: number;
  jobsByCounty: CountyJobCount[];
  jobsByFunction: FunctionJobCount[];
  jobsByIndustry: IndustryJobCount[];
  latestJobs: JobCardRow[];
  recentPosts: HomeBlogPost[];
};

export default function HomePage({
  topCompanies,
  activeJobsCount,
  companiesCount,
  jobsByCounty,
  jobsByFunction,
  jobsByIndustry,
  latestJobs = [],
  recentPosts = [],
}: HomePageProps) {
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [activeJobs, setActiveJobs] = useState(0);
  const [companies, setCompanies] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const { data: content } = usePageContent("home");

  const heroTitle = getContentValue(content, "hero_title", "Stop Searching. Start Getting Hired.");
  const heroSubtitle = getContentValue(content, "hero_subtitle", "You've sent dozens of applications with zero callbacks. CareerSasa changes that. We match your skills directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.");
  const statsJobsTarget = Math.max(0, activeJobsCount);
  const statsCompaniesTarget = Math.max(0, companiesCount);
  const statsSuccessRateTarget = parseInt(getContentValue(content, "stats_success_rate", "90"));
  const ctaTitle = getContentValue(content, "cta_title", "Your Next Interview Is 60 Seconds Away");
  const ctaSubtitle = getContentValue(content, "cta_subtitle", "CareerSasa matches your skills directly to employer requirements, not just keywords. That's why our users get 3x more interview callbacks than on other job boards. Join free today.");

  const companiesPlugin = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true })
  );

  useEffect(() => {
    hasAnimatedRef.current = false;
    setActiveJobs(0);
    setCompanies(0);
    setSuccessRate(0);

    const intervals: ReturnType<typeof setInterval>[] = [];

    const animateCount = (
      target: number,
      setter: (value: number) => void,
      preferredSteps = 40
    ) => {
      if (target <= 0) {
        setter(0);
        return;
      }
      const step = Math.max(1, Math.ceil(target / preferredSteps));
      let current = 0;
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setter(target);
          clearInterval(interval);
        } else {
          setter(current);
        }
      }, 30);
      intervals.push(interval);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          animateCount(statsJobsTarget, setActiveJobs);
          animateCount(statsCompaniesTarget, setCompanies, 35);
          animateCount(statsSuccessRateTarget, setSuccessRate, 45);
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      intervals.forEach(clearInterval);
      observer.disconnect();
    };
  }, [statsJobsTarget, statsCompaniesTarget, statsSuccessRateTarget]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchKeyword) params.set("search", searchKeyword);
    if (searchLocation) params.set("location", searchLocation);
    router.push(`/jobs?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <CanonicalTag url="/" />
      <Navbar />

      {/* Hero — full-bleed image with overlay content */}
      <section className="relative overflow-hidden border-b border-border/40 min-h-[min(88vh,720px)] flex items-center">
        <img
          src="/assets/hero-professional.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] animate-fade-in"
        />
        {/* Soft vignette: clearer photo, contrast kept behind text */}
        <div
          className="absolute inset-0 bg-[#0a1628]/20 md:bg-[#0a1628]/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/70 via-[#0a1628]/25 to-[#0a1628]/30"
          aria-hidden
        />

        <div className="container relative z-10 mx-auto py-12 md:py-16 px-4">
          <div className="max-w-2xl animate-fade-in md:mx-auto md:text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200 mb-3 font-semibold drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
              CareerSasa · Kenya
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-[3.25rem] font-bold mb-4 text-[#0A66C2] leading-[1.1] drop-shadow-[0_1px_10px_rgba(255,255,255,0.75)]">
              {heroTitle}
            </h1>
            <p className="text-base md:text-lg text-white mb-6 max-w-xl leading-relaxed md:mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
              {heroSubtitle}
            </p>

            <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl mb-5 shadow-xl border border-white/40">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Job title or keyword"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Location"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button variant="gradient" size="lg" className="sm:w-auto" onClick={handleSearch}>
                  <Search className="mr-2 h-5 w-5" />
                  Search Jobs
                </Button>
              </div>
            </div>

            <div
              ref={statsRef}
              className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-white/25 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md py-3 animate-slide-up"
            >
              <div className="text-center px-1">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {activeJobs.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-sm text-white/70 uppercase tracking-wide mt-1">
                  Active Jobs
                </div>
              </div>
              <div className="text-center px-1">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {companies.toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-sm text-white/70 uppercase tracking-wide mt-1">
                  Companies
                </div>
              </div>
              <div className="text-center px-1">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {successRate}%
                </div>
                <div className="text-[10px] sm:text-sm text-white/70 uppercase tracking-wide mt-1">
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse teasers — full map / charts live on dedicated hub pages */}
      {jobsByIndustry.length > 0 && (
        <ExploreJobsByIndustry industries={jobsByIndustry} variant="teaser" />
      )}

      {jobsByFunction.length > 0 && (
        <ExploreJobsByFunction functions={jobsByFunction} variant="teaser" />
      )}

      {jobsByCounty.length > 0 && (
        <ExploreJobsByCountyTeaser counties={jobsByCounty} />
      )}

      {/* Top companies by open roles */}
      {topCompanies.length > 0 && (
        <section className="py-3 md:py-8 px-4 bg-gradient-subtle">
          <div className="container mx-auto">
            <div className={SECTION_HEADER_WRAP_CLASS}>
              <h2 className={SECTION_HEADING_CLASS}>
                Top Companies Hiring Now
              </h2>
              <p className={SECTION_SUBCOPY_CLASS}>
                Employers with the most open roles — explore profiles and apply
              </p>
            </div>

            <Carousel
              className="w-full"
              opts={{ align: "start", loop: true }}
              plugins={[companiesPlugin.current]}
              onMouseEnter={companiesPlugin.current.stop}
              onMouseLeave={companiesPlugin.current.reset}
            >
              <CarouselContent className="-ml-2 md:-ml-3">
                {topCompanies.map((company) => (
                  <CarouselItem
                    key={company.id}
                    className="pl-2 md:pl-3 basis-[70%] sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                  >
                    <CompanyCard
                      company={company}
                      variant="compact"
                      className="h-full"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>

            <div className="mt-4 flex justify-center">
              <Link href="/companies/industry/all" prefetch={true}>
                <Button variant="outline" className="whitespace-nowrap">
                  Browse all companies <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-3 md:py-8 px-4">
        <div className="container mx-auto">
          <div className={SECTION_HEADER_WRAP_CLASS}>
            <h2 className={SECTION_HEADING_CLASS}>
              Why 95% of Our Users Land Interviews Within 3 Months
            </h2>
            <p className={`${SECTION_SUBCOPY_CLASS} max-w-2xl mx-auto`}>
              Most job boards dump listings and leave you to figure it out. CareerSasa is
              different. We actively match you to employers using AI, not just keywords.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div>
              <div className="space-y-3">
                {[
                  "Smart AI matching that connects your skills to jobs you'll actually get, not just jobs that exist",
                  "Real-time alerts: be among the first to apply when new roles drop in your inbox",
                  "Free career tools worth KES 10,000+: CV builder, cover letter generator & LinkedIn optimizer",
                  "1,070+ verified jobs from 103+ companies across every county in Kenya",
                  "Zero spam, zero ghost listings. Every job is verified and actively hiring",
                  "Trusted by Kenyan professionals, built by Kenyans, for Kenya's job market",
                  "Our users report 3x more interview callbacks compared to applying on generic job boards",
                  "100% free to join, search, and apply. No hidden fees, no catch",
                ].map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <p className="text-base md:text-lg">{benefit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/jobs" prefetch={true}>
                  <Button variant="gradient" size="lg">
                    Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-secondary opacity-10 rounded-3xl blur-3xl" />
              <img
                src="/assets/team-collaboration.jpg"
                alt="Kenyan Professionals Collaborating"
                className="relative rounded-3xl shadow-2xl w-full h-[420px] md:h-[520px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-3 md:py-8 px-4 bg-gradient-subtle">
        <div className="container mx-auto">
          <div className={SECTION_HEADER_WRAP_CLASS}>
            <h2 className={SECTION_HEADING_CLASS}>
              From &quot;No Callbacks&quot; to &quot;When Can You Start?&quot;
            </h2>
            <p className={`${SECTION_SUBCOPY_CLASS} max-w-2xl mx-auto`}>
              Real Kenyans. Real results. Here&apos;s what happens when your CV meets the right
              platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                name: "David Kamau",
                role: "Software Developer at Safaricom",
                image: "/assets/testimonial-1.jpg",
                quote:
                  "I'd been applying for 4 months with zero callbacks. Within 2 weeks on CareerSasa, I had 3 interviews. The AI matching actually works. It connected me to roles I would never have found myself.",
              },
              {
                name: "Grace Wanjiru",
                role: "Marketing Manager at KCB",
                image: "/assets/testimonial-2.jpg",
                quote:
                  "I was stuck in a dead-end role for 2 years. CareerSasa's job alerts put a marketing manager position in my inbox that I wasn't even searching for. I applied the same day and got the offer.",
              },
              {
                name: "Brian Ochieng",
                role: "Data Analyst at Equity Bank",
                image: "/assets/testimonial-3.jpg",
                quote:
                  "The free CV builder alone was worth signing up for. But what surprised me was getting 3 interview invitations in my first month. CareerSasa shows you jobs that actually match your skills.",
              },
            ].map((testimonial, idx) => (
              <Card
                key={idx}
                className="glass hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Jobs */}
      <section className="py-3 md:py-8 px-4">
        <div className="container mx-auto">
          <div className={SECTION_HEADER_WRAP_CLASS}>
            <h2 className={SECTION_HEADING_CLASS}>Latest Job Openings</h2>
            <p className={SECTION_SUBCOPY_CLASS}>
              Fresh opportunities posted today. Early applicants get 4x more callbacks
            </p>
          </div>

          {latestJobs.length === 0 ? (
            <div className="text-center py-10">No jobs posted yet.</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-4">
                {latestJobs.map((job) => {
                  const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
                  const companyName = homeJobCompanyName(job);
                  const postedLabel = jobPostedLabel(job.date_posted || job.created_at);
                  return (
                    <Card
                      key={job.id}
                      className={`group glass hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                        job.is_featured ? "border-2 border-yellow-500/50 shadow-lg" : ""
                      } ${job.is_promoted ? "border-2 border-blue-500/50" : ""}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            {job.is_featured && (
                              <Badge className="bg-yellow-500 text-white gap-1">
                                <Star className="h-3 w-3 fill-white" />
                                Featured
                              </Badge>
                            )}
                            {job.is_promoted && (
                              <Badge className="bg-blue-500 text-white">Promoted</Badge>
                            )}
                            {!job.is_featured && !job.is_promoted && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          {postedLabel ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {postedLabel}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-xl font-semibold mb-2 line-clamp-1 text-foreground transition-colors group-hover:text-[#0A66C2] group-active:text-[#0A66C2]">
                          {formatJobSeoTitle(job.title, companyName, {
                            city: job.job_location_city,
                            county: job.job_location_county,
                            rawLocation: job.location,
                            isRemote: job.job_location_type === "REMOTE",
                          })}
                        </h3>
                        <div className="flex items-center gap-2 text-foreground mb-2">
                          <CompanyLogo
                            name={companyName}
                            logo={company?.logo}
                            website={company?.website}
                            size="sm"
                          />
                          <span className="line-clamp-1 font-medium">{companyName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-4">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">{job.location}</span>
                        </div>
                        {job.salary && (
                          <div className="text-primary font-semibold mb-4">{job.salary}</div>
                        )}
                        <Link href={homeJobHref(job)} prefetch={true}>
                          <Button className="w-full">Apply Now</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Link href="/jobs" prefetch={true}>
                  <Button variant="outline" className="whitespace-nowrap">
                    Browse all jobs <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-3 md:py-8 px-4 bg-gradient-subtle">
        <div className="container mx-auto">
          <div className={SECTION_HEADER_WRAP_CLASS}>
            <h2 className={SECTION_HEADING_CLASS}>
              Your Career, Transformed
            </h2>
            <p className={`${SECTION_SUBCOPY_CLASS} max-w-2xl mx-auto`}>
              From fresh graduates to senior executives, CareerSasa has helped thousands of
              Kenyans level up.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <Card className="glass overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="overflow-hidden h-[22rem] md:h-[26rem]">
                <img
                  src="/assets/success-story-1.jpg"
                  alt="Success Story"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <CardContent className="p-5">
                <h3 className="text-2xl font-semibold mb-3">
                  From Graduate to Senior Manager in 3 Years
                </h3>
                <p className="text-muted-foreground mb-4">
                  &quot;I started as a fresh graduate with no connections. CareerSasa matched me
                  to my first role, then my second, then my third. In 3 years, I went from intern
                  to Senior Manager at NCBA Bank. Every opportunity was the right next step.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary" />
                  <div>
                    <div className="font-semibold">Sarah Njeri</div>
                    <div className="text-sm text-muted-foreground">
                      Senior Manager, NCBA Bank
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="overflow-hidden h-[22rem] md:h-[26rem]">
                <img
                  src="/assets/success-story-2.jpg"
                  alt="Success Story"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <CardContent className="p-5">
                <h3 className="text-2xl font-semibold mb-3">
                  Career Change Without Starting Over
                </h3>
                <p className="text-muted-foreground mb-4">
                  &quot;I spent 6 years in finance and wanted to move into tech, but every job
                  board made me feel like I had to start from scratch. CareerSasa&apos;s matching
                  found tech roles that valued my finance background. I&apos;m now a Tech Lead at
                  Andela Kenya.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-secondary" />
                  <div>
                    <div className="font-semibold">Michael Otieno</div>
                    <div className="text-sm text-muted-foreground">
                      Tech Lead, Andela Kenya
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blog */}
      {recentPosts.length > 0 && (
        <section className="py-3 md:py-8 px-4">
          <div className="container mx-auto">
            <div className={SECTION_HEADER_WRAP_CLASS}>
              <h2 className={SECTION_HEADING_CLASS}>
                Career Insights That Actually Get You Hired
              </h2>
              <p className={SECTION_SUBCOPY_CLASS}>
                Free expert advice. Knowing what employers want is half the battle
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-4">
              {recentPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} prefetch={true}>
                  <Card className="glass hover:shadow-xl transition-all duration-300 hover:scale-105 h-full">
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-48 object-cover rounded-t-xl"
                      />
                    )}
                    <CardContent className="p-5">
                      {post.category && (
                        <Badge variant="secondary" className="mb-3">
                          {post.category}
                        </Badge>
                      )}
                      <h3 className="text-xl font-semibold mb-3 line-clamp-2">{post.title}</h3>
                      <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="flex justify-center">
              <Link href="/blog" prefetch={true}>
                <Button variant="outline" className="whitespace-nowrap">
                  Read More <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-8 md:py-10 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className={CTA_HEADING_CLASS}>{ctaTitle}</h2>
          <p className="mb-6 max-w-2xl mx-auto opacity-90">
            {ctaSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/jobs" prefetch={true}>
              <Button
                variant="secondary"
                className="h-10 px-4 text-base"
              >
                <Search className="h-4 w-4 shrink-0" />
                Find Jobs
              </Button>
            </Link>
            <Link href="/post-job" prefetch={true}>
              <Button
                variant="outline"
                className="h-10 border-2 border-primary-foreground bg-transparent px-4 text-base text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                Post a Job
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
