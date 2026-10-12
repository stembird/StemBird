import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - How We Protect Your Data | CareerSasa",
  description: "Learn how CareerSasa collects, uses, and protects your personal information. We are committed to your privacy and data security.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-lg p-8 space-y-6 prose prose-sm max-w-none">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">1. Introduction</h2>
              <p className="text-muted-foreground">
                At CareerSasa, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job portal platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">2. Information We Collect</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4">Personal Information</h3>
              <p className="text-muted-foreground">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Name, email address, and phone number</li>
                <li>Resume/CV and cover letter</li>
                <li>Work experience and education history</li>
                <li>Skills and qualifications</li>
                <li>Profile photo (optional)</li>
                <li>Job preferences and search criteria</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-4">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>IP address and browser type</li>
                <li>Device information</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Connect job seekers with potential employers</li>
                <li>Send job alerts and notifications</li>
                <li>Communicate with you about your account</li>
                <li>Personalize your experience</li>
                <li>Analyze usage patterns and improve functionality</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">4. Information Sharing and Disclosure</h2>
              <h3 className="text-lg font-semibold text-foreground mt-4">With Employers</h3>
              <p className="text-muted-foreground">
                When you apply for a job, your application materials (resume, cover letter, contact information) are shared with the employer who posted the job.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">With Service Providers</h3>
              <p className="text-muted-foreground">
                We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, and customer service.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">Legal Requirements</h3>
              <p className="text-muted-foreground">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities.
              </p>

              <p className="text-muted-foreground font-semibold mt-4">
                We will never sell your personal information to third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and assessments</li>
                <li>Access controls and authentication</li>
                <li>Secure data storage practices</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">6. Your Rights and Choices</h2>
              <p className="text-muted-foreground">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of marketing communications</li>
                <li>Request a copy of your data</li>
                <li>Object to processing of your personal information</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">7. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">10. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and maintained on computers located outside of your country where data protection laws may differ. We take appropriate steps to ensure your data is treated securely.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">12. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: privacy@careersasa.co.ke<br />
                Phone: +254 700 123 456<br />
                Address: Westlands, Nairobi, Kenya
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
