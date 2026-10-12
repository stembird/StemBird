import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Cookie } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy - How We Use Cookies | CareerSasa",
  description: "Learn about how CareerSasa uses cookies and similar technologies to improve your experience on our job portal platform.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNav />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Cookie className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Cookie Policy
            </h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 space-y-6 prose prose-sm max-w-none">
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">1. What Are Cookies?</h2>
              <p className="text-muted-foreground">
                Cookies are small text files that are placed on your device when you visit our website. They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">2. How We Use Cookies</h2>
              <p className="text-muted-foreground">
                CareerSasa uses cookies to improve your experience on our platform. We use cookies for various purposes, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Keeping you signed in to your account</li>
                <li>Understanding how you use our website</li>
                <li>Remembering your preferences and settings</li>
                <li>Improving website performance and functionality</li>
                <li>Providing personalized content and job recommendations</li>
                <li>Analyzing traffic and usage patterns</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">3. Types of Cookies We Use</h2>
              
              <h3 className="text-lg font-semibold text-foreground mt-4">Essential Cookies</h3>
              <p className="text-muted-foreground">
                These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt-out of these cookies.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">Performance Cookies</h3>
              <p className="text-muted-foreground">
                These cookies collect information about how you use our website, such as which pages you visit most often. This data helps us optimize our website and improve user experience.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">Functionality Cookies</h3>
              <p className="text-muted-foreground">
                These cookies allow our website to remember choices you make (such as your username, language, or region) and provide enhanced, more personalized features.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-4">Targeting/Advertising Cookies</h3>
              <p className="text-muted-foreground">
                These cookies are used to deliver advertisements more relevant to you and your interests. They also help measure the effectiveness of advertising campaigns.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">4. Third-Party Cookies</h2>
              <p className="text-muted-foreground">
                In addition to our own cookies, we may use third-party cookies from trusted partners. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Analytics providers</strong> (e.g., Google Analytics) - to understand how users interact with our website</li>
                <li><strong>Social media platforms</strong> - to enable social sharing features</li>
                <li><strong>Advertising networks</strong> - to deliver relevant advertisements</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">5. Managing Cookies</h2>
              <p className="text-muted-foreground">
                Most web browsers automatically accept cookies, but you can modify your browser settings to decline cookies if you prefer. Here&apos;s how to manage cookies in popular browsers:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Google Chrome</strong> - Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Mozilla Firefox</strong> - Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari</strong> - Preferences → Privacy → Cookies and website data</li>
                <li><strong>Microsoft Edge</strong> - Settings → Cookies and site permissions → Cookies and site data</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Please note that disabling cookies may affect the functionality of our website and limit your access to certain features.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-primary">6. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about our use of cookies, please contact us at:
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
