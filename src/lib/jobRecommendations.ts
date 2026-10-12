import { supabase } from '@/integrations/supabase/client';

export interface JobMatchScore {
  jobId: string;
  matchScore: number;
  skillsMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  salaryMatchScore: number;
  matchDetails: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceGap: number;
    locationMatch: boolean;
    salaryInRange: boolean;
  };
}

export interface CandidateProfile {
  id: string;
  location: string | null;
  years_experience: number | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  skills: Array<{ skill_name: string }>;
  preferences?: {
    preferred_job_functions: string[];
    preferred_industries: string[];
    preferred_locations: string[];
    preferred_employment_types: string[];
    min_salary: number | null;
    willing_to_relocate: boolean;
  };
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employment_type: string | null;
  experience_level: string | null;
  minimum_experience: number | null;
  salary_min: number | null;
  salary_max: number | null;
  job_function: string | null;
  industry: string | null;
  tags: any;
}

/**
 * Calculate skill match score between candidate and job
 */
function calculateSkillsMatch(
  candidateSkills: string[],
  jobDescription: string,
  jobTags: any
): { score: number; matched: string[]; missing: string[] } {
  if (candidateSkills.length === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const jobText = jobDescription.toLowerCase();
  const jobSkills = Array.isArray(jobTags?.skills) ? jobTags.skills : [];
  
  const matched: string[] = [];
  const missing: string[] = [];

  // Check each candidate skill
  candidateSkills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    if (jobText.includes(skillLower) || jobSkills.some((js: string) => js.toLowerCase().includes(skillLower))) {
      matched.push(skill);
    }
  });

  // Check for job skills not in candidate profile
  jobSkills.forEach((skill: string) => {
    if (!candidateSkills.some(cs => cs.toLowerCase() === skill.toLowerCase())) {
      missing.push(skill);
    }
  });

  // Score: percentage of candidate skills that match
  const score = candidateSkills.length > 0 
    ? (matched.length / candidateSkills.length) * 100 
    : 0;

  return { score, matched, missing };
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatch(
  candidateYears: number | null,
  jobMinExperience: number | null,
  jobExperienceLevel: string | null
): { score: number; gap: number } {
  if (!candidateYears) {
    return { score: 50, gap: 0 }; // Neutral score if no data
  }

  if (!jobMinExperience && !jobExperienceLevel) {
    return { score: 100, gap: 0 }; // Perfect match if no requirements
  }

  const minRequired = jobMinExperience || 0;
  const gap = minRequired - candidateYears;

  if (gap <= 0) {
    // Candidate meets or exceeds requirements
    return { score: 100, gap };
  } else if (gap <= 1) {
    // Close match (within 1 year)
    return { score: 80, gap };
  } else if (gap <= 2) {
    // Reasonable match (within 2 years)
    return { score: 60, gap };
  } else {
    // Significant gap
    return { score: Math.max(0, 40 - (gap * 10)), gap };
  }
}

/**
 * Calculate location match score
 */
function calculateLocationMatch(
  candidateLocation: string | null,
  candidateWillingToRelocate: boolean | undefined,
  jobLocation: string,
  preferredLocations: string[] = []
): { score: number; match: boolean } {
  if (!candidateLocation) {
    return { score: 50, match: false }; // Neutral if no location set
  }

  const candidateLoc = candidateLocation.toLowerCase();
  const jobLoc = jobLocation.toLowerCase();

  // Check for remote work
  if (jobLoc.includes('remote') || jobLoc.includes('anywhere')) {
    return { score: 100, match: true };
  }

  // Exact match
  if (candidateLoc === jobLoc || jobLoc.includes(candidateLoc) || candidateLoc.includes(jobLoc)) {
    return { score: 100, match: true };
  }

  // Check preferred locations
  if (preferredLocations.length > 0) {
    const matchesPreferred = preferredLocations.some(
      loc => jobLoc.includes(loc.toLowerCase())
    );
    if (matchesPreferred) {
      return { score: 90, match: true };
    }
  }

  // Willing to relocate
  if (candidateWillingToRelocate) {
    return { score: 70, match: true };
  }

  // No match
  return { score: 20, match: false };
}

/**
 * Calculate salary match score
 */
function calculateSalaryMatch(
  candidateMin: number | null,
  candidateMax: number | null,
  jobMin: number | null,
  jobMax: number | null
): { score: number; inRange: boolean } {
  // If no salary data, neutral score
  if (!candidateMin && !jobMin) {
    return { score: 50, inRange: false };
  }

  // If job has no salary info but candidate has expectations
  if (!jobMin && !jobMax && candidateMin) {
    return { score: 30, inRange: false };
  }

  // If candidate has no expectations
  if (!candidateMin && !candidateMax) {
    return { score: 100, inRange: true };
  }

  const candMin = candidateMin || 0;
  const candMax = candidateMax || candMin * 1.5;
  const jMin = jobMin || 0;
  const jMax = jobMax || jMin * 1.5;

  // Perfect overlap
  if (jMax >= candMin && jMin <= candMax) {
    const overlapSize = Math.min(jMax, candMax) - Math.max(jMin, candMin);
    const candidateRange = candMax - candMin;
    const overlapPercentage = candidateRange > 0 ? (overlapSize / candidateRange) * 100 : 100;
    return { score: Math.min(100, overlapPercentage), inRange: true };
  }

  // Job salary below expectations
  if (jMax < candMin) {
    const gap = candMin - jMax;
    const gapPercentage = (gap / candMin) * 100;
    return { score: Math.max(0, 50 - gapPercentage), inRange: false };
  }

  // Job salary above expectations (good for candidate)
  if (jMin > candMax) {
    return { score: 100, inRange: true };
  }

  return { score: 50, inRange: false };
}

