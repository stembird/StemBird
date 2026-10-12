import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type BrowseHubChromeProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function BrowseHubChrome({
  eyebrow,
  title,
  description,
  children,
}: BrowseHubChromeProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-mesh opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-gradient-subtle" aria-hidden />
        <div className="container relative mx-auto px-4 py-8 md:py-10">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide">
            {eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>
      </section>

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
