"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Bell, Mail, Briefcase, MapPin } from "lucide-react";

export default function JobAlertsPage() {
  const [formData, setFormData] = useState({
    email: "",
    keywords: "",
    location: "",
    jobType: "",
    frequency: "daily",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Job alert created! You'll receive notifications based on your preferences.");
    setFormData({ email: "", keywords: "", location: "", jobType: "", frequency: "daily" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Never Miss a Job Again
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The best candidates apply within hours of a job being posted. Set up alerts and be first in line. Early applicants get 4x more interview callbacks.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <section className="bg-card border border-border rounded-lg p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">Create Your Free Job Alert</h2>
                <p className="text-muted-foreground">Takes 60 seconds. Jobs start coming to your inbox immediately.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Job Keywords</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="keywords"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="e.g. Software Developer, Marketing Manager"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Nairobi, Mombasa"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select value={formData.jobType} onValueChange={(value) => setFormData({ ...formData, jobType: value })}>
                    <SelectTrigger id="jobType">
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Alert Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (as jobs are posted)</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" required />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    I agree to receive job alerts via email
                  </label>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Create Alert
                </Button>
              </form>
            </section>

            <section className="space-y-6">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 space-y-4">
                <h2 className="text-2xl font-bold text-primary">Why Early Applicants Win</h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Be First, Not One of 200 Applicants</h3>
                      <p className="text-sm text-muted-foreground">Employers start reviewing applications within hours. Alerts put you at the front of the queue.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Stop Wasting Time Searching</h3>
                      <p className="text-sm text-muted-foreground">Jobs come to your inbox while you focus on preparing great applications, not scrolling job boards.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Only Jobs That Match Your Skills</h3>
                      <p className="text-sm text-muted-foreground">No irrelevant spam. Set your exact criteria and get only jobs you'd actually apply for.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm font-bold">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Pause Anytime. You're in Control</h3>
                      <p className="text-sm text-muted-foreground">Got a job? Pause alerts. Looking again? Turn them back on. No pressure, no spam.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-bold text-primary">How It Works</h3>
                <p className="text-sm text-muted-foreground mb-3">60 seconds to set up. Jobs start arriving immediately.</p>
                <ol className="space-y-3 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Fill out the form with your job preferences</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Choose how often you want to receive alerts</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Confirm your email address</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Start receiving personalized job notifications</span>
                  </li>
                </ol>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <h3 className="text-xl font-bold text-primary">Manage Your Alerts</h3>
                <p className="text-muted-foreground">
                  Already have an account? Log in to create multiple alerts for different roles and locations, edit your preferences, or pause alerts when you're not actively looking.
                </p>
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