/**
 * Calculate overall job match score
 */
export function calculateJobMatch(
  candidate: CandidateProfile,
  job: Job
): JobMatchScore {
  const candidateSkills = candidate.skills.map(s => s.skill_name);
  
  // Calculate individual scores
  const skillsMatch = calculateSkillsMatch(candidateSkills, job.description, job.tags);
  const experienceMatch = calculateExperienceMatch(
    candidate.years_experience,
    job.minimum_experience,
    job.experience_level
  );
  const locationMatch = calculateLocationMatch(
    candidate.location,
    candidate.preferences?.willing_to_relocate,
    job.location,
    candidate.preferences?.preferred_locations
  );
  const salaryMatch = calculateSalaryMatch(
    candidate.expected_salary_min,
    candidate.expected_salary_max,
    job.salary_min,
    job.salary_max
  );

  // Weighted average (skills are most important)
  const weights = {
    skills: 0.40,
    experience: 0.25,
    location: 0.20,
    salary: 0.15
  };

  const matchScore = 
    skillsMatch.score * weights.skills +
    experienceMatch.score * weights.experience +
    locationMatch.score * weights.location +
    salaryMatch.score * weights.salary;

  return {
    jobId: job.id,
    matchScore: Math.round(matchScore * 100) / 100,
    skillsMatchScore: Math.round(skillsMatch.score * 100) / 100,
    experienceMatchScore: Math.round(experienceMatch.score * 100) / 100,
    locationMatchScore: Math.round(locationMatch.score * 100) / 100,
    salaryMatchScore: Math.round(salaryMatch.score * 100) / 100,
    matchDetails: {
      matchedSkills: skillsMatch.matched,
      missingSkills: skillsMatch.missing.slice(0, 5), // Limit to top 5
      experienceGap: experienceMatch.gap,
      locationMatch: locationMatch.match,
      salaryInRange: salaryMatch.inRange
    }
  };
}

/**
 * Get job recommendations for a user
 */
export async function getJobRecommendations(
  userId: string,
  limit: number = 10,
  minScore: number = 50
): Promise<JobMatchScore[]> {
  // Get candidate profile with skills and preferences
  const { data: profile } = await supabase
    .from('candidate_profiles')
    .select(`
      *,
      skills:candidate_skills(skill_name),
      preferences:candidate_preferences(*)
    `)
    .eq('user_id', userId)
    .single();

  if (!profile) {
    return [];
  }

  // Extract preferences - it comes as an array from the query
  const preferencesData = Array.isArray(profile.preferences) && profile.preferences.length > 0
    ? profile.preferences[0]
    : null;

  const candidateProfile: CandidateProfile = {
    id: profile.id,
    location: profile.location,
    years_experience: profile.years_experience,
    expected_salary_min: profile.expected_salary_min,
    expected_salary_max: profile.expected_salary_max,
    skills: profile.skills || [],
    preferences: preferencesData ? {
      preferred_job_functions: preferencesData.preferred_job_functions || [],
      preferred_industries: preferencesData.preferred_industries || [],
      preferred_locations: preferencesData.preferred_locations || [],
      preferred_employment_types: preferencesData.preferred_employment_types || [],
      min_salary: preferencesData.min_salary,
      willing_to_relocate: preferencesData.willing_to_relocate || false
    } : undefined
  };

  // Get active jobs (not applied to)
  const { data: appliedJobIds } = await supabase
    .from('job_applications')
    .select('job_id')
    .eq('user_id', userId);

  const appliedIds = appliedJobIds?.map(a => a.job_id) || [];

  let jobsQuery = supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .eq('listing_kind', 'job')
    .order('created_at', { ascending: false })
    .limit(100); // Get more jobs to filter

  if (appliedIds.length > 0) {
    jobsQuery = jobsQuery.not('id', 'in', `(${appliedIds.join(',')})`);
  }

  const { data: jobs } = await jobsQuery;

  if (!jobs || jobs.length === 0) {
    return [];
  }

  // Calculate match scores
  const matches = jobs
    .map(job => calculateJobMatch(candidateProfile, job as Job))
    .filter(match => match.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return matches;
}

/**
 * Save recommendations to database
 */
export async function saveRecommendations(
  userId: string,
  recommendations: JobMatchScore[]
): Promise<void> {
  const records = recommendations.map(rec => ({
    user_id: userId,
    job_id: rec.jobId,
    match_score: rec.matchScore,
    skills_match_score: rec.skillsMatchScore,
    experience_match_score: rec.experienceMatchScore,
    location_match_score: rec.locationMatchScore,
    salary_match_score: rec.salaryMatchScore,
    match_details: rec.matchDetails
  }));

  await supabase
    .from('job_recommendations')
    .upsert(records, { onConflict: 'user_id,job_id' });
}

/**
 * Get saved recommendations from database
 */
export async function getSavedRecommendations(
  userId: string,
  includeViewed: boolean = false
): Promise<any[]> {
  let query = supabase
    .from('job_recommendations')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('user_id', userId)
    .eq('dismissed', false)
    .gt('expires_at', new Date().toISOString())
    .order('match_score', { ascending: false });

  if (!includeViewed) {
    query = query.eq('viewed', false);
  }

  const { data } = await query;
  return data || [];
}
