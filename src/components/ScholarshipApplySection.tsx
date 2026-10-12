"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

type ScholarshipApplySectionProps = {
  job: {
    title?: string | null;
    application_url?: string | null;
    apply_link?: string | null;
    apply_email?: string | null;
  };
  expired?: boolean;
  embedded?: boolean;
};

export default function ScholarshipApplySection({
  job,
  expired = false,
  embedded = false,
}: ScholarshipApplySectionProps) {
  const router = useRouter();
  const applyUrl = job.apply_link || job.application_url || null;
  const applyEmail = job.apply_email || null;

  const closed = (
    <div className="space-y-3">
      <p className="text-sm font-medium text-orange-700">
        Applications are closed — this scholarship has expired.
      </p>
      <p className="text-sm text-muted-foreground">
        Browse related scholarships below, or explore other open awards.
      </p>
      <Button variant="outline" className="w-full" onClick={() => router.push("/scholarships")}>
        Browse Scholarships
      </Button>
    </div>
  );

  const body = expired ? (
    closed
  ) : (
    <div className="space-y-3">
      {applyUrl && (
        <Button
          className="w-full bg-[#0A66C2] hover:bg-[#004182]"
          onClick={() => window.open(applyUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Apply on funder site
        </Button>
      )}
      {applyEmail && (
        <Button
          variant={applyUrl ? "outline" : "default"}
          className="w-full"
          onClick={() => {
            window.location.href = `mailto:${applyEmail}?subject=${encodeURIComponent(
              `Application for ${job.title || "scholarship"}`
            )}`;
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          Email to apply
        </Button>
      )}
      {!applyUrl && !applyEmail && (
        <p className="text-sm text-muted-foreground">
          Follow the application instructions in the scholarship description.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Prefer the funder&apos;s own form or email. Never pay anyone to apply.{" "}
        <Link href="/scholarships" className="underline underline-offset-2">
          See all scholarships
        </Link>
        .
      </p>
    </div>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-[#0A66C2]">How to apply</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
