import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Rocket, Eye, Lightbulb, TrendingUp, Users, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Mission - Kenya's Fastest Path from Job Search to Job Offer | CareerSasa",
  description: "CareerSasa's mission: end the broken job search cycle in Kenya by using AI matching, free career tools, and verified listings so every qualified Kenyan lands interviews, not rejection silence.",
};

export default function MissionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Our Mission
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              End the cycle of 200 applications and zero callbacks for every Kenyan professional
            </p>
          </div>

          {/* Mission Statement */}
          <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-8 md:p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">The Problem We're Solving</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Every day, thousands of qualified Kenyans send applications into a void. CVs are filtered out by keyword algorithms that don't understand skills. Employers receive hundreds of applicants but struggle to find the right fit. The result? Months of unemployment for talented people and months of unfilled roles for growing companies. CareerSasa exists to end this waste, for both sides.
            </p>
          </section>

          {/* Vision */}
          <section className="bg-card border border-border rounded-lg p-8 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-primary">Where We're Going</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We envision a Kenya where no qualified professional is invisible to employers, and no employer wastes months on the wrong candidates. A Kenya where a fresh graduate in Kisumu has the same access to opportunity as an executive in Nairobi. Where getting hired is measured in days, not months. CareerSasa is building that future, one AI-matched connection at a time.
            </p>
          </section>

          {/* What Drives Us */}
          <section>
            <h2 className="text-3xl font-bold text-primary text-center mb-8">What Drives Us</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI That Matches Skills, Not Keywords</h3>
                <p className="text-muted-foreground">
                  Most job boards match exact words. Our AI understands that a project manager who led a 15-person team is qualified for a "Team Lead" role, even if the words don't match. This is why our users get 3x more interview callbacks.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Free Career Tools for Every Kenyan</h3>
                <p className="text-muted-foreground">
                  A great CV shouldn't cost KES 5,000. We provide free CV builders, cover letter generators, LinkedIn optimizers, and interview prep. The barrier to getting hired should never be money.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Opportunity in Every County</h3>
                <p className="text-muted-foreground">
                  Jobs shouldn't only exist in Nairobi. Our platform covers all 47 counties, with county-specific filters, so a nurse in Kilifi or a teacher in Turkana can find opportunities near home.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Hire in Days, Not Months</h3>
                <p className="text-muted-foreground">
                  Employers don't need 500 applicants. They need 5 qualified ones. We pre-screen candidates so employers see only people who fit the role, cutting time-to-hire from months to days.
                </p>
              </div>
            </div>
          </section>

          {/* Our Commitments */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-primary text-center">Our Commitments</h2>
            <div className="grid gap-4">
              <div className="bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary p-6 rounded-r-lg">
                <h3 className="text-lg font-semibold text-foreground mb-2">To Job Seekers</h3>
                <p className="text-muted-foreground">
                  We will never charge you to find a job. We will match you to roles you'll actually get, alert you the moment they're posted, and give you free tools to make your application impossible to ignore.
                </p>
              </div>

              <div className="bg-gradient-to-r from-secondary/5 to-transparent border-l-4 border-secondary p-6 rounded-r-lg">
                <h3 className="text-lg font-semibold text-foreground mb-2">To Employers</h3>
                <p className="text-muted-foreground">
                  We will send you qualified candidates, not a flood of unqualified applicants. Your first 3 job posts are free. We want you to see the difference before you pay a shilling.
                </p>
              </div>

              <div className="bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary p-6 rounded-r-lg">
                <h3 className="text-lg font-semibold text-foreground mb-2">To Our Community</h3>
                <p className="text-muted-foreground">
                  We will be transparent about our data, honest in our listings, and relentless in our mission to make Kenya's job market work for everyone, not just those who can afford to game the system.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-primary">Ready to See the Difference?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join free. Get matched to jobs that fit your skills. Land your next interview. That's not a slogan. That's what happens on CareerSasa every day.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
