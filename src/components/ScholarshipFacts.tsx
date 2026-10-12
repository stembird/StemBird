import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  CalendarDays,
  GraduationCap,
  Globe,
  Layers,
  MapPin,
  Users,
  Link2,
  Shield,
  Clock,
  Landmark,
} from "lucide-react";
import {
  formatProgrammeStart,
  scholarshipCoverageLabel,
  scholarshipLevelLabel,
} from "@/lib/scholarshipFacts";

export type ScholarshipFactsJob = {
  scholarship_level?: string | null;
  scholarship_coverage?: string | null;
  scholarship_duration?: string | null;
  scholarship_nationality?: string | null;
  scholarship_age_limit?: string | null;
  scholarship_bonding?: string | null;
  scholarship_host_institution?: string | null;
  scholarship_awards_count?: number | null;
  scholarship_programme_start?: string | null;
  education_levels?: { name?: string | null } | null;
  area_of_study?: string | null;
  field_of_study?: string | null;
  specialization?: string | null;
  language_requirements?: string | null;
  additional_locations?: Array<{ city?: string; county?: string }> | null;
  salary?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_is_estimated?: boolean | null;
};

function formatAwardAmount(job: ScholarshipFactsJob): string | null {
  if (job.salary_is_estimated) return null;
  if (job.salary?.trim()) return job.salary.trim();
  const currency = job.salary_currency || "KES";
  const hasMin = job.salary_min != null && Number.isFinite(job.salary_min);
  const hasMax = job.salary_max != null && Number.isFinite(job.salary_max);
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) {
    return `${currency} ${job.salary_min!.toLocaleString("en-KE")} – ${job.salary_max!.toLocaleString("en-KE")}`;
  }
  const value = hasMin ? job.salary_min : job.salary_max;
  return `${currency} ${value!.toLocaleString("en-KE")}`;
}

export default function ScholarshipFacts({ job }: { job: ScholarshipFactsJob }) {
  const otherLocations =
    job.additional_locations && job.additional_locations.length > 0
      ? job.additional_locations
          .map((loc) => [loc.city, loc.county].filter(Boolean).join(", "))
          .filter(Boolean)
          .join("; ")
      : null;

  const items = [
    job.education_levels?.name
      ? { icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />, label: "Education level", value: job.education_levels.name }
      : null,
    scholarshipLevelLabel(job.scholarship_level)
      ? { icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />, label: "Level", value: scholarshipLevelLabel(job.scholarship_level)! }
      : null,
    job.area_of_study
      ? { icon: <Layers className="h-5 w-5 text-primary mt-0.5" />, label: "Area of study", value: job.area_of_study }
      : null,
    job.field_of_study
      ? { icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />, label: "Field of study", value: job.field_of_study }
      : null,
    job.specialization
      ? { icon: <Award className="h-5 w-5 text-primary mt-0.5" />, label: "Programme", value: job.specialization }
      : null,
    scholarshipCoverageLabel(job.scholarship_coverage)
      ? { icon: <Award className="h-5 w-5 text-primary mt-0.5" />, label: "Coverage", value: scholarshipCoverageLabel(job.scholarship_coverage)! }
      : null,
    formatAwardAmount(job)
      ? { icon: <Award className="h-5 w-5 text-primary mt-0.5" />, label: "Award amount", value: formatAwardAmount(job)! }
      : null,
    job.scholarship_duration
      ? { icon: <Clock className="h-5 w-5 text-primary mt-0.5" />, label: "Award duration", value: job.scholarship_duration }
      : null,
    formatProgrammeStart(job.scholarship_programme_start)
      ? {
          icon: <CalendarDays className="h-5 w-5 text-primary mt-0.5" />,
          label: "Programme start",
          value: formatProgrammeStart(job.scholarship_programme_start)!,
        }
      : null,
    job.scholarship_awards_count
      ? {
          icon: <Users className="h-5 w-5 text-primary mt-0.5" />,
          label: "Number of awards",
          value: String(job.scholarship_awards_count),
        }
      : null,
    job.scholarship_host_institution
      ? {
          icon: <Landmark className="h-5 w-5 text-primary mt-0.5" />,
          label: "Host institution",
          value: job.scholarship_host_institution,
        }
      : null,
    job.scholarship_nationality
      ? { icon: <Globe className="h-5 w-5 text-primary mt-0.5" />, label: "Nationality / residency", value: job.scholarship_nationality }
      : null,
    job.scholarship_age_limit
      ? { icon: <Users className="h-5 w-5 text-primary mt-0.5" />, label: "Age limit", value: job.scholarship_age_limit }
      : null,
    job.scholarship_bonding
      ? { icon: <Shield className="h-5 w-5 text-primary mt-0.5" />, label: "Bonding", value: job.scholarship_bonding }
      : null,
    job.language_requirements
      ? { icon: <Globe className="h-5 w-5 text-primary mt-0.5" />, label: "Languages", value: job.language_requirements }
      : null,
    otherLocations
      ? { icon: <MapPin className="h-5 w-5 text-primary mt-0.5" />, label: "Other locations", value: otherLocations }
      : null,
  ].filter(Boolean) as { icon: ReactNode; label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 sm:pb-4 sm:pt-5">
        <CardTitle className="flex items-center gap-2 text-lg text-[#0A66C2]">
          <Link2 className="h-5 w-5" />
          Facts
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 pb-4 pt-0 md:grid-cols-2 sm:gap-4 sm:pb-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            {item.icon}
            <div>
              <p className="text-sm font-medium" style={{ color: "#0b66c3" }}>
                {item.label}
              </p>
              <p className="font-medium">{item.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
