"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, Smartphone } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MpesaCheckoutDialog } from "@/components/payments/MpesaCheckoutDialog";
import { PriceTag } from "@/components/payments/PriceTag";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { quoteProductPrice } from "@/lib/pricing";
import { productForPackage } from "@/lib/pricing/defaults";

const WHATSAPP_BASE = "https://wa.me/254795564135";

export type ServicePackage = {
  id: string;
  title: string;
  subtitle: string;
  features: string[];
  bestFor: string;
  price: string;
  sku?: string;
  whatsappMessage: string;
};

export type ServiceAudience = {
  title: string;
  description: string;
};

export type ServiceLandingContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescriptions: string[];
  heroImage: string;
  heroImageAlt: string;
  painTitle: string;
  painPoints: string[];
  painClosing: string;
  differentiatorsTitle: string;
  differentiators: string[];
  differentiatorsNote: string;
  packagesTitle: string;
  packages: ServicePackage[];
  customTitle: string;
  customSubtitle: string;
  customIntro: string;
  customIncludes: string[];
  customWhatsappMessage: string;
  processTitle: string;
  processSteps: string[];
  audiencesTitle: string;
  audiencesIntro: string;
  audiences: ServiceAudience[];
  ctaTitle: string;
  ctaLines: string[];
  ctaWhatsappMessage: string;
  ctaButtonLabel: string;
  serviceKey?: "cv" | "cover-letter" | "linkedin";
};

function stripLeadingEmoji(title: string): string {
  return title.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, "").trim();
}

