"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Clock } from "lucide-react";
import { getContentValue } from "@/lib/pageContent";

type ContactPageProps = {
  content: Record<string, string>;
};

export function ContactPage({ content }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you for contacting us! We'll respond within 24 hours.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const heroTitle = getContentValue(content, "hero_title", "Contact Us");
  const heroSubtitle = getContentValue(
    content,
    "hero_subtitle",
    "We're here to help. Reach out with any questions or concerns."
  );
  const emailValue = getContentValue(
    content,
    "email_value",
    "support@careersasa.co.ke"
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

          <div className="grid lg:grid-cols-2 gap-8">
            <section className="bg-card border border-border rounded-lg p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">
                  {getContentValue(content, "form_title", "Send Us a Message")}
                </h2>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "form_subtitle",
                    "Fill out the form below and we'll get back to you soon."
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="George Juma"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="george@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="How can we help?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  {getContentValue(content, "form_button", "Send Message")}
                </Button>
              </form>
            </section>

            <section className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-2xl font-bold text-primary">
                  {getContentValue(content, "info_title", "Contact Information")}
                </h2>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {getContentValue(content, "email_label", "Email")}
                      </h3>
                      <a
                        href={`mailto:${emailValue}`}
                        className="text-muted-foreground hover:text-foreground break-all"
                      >
                        {emailValue}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {getContentValue(content, "hours_label", "Business Hours")}
                      </h3>
                      <p className="text-muted-foreground">
                        {getContentValue(
                          content,
                          "hours_weekday",
                          "Monday - Friday: 8:00 AM - 6:00 PM"
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {getContentValue(
                          content,
                          "hours_saturday",
                          "Saturday: 9:00 AM - 2:00 PM"
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {getContentValue(content, "hours_sunday", "Sunday: Closed")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 space-y-3">
                <h3 className="text-xl font-bold text-primary">
                  {getContentValue(content, "support_title", "Quick Support")}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "support_body",
                    "Email us anytime — we typically respond within 24 hours during business days."
                  )}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-3">
                <h3 className="text-xl font-bold text-primary">
                  {getContentValue(content, "faq_title", "FAQ")}
                </h3>
                <p className="text-muted-foreground">
                  {getContentValue(
                    content,
                    "faq_body",
                    "Before reaching out, check our FAQ section for quick answers to common questions about job postings, applications, and account management."
                  )}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
