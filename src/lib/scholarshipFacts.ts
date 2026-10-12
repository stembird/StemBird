export const SCHOLARSHIP_LEVELS = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Masters / Postgraduate" },
  { value: "phd", label: "PhD" },
  { value: "tvet", label: "TVET / Diploma" },
  { value: "short_course", label: "Short course" },
] as const;

export type ScholarshipLevel = (typeof SCHOLARSHIP_LEVELS)[number]["value"];

export const SCHOLARSHIP_COVERAGE = [
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
  { value: "tuition", label: "Tuition" },
  { value: "stipend", label: "Stipend" },
] as const;

export type ScholarshipCoverage = (typeof SCHOLARSHIP_COVERAGE)[number]["value"];

export type ScholarshipFacts = {
  scholarship_level: ScholarshipLevel | null;
  scholarship_coverage: ScholarshipCoverage | null;
  scholarship_duration: string | null;
  scholarship_nationality: string | null;
  scholarship_age_limit: string | null;
  scholarship_bonding: string | null;
  scholarship_host_institution: string | null;
  scholarship_awards_count: number | null;
  scholarship_programme_start: string | null;
};

export const EMPTY_SCHOLARSHIP_FACTS: ScholarshipFacts = {
  scholarship_level: null,
  scholarship_coverage: null,
  scholarship_duration: null,
  scholarship_nationality: null,
  scholarship_age_limit: null,
  scholarship_bonding: null,
  scholarship_host_institution: null,
  scholarship_awards_count: null,
  scholarship_programme_start: null,
};

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function scholarshipLevelLabel(value?: string | null): string | null {
  if (!value) return null;
  return SCHOLARSHIP_LEVELS.find((item) => item.value === value)?.label ?? value;
}

export function scholarshipCoverageLabel(value?: string | null): string | null {
  if (!value) return null;
  return SCHOLARSHIP_COVERAGE.find((item) => item.value === value)?.label ?? value;
}

export function stripHtmlToText(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match;
  }
  return null;
}

function extractLevel(text: string): ScholarshipLevel | null {
  if (/\b(ph\.?d|doctor of philosophy|doctoral|tutorial fellow)\b/i.test(text)) {
    return "phd";
  }
  if (
    /\b(m\.?sc|masters?(?:\s+or\s+ph)?|postgraduate|graduate assistants?)\b/i.test(
      text
    )
  ) {
    return "postgraduate";
  }
  if (/\b(undergraduate|bachelor|b\.?sc|ba\/bsc)\b/i.test(text)) {
    return "undergraduate";
  }
  if (
    /\b(tvet|technicians?|technologists?|diploma|grade\s*\d)\b/i.test(text)
  ) {
    return "tvet";
  }
  if (
    /\b(short course|three months of intensive|partial scholarships? to kenyan youth)\b/i.test(
      text
    )
  ) {
    return "short_course";
  }
  return null;
}

function extractCoverage(text: string): ScholarshipCoverage | null {
  if (/\bpartial scholarships?\b/i.test(text)) return "partial";
  if (/\bfully funded\b|\bfull scholarships?\b/i.test(text)) return "full";
  if (
    /\bcover(?:s|age)?(?:\s+the)?(?:\s+agreed amount from the financing towards scholarships)?/i.test(
      text
    ) &&
    /\btuition fees?\b/i.test(text) &&
    /\b(research|project|assessment|stipend)\b/i.test(text)
  ) {
    return "full";
  }
  if (/\btuition fees?\b/i.test(text) || /\bcover(?:s)? tuition\b/i.test(text)) {
    return "tuition";
  }
  if (/\bstipend\b/i.test(text)) return "stipend";
  return null;
}

const WORD_MONTHS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  nine: "9",
  twelve: "12",
};

function extractDuration(text: string): string | null {
  const months = text.match(
    /\b(\d+|one|two|three|four|five|six|nine|twelve)\s*months?\b/i
  );
  if (months) {
    const raw = months[1].toLowerCase();
    const count = WORD_MONTHS[raw] || raw;
    return `${count} months`;
  }
  const years = text.match(/\b(\d+)\s*years?\s+(?:of\s+)?(?:study|duration)\b/i);
  if (years) return `${years[1]} years`;
  if (/for the duration of study|prescribed duration of study/i.test(text)) {
    return "Duration of study";
  }
  return null;
}

