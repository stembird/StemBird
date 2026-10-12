import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/index.css";
import { Providers } from "./providers";
import { NavigationEvents } from "@/components/NavigationEvents";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.careersasa.co.ke'),
  title: {
    default: "CareerSasa – Your Career Starts Sasa",
    template: "%s | CareerSasa"
  },
  description: "Discover the latest job opportunities in Kenya. Connect with top employers and advance your career with CareerSasa.",
  keywords: "jobs, careers, Kenya, employment, job search, career opportunities, Kenyan jobs",
  authors: [{ name: "CareerSasa" }],
  creator: "CareerSasa",
  publisher: "CareerSasa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE_HERE" />
        {/* Bing Webmaster Tools Verification */}
        <meta name="msvalidate.01" content="YOUR_BING_WEBMASTER_TOOLS_VERIFICATION_CODE_HERE" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Suspense fallback={null}>
            <NavigationEvents />
          </Suspense>
        </Providers>
        <Suspense fallback={null}>
          {gaMeasurementId && (
            <GoogleAnalytics gaMeasurementId={gaMeasurementId} />
          )}
        </Suspense>
      </body>
    </html>
  );
}