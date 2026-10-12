import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions - CareerSasa Job Portal",
  description: "Read CareerSasa's terms and conditions for using our job portal. Understand your rights and responsibilities as a user of our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Terms & Conditions
            </h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-lg p-8 space-y-6 prose prose-sm max-w-none">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using CareerSasa (&quot;the Platform&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, you should not use this Platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">2. Use of Service</h2>
              <p className="text-muted-foreground">
                CareerSasa provides a platform for job seekers and employers to connect. You may use our services only as permitted by law and these Terms and Conditions.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>You must be at least 18 years old to use this service</li>
                <li>You agree to provide accurate and complete information</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You agree not to misuse the Platform or help anyone else do so</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">3. User Accounts</h2>
              <p className="text-muted-foreground">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">4. Job Postings</h2>
              <p className="text-muted-foreground">
                Employers posting jobs on CareerSasa agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Post only genuine job opportunities</li>
                <li>Provide accurate job descriptions and requirements</li>
                <li>Not discriminate on the basis of race, religion, gender, age, or disability</li>
                <li>Comply with all applicable employment laws</li>
                <li>Pay the agreed fees for job postings</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">5. Job Applications</h2>
              <p className="text-muted-foreground">
                Job seekers using CareerSasa agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide truthful and accurate information in applications</li>
                <li>Not submit fraudulent or misleading resumes</li>
                <li>Respect the confidentiality of employer information</li>
                <li>Not abuse the application system</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Platform and its original content, features, and functionality are owned by CareerSasa and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">7. Prohibited Activities</h2>
              <p className="text-muted-foreground">
                You may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Use the Platform for any illegal purpose</li>
                <li>Post false, inaccurate, misleading, or defamatory content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to the Platform</li>
                <li>Transmit viruses or malicious code</li>
                <li>Scrape or harvest data from the Platform</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">8. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms and Conditions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                CareerSasa shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">10. Disclaimer</h2>
              <p className="text-muted-foreground">
                The Platform is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. CareerSasa makes no warranties, expressed or implied, regarding the Platform&apos;s operation or the information, content, or materials included on it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">11. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">12. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">13. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: legal@careersasa.co.ke<br />
                Phone: +254 700 123 456
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