function extractAgeLimit(text: string): string | null {
  const between = text.match(
    /\bbetween the age(?:s)? of\s+(\d+)\s*[-–to]+\s*(\d+)/i
  );
  if (between) return `${between[1]}–${between[2]} years`;
  const under = text.match(/\bunder the age of\s+(\d+)/i);
  if (under) return `Under ${under[1]}`;
  const below = text.match(/\bbelow\s+(\d+)\s+years?\b/i);
  if (below) return `Under ${below[1]}`;
  return null;
}

function extractNationality(text: string): string | null {
  const constituency = text.match(
    /\bresident(?:s)? of\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+Constituency\b/
  );
  if (constituency) return `Residents of ${constituency[1]} Constituency`;
  if (/\ball kenyans\b|\bkenyan citizens?\b|\bopen to all kenyans\b/i.test(text)) {
    return "Kenyan citizens";
  }
  if (/\bkenyan youth\b/i.test(text)) return "Kenyan youth";
  return null;
}

function extractBonding(text: string): string | null {
  const engaged = text.match(
    /\bengaged as\s+(graduate assistants?(?:\s+or\s+tutorial fellows?)?|tutorial fellows?|technicians?(?:\s*(?:\/|and)\s*technologists?)?|technologists?)\b/i
  );
  if (engaged) {
    const role = engaged[1].replace(/\s+/g, " ").trim();
    return `Bonded as ${role}`;
  }
  if (/\bbonded\b/i.test(text)) return "Bonded";
  return null;
}

function extractHost(text: string): string | null {
  const match = firstMatch(text, [
    /\btenable at(?:\s+the)?\s+([^.;]+)/i,
    /\bstudies will be tenable at\s+([^.;]+)/i,
    /\bavailable at the\s+([^.,;]+)/i,
  ]);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim().replace(/[,;]+$/, "");
}

function extractAwardsCount(title: string, text: string): number | null {
  const fromTitle = title.match(/\b(\d+)\s+posts?\b/i);
  if (fromTitle) return Number(fromTitle[1]);
  const fromBody = text.match(/\b(\d+)\s+posts?\b/i);
  if (fromBody) return Number(fromBody[1]);
  return null;
}

function extractProgrammeStart(text: string): string | null {
  const named = text.match(
    /\bcommence in\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})\b/i
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (month) return `${named[2]}-${month}-01`;
  }
  return null;
}

export function extractScholarshipFacts(input: {
  title?: string | null;
  html?: string | null;
}): ScholarshipFacts {
  const title = (input.title || "").trim();
  const body = stripHtmlToText(input.html);
  const text = `${title} ${body}`.replace(/\s+/g, " ").trim();
  if (!text) return { ...EMPTY_SCHOLARSHIP_FACTS };

  return {
    scholarship_level: extractLevel(text),
    scholarship_coverage: extractCoverage(text),
    scholarship_duration: extractDuration(text),
    scholarship_nationality: extractNationality(text),
    scholarship_age_limit: extractAgeLimit(text),
    scholarship_bonding: extractBonding(text),
    scholarship_host_institution: extractHost(text),
    scholarship_awards_count: extractAwardsCount(title, text),
    scholarship_programme_start: extractProgrammeStart(text),
  };
}

export function mergeScholarshipFacts(
  stored: Partial<Record<keyof ScholarshipFacts, string | number | null>> | null | undefined,
  extracted: ScholarshipFacts
): ScholarshipFacts {
  return {
    scholarship_level:
      (stored?.scholarship_level as ScholarshipFacts["scholarship_level"]) ||
      extracted.scholarship_level,
    scholarship_coverage:
      (stored?.scholarship_coverage as ScholarshipFacts["scholarship_coverage"]) ||
      extracted.scholarship_coverage,
    scholarship_duration:
      (stored?.scholarship_duration as string | null) || extracted.scholarship_duration,
    scholarship_nationality:
      (stored?.scholarship_nationality as string | null) || extracted.scholarship_nationality,
    scholarship_age_limit:
      (stored?.scholarship_age_limit as string | null) || extracted.scholarship_age_limit,
    scholarship_bonding:
      (stored?.scholarship_bonding as string | null) || extracted.scholarship_bonding,
    scholarship_host_institution:
      (stored?.scholarship_host_institution as string | null) ||
      extracted.scholarship_host_institution,
    scholarship_awards_count:
      (typeof stored?.scholarship_awards_count === "number"
        ? stored.scholarship_awards_count
        : extracted.scholarship_awards_count),
    scholarship_programme_start:
      (stored?.scholarship_programme_start as string | null) ||
      extracted.scholarship_programme_start,
  };
}

export function formatProgrammeStart(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
