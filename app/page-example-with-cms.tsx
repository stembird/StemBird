"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import CanonicalTag from "@/components/CanonicalTag";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";

/**
 * EXAMPLE: Homepage with CMS Integration
 * 
 * This is an example showing how to use the CMS in your homepage.
 * Copy the patterns below to update your actual page.tsx file.
 */

export default function HomeWithCMS() {
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  // Fetch all homepage content
  const { data: content, isLoading } = usePageContent("home");

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchKeyword) params.set("search", searchKeyword);
    if (searchLocation) params.set("location", searchLocation);
    router.push(`/jobs?${params.toString()}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Get content values with fallbacks
  const heroTitle = getContentValue(content, "hero_title", "Your Dream Career Starts Here");
  const heroSubtitle = getContentValue(content, "hero_subtitle", "Join thousands of professionals");
  const statsJobs = getContentValue(content, "stats_jobs", "1070");
  const statsCompanies = getContentValue(content, "stats_companies", "103");
  const statsSuccessRate = getContentValue(content, "stats_success_rate", "90");
  const ctaTitle = getContentValue(content, "cta_title", "Ready to Transform Your Career?");
  const ctaSubtitle = getContentValue(content, "cta_subtitle", "Join thousands of professionals");

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <CanonicalTag url="/" />
      <Navbar />
      
      {/* Hero Section - Now using CMS content */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto grid lg:grid-cols-2 gap-8 items-center py-16 md:py-24 px-4">
          <div className="animate-fade-in z-10">
            {/* Editable via CMS: hero_title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent leading-tight">
              {heroTitle}
            </h1>
            
            {/* Editable via CMS: hero_subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              {heroSubtitle}
            </p>
            
            {/* Search Bar */}
            <div className="glass p-6 rounded-2xl mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Job title or keyword"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Location"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button variant="gradient" size="lg" onClick={handleSearch}>
                  <Search className="mr-2 h-5 w-5" />
                  Search Jobs
                </Button>
              </div>
            </div>

            {/* Quick Stats - Now using CMS content */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                {/* Editable via CMS: stats_jobs */}
                <div className="text-3xl font-bold text-primary">{statsJobs}+</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              <div className="text-center">
                {/* Editable via CMS: stats_companies */}
                <div className="text-3xl font-bold text-primary">{statsCompanies}+</div>
                <div className="text-sm text-muted-foreground">Companies</div>
              </div>
              <div className="text-center">
                {/* Editable via CMS: stats_success_rate */}
                <div className="text-3xl font-bold text-primary">{statsSuccessRate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative animate-slide-up">
            <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-3xl blur-3xl"></div>
            <img 
              src="/assets/hero-professional.jpg" 
              alt="Professional Kenyan Business Woman" 
              className="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Final CTA - Now using CMS content */}
      <section className="py-20 px-4 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          {/* Editable via CMS: cta_title */}
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{ctaTitle}</h2>
          
          {/* Editable via CMS: cta_subtitle */}
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            {ctaSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/jobs" prefetch={true}>
              <Button size="lg" variant="secondary">
                <Search className="mr-2 h-5 w-5" />
                Find Your Dream Job
              </Button>
            </Link>
            <Link href="/post-job" prefetch={true}>
              <Button size="lg" variant="outline">
                Post a Job Opening
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