function waLink(message: string): string {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

export default function ServiceLanding({ content }: { content: ServiceLandingContent }) {
  const { products, offers } = usePricingCatalog();
  const [checkout, setCheckout] = useState<{ sku: string; title: string; amount: number } | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-6xl overflow-x-hidden px-4 py-8 sm:py-12">
        {/* Hero */}
        <section className="mb-12 grid items-center gap-8 md:mb-16 md:grid-cols-2 md:gap-12">
          <div className="space-y-4 text-center md:text-left">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Career Boost
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {content.heroTitle}
              </span>
            </h1>
            <p className="text-lg font-medium text-foreground/90 sm:text-xl">
              {content.heroSubtitle}
            </p>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              {content.heroDescriptions.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 md:justify-start">
              <Link href={waLink(content.ctaWhatsappMessage)} target="_blank">
                <Button variant="gradient" className="h-10 px-4">
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </Button>
              </Link>
              <Link href="#packages">
                <Button variant="outline" className="h-10 px-4">
                  View Packages
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <img
                src={content.heroImage}
                alt={content.heroImageAlt}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -left-3 hidden h-20 w-20 rounded-lg border border-border bg-gradient-primary shadow-md sm:block" />
          </div>
        </section>

        {/* Pain points */}
        <section className="mb-12 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 sm:mb-16 sm:p-8">
          <h2 className="mb-6 text-center text-2xl font-bold text-primary sm:text-3xl">
            {content.painTitle}
          </h2>
          <ul className="mx-auto max-w-3xl space-y-3">
            {content.painPoints.map((point) => (
              <li key={point.slice(0, 48)} className="flex gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="leading-relaxed text-foreground/90">{point}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm italic text-muted-foreground sm:text-base">
            {content.painClosing}
          </p>
        </section>

        {/* Differentiators */}
        <section className="mb-12 sm:mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-primary sm:text-3xl">
            {content.differentiatorsTitle}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="min-w-0 border-border">
              <CardContent className="space-y-4 p-6">
                {content.differentiators.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10">
              <CardContent className="flex h-full flex-col items-center justify-center gap-5 p-5 text-center sm:p-6">
                <p className="text-muted-foreground leading-relaxed">
                  {content.differentiatorsNote}
                </p>
                <Link
                  href={waLink(content.ctaWhatsappMessage)}
                  target="_blank"
                  className="max-w-full"
                >
                  <Button variant="secondary" className="h-10 max-w-full px-4">
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">Chat on WhatsApp</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Packages */}
        <section id="packages" className="mb-12 scroll-mt-24 sm:mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-primary sm:text-3xl">
            {content.packagesTitle}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.packages.map((pkg) => {
              const product =
                (pkg.sku ? products.find((p) => p.sku === pkg.sku) : undefined) ||
                (content.serviceKey
                  ? productForPackage(content.serviceKey, pkg.id, products)
                  : undefined);
              const quote = product ? quoteProductPrice(product, offers) : null;
              return (
              <Card
                key={pkg.id}
                className="flex h-full min-w-0 flex-col border-border transition-shadow hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg leading-snug">
                    {stripLeadingEmoji(pkg.title)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{pkg.subtitle}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                  <ul className="flex-1 space-y-2">
                    {pkg.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-center text-xs italic text-muted-foreground">
                    {pkg.bestFor}
                  </p>
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                    {quote ? (
                      <PriceTag
                        amount={quote.amount}
                        compareAt={quote.compareAtPrice}
                        billingInterval={product?.billing_interval}
                        badge={quote.offer?.badge_text}
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary">{pkg.price}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {quote && quote.amount > 0 && product && (
                      <Button
                        variant="gradient"
                        className="h-10 px-4"
                        onClick={() =>
                          setCheckout({
                            sku: product.sku,
                            title: pkg.title,
                            amount: quote.amount,
                          })
                        }
                      >
                        <Smartphone className="h-4 w-4" />
                        Pay with M-Pesa
                      </Button>
                    )}
                    <Link
                      href={waLink(pkg.whatsappMessage)}
                      target="_blank"
                      className="mx-auto block w-fit max-w-full"
                    >
                      <Button variant="secondary" className="h-10 px-4">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </section>

        {/* Custom */}
        <section className="mb-12 rounded-xl border border-border bg-card p-6 sm:mb-16 sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-2 text-2xl font-bold text-primary sm:text-3xl">
              {content.customTitle}
            </h2>
            <p className="mb-4 text-lg font-medium text-foreground/90">
              {content.customSubtitle}
            </p>
            <p className="mb-6 text-muted-foreground leading-relaxed">
              {content.customIntro}
            </p>
          </div>
          <div className="mx-auto mb-6 grid max-w-3xl gap-3 sm:grid-cols-2">
            {content.customIncludes.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground/90"
              >
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              Custom pricing based on scope
            </p>
            <Link href={waLink(content.customWhatsappMessage)} target="_blank">
              <Button variant="gradient" className="h-10 px-4">
                Custom Quote
              </Button>
            </Link>
          </div>
        </section>

        {/* Process */}
        <section className="mb-12 sm:mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-primary sm:text-3xl">
            {content.processTitle}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {content.processSteps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground shadow-md">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-snug sm:text-base">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Audiences */}
        <section className="mb-12 sm:mb-16">
          <h2 className="mb-3 text-center text-2xl font-bold text-primary sm:text-3xl">
            {content.audiencesTitle}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
            {content.audiencesIntro}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {content.audiences.map((audience) => (
              <Card key={audience.title} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary sm:text-lg">
                    {audience.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {audience.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mb-8 overflow-hidden rounded-xl bg-gradient-primary p-6 text-center text-primary-foreground shadow-lg sm:p-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl">
            {content.ctaTitle}
          </h2>
          {content.ctaLines.map((line) => (
            <p
              key={line.slice(0, 40)}
              className="mx-auto mb-2 max-w-2xl text-primary-foreground/90"
            >
              {line}
            </p>
          ))}
          <div className="mt-6">
            <Link href={waLink(content.ctaWhatsappMessage)} target="_blank">
              <Button className="h-10 bg-white px-4 text-primary hover:bg-white/90">
                {content.ctaButtonLabel}
              </Button>
            </Link>
            <p className="mt-4 text-sm text-primary-foreground/80">
              Limited writing slots available each week
            </p>
          </div>
        </section>
      </main>
      {checkout && (
        <MpesaCheckoutDialog
          open={!!checkout}
          onOpenChange={(open) => {
            if (!open) setCheckout(null);
          }}
          title={checkout.title}
          description="Pay with M-Pesa Send Money or Buy Goods and Services."
          amount={checkout.amount}
          sku={checkout.sku}
          onSuccess={() => setCheckout(null)}
        />
      )}
    </div>
  );
}
