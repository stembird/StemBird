'use client';

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Linkedin, Mail, Sparkles } from "lucide-react";

export default function ServiceAdvertisement() {
  const services = [
    {
      number: 1,
      icon: <FileText className="h-4 w-4 text-primary" />,
      description: "Expert CV help that gets you noticed.",
      linkText: "Build Your CV",
      href: "/services/cv"
    },
    {
      number: 2,
      icon: <Mail className="h-4 w-4 text-primary" />,
      description: "A personalized cover letter for this role.",
      linkText: "Write Cover Letter",
      href: "/services/cover-letter"
    },
    {
      number: 3,
      icon: <Linkedin className="h-4 w-4 text-primary" />,
      description: "Attract recruiters with a stronger profile.",
      linkText: "Boost LinkedIn",
      href: "/services/linkedin"
    }
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="pb-2 pt-4 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-[#0A66C2] sm:text-lg">
          <Sparkles className="h-4 w-4 text-[#0A66C2] sm:h-5 sm:w-5" />
          Boost Your Application Success
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <ol className="space-y-2.5">
          {services.map((service) => (
            <li key={service.number} className="flex gap-2.5">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {service.number}
              </div>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <span className="mt-0.5 shrink-0">{service.icon}</span>
                  <span>
                    {service.description}{" "}
                    <Link
                      href={service.href}
                      className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
                    >
                      {service.linkText}
                    </Link>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
