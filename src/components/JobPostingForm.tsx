"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Info, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "@/components/RichTextEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  fuzzyMatchOption,
  matchToAllowedOptions,
  limitTags,
  dedupeStrings,
  resolveValidThrough,
} from "@/lib/jobParseNormalization";
import { companiesShareIdentity } from "@/lib/companyIdentity";
interface JobFormData {
  // Core fields
  title: string;
  company: string;
  description: string;
  responsibilities: string;
  required_qualifications: string;
  company_id: string;
  // Google Job Posting Fields
  valid_through: string;
  employment_type: string;
  employment_types: string[];
  job_location_type: string;
  job_location_types: string[];
  job_location_country: string;
  job_location_county: string;
  job_location_city: string;
  additional_locations: Array<{ county: string; city: string }>;
  direct_apply: boolean;
  application_url: string;
  // STEM/Health/Architecture Fields
  industry: string;
  industries: string[];
  education_level_id: string;
  area_of_study: string;
  field_of_study: string;
  education_requirements: string;
  experience_level: string;
  language_requirements: string;
  // New fields
  salary_visibility: string;
  minimum_experience: string;
  is_featured: boolean;
  salary_type: string;
  // Compensation & Schedule
  salary_currency: string;
  salary_min: string;
  salary_max: string;
  salary_period: string;
  work_schedule: string;
  // Application
  apply_link: string;
  apply_email: string;
  // Functional Portal Fields
  tags: string;
  job_function: string;
  job_functions: string[];
  status: string;
  additional_info: string;
}

interface JobPostingFormProps {
  jobId?: string;
  isEdit?: boolean;
  initialData?: Partial<JobFormData>;
  isParsedData?: boolean;
}

const JobPostingForm = ({ jobId, isEdit = false, initialData, isParsedData = false }: JobPostingFormProps) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const getInitialFormData = (): JobFormData => {
    const defaults: JobFormData = {
      // Core fields
      title: "",
      company: "",
      description: "",
      responsibilities: "",
      required_qualifications: "",
      company_id: "",
      // Google Job Posting Fields
      valid_through: "",
      employment_type: "FULL_TIME",
      employment_types: ["FULL_TIME"],
      job_location_type: "ON_SITE",
      job_location_types: ["ON_SITE"],
      job_location_country: "Kenya",
      job_location_county: "",
      job_location_city: "",
      additional_locations: [],
      direct_apply: true,
      application_url: "",
      // STEM/Health/Architecture Fields
      industry: "",
      industries: [],
      education_level_id: "none",
      area_of_study: "",
      field_of_study: "",
      education_requirements: "",
      experience_level: "Mid",
      language_requirements: "",
      // New fields
      salary_visibility: "Show",
      minimum_experience: "",
      is_featured: false,
      salary_type: "Monthly",
      // Compensation & Schedule
      salary_currency: "KES",
      salary_min: "",
      salary_max: "",
      salary_period: "MONTH",
      work_schedule: "",
      // Application
      apply_link: "",
      apply_email: "",
      // Functional Portal Fields
      tags: "",
      job_function: "",
      job_functions: [],
      status: "active",
      additional_info: "",
    };

    // Merge with initialData if provided
    if (initialData) {
      // Strip status fields from parsed AI data so publish is always the default after parsing
      const {
        status: _parsedStatus,
        job_status: _parsedJobStatus,
        direct_apply: _parsedDirectApply,
        education_requirements: _parsedEducationRequirements,
        ...parsedFields
      } = initialData as Partial<JobFormData> & { status?: string; job_status?: string };
      const merged = { ...defaults, ...parsedFields };
      // Convert parsed arrays if present
      if (initialData.employment_types && Array.isArray(initialData.employment_types) && initialData.employment_types.length > 0) {
        merged.employment_types = initialData.employment_types;
        merged.employment_type = initialData.employment_types[0];
      } else if (initialData.employment_type) {
        merged.employment_types = [initialData.employment_type];
      }
      if (initialData.job_location_types && Array.isArray(initialData.job_location_types) && initialData.job_location_types.length > 0) {
        merged.job_location_types = initialData.job_location_types;
        merged.job_location_type = initialData.job_location_types[0];
      } else if (initialData.job_location_type) {
        merged.job_location_types = [initialData.job_location_type];
      }
      // Merge parsed industries array
      if ((initialData as any).industries && Array.isArray((initialData as any).industries) && (initialData as any).industries.length > 0) {
        merged.industries = (initialData as any).industries;
        merged.industry = (initialData as any).industries[0];
      } else if (initialData.industry) {
        merged.industries = [initialData.industry];
      }
      // Merge parsed job_functions array
      if ((initialData as any).job_functions && Array.isArray((initialData as any).job_functions) && (initialData as any).job_functions.length > 0) {
        merged.job_functions = (initialData as any).job_functions;
        merged.job_function = (initialData as any).job_functions[0];
      } else if (initialData.job_function) {
        merged.job_functions = [initialData.job_function];
      }
      // If we're going to create a company, clear company_id to avoid conflicts
      if (isParsedData && initialData.company && !initialData.company_id) {
        merged.company_id = "";
      }
      if (isParsedData) {
        merged.status = "active";
        merged.direct_apply = false;
        merged.education_requirements = "";
        if (merged.industries?.length) {
          merged.industries = dedupeStrings(merged.industries);
          merged.industry = merged.industries[0] || "";
        }
        if (merged.job_functions?.length) {
          merged.job_functions = dedupeStrings(merged.job_functions);
          merged.job_function = merged.job_functions[0] || "";
        }
        if (merged.tags) {
          merged.tags = limitTags(merged.tags);
        }
        merged.valid_through = resolveValidThrough(merged.valid_through);
      }
      return merged;
    }

    return defaults;
  };

  const [formData, setFormData] = useState<JobFormData>(getInitialFormData());

  // Ensure parsed jobs default to publish with direct apply unchecked and a valid expiry date
  useLayoutEffect(() => {
    if (!isParsedData) return;
    setFormData((prev) => {
      const updates: Partial<JobFormData> = {};
      if (prev.status !== "active") updates.status = "active";
      if (prev.direct_apply) updates.direct_apply = false;
      if (!prev.valid_through?.trim()) updates.valid_through = resolveValidThrough(prev.valid_through);
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [isParsedData, initialData?.title, initialData?.company]);

  const [selectedCountyId, setSelectedCountyId] = useState<string>("");
  const [selectedTownId, setSelectedTownId] = useState<string>("");
  
  // State for automatic company creation
  // If parsed data has company name but no company_id, auto-enable company creation
  const [shouldCreateCompany, setShouldCreateCompany] = useState(
    isParsedData && initialData?.company && !initialData?.company_id
  );
  const [newCompanyName, setNewCompanyName] = useState(
    isParsedData && initialData?.company && !initialData?.company_id ? initialData.company : ""
  );
  
  // Check if company already exists (exact or identity variant, for UI feedback)
  const { data: existingCompanyCheck } = useQuery({
    queryKey: ["check-company", newCompanyName],
    queryFn: async () => {
      if (!newCompanyName || !shouldCreateCompany) return null;
      const trimmed = newCompanyName.trim();
      const { data: exact } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", trimmed)
        .limit(5);
      const exactMatch = exact?.find(
        (row) => row.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch) return exactMatch;

      const token = trimmed.split(/\s+/).find((part) => part.length >= 3) || trimmed;
      const { data: candidates } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${token}%`)
        .limit(50);
      return (
        candidates?.find((row) => companiesShareIdentity(row.name, trimmed)) ||
        null
      );
    },
    enabled: !!newCompanyName && shouldCreateCompany,
  });

  const { data: industries } = useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: educationLevels } = useQuery({
    queryKey: ["education_levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education_levels")
        .select("id, name")
        .order("id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: jobFunctions } = useQuery({
    queryKey: ["job_functions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_functions")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: counties } = useQuery({
    queryKey: ["counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counties")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: towns } = useQuery({
    queryKey: ["towns", selectedCountyId],
    queryFn: async () => {
      if (!selectedCountyId) return [];
      const { data, error } = await supabase
        .from("towns")
        .select("id, name, county_id")
        .eq("county_id", Number(selectedCountyId))
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCountyId,
  });

  // Keep form location fields in sync with selected county/town
  const countyName = counties?.find(c => String(c.id) === selectedCountyId)?.name || "";
  const townName = towns?.find(t => String(t.id) === selectedTownId)?.name || "";
  
  // Update form data when county/town selection changes (derived state)
  useEffect(() => {
    setFormData(prev => {
      const needsUpdate = prev.job_location_county !== countyName || prev.job_location_city !== townName;
      if (!needsUpdate) return prev;
      
      return {
        ...prev,
        job_location_county: countyName,
        job_location_city: townName
      };
    });
  }, [countyName, townName]);

  // Helper: fuzzy-match a parsed name against a list of DB options
  const fuzzyMatch = fuzzyMatchOption;

  // Auto-match parsed text values to DB dropdown options
  const hasAutoMatchedRef = useRef(false);
  useEffect(() => {
    if (!isParsedData || hasAutoMatchedRef.current) return;
    if (!counties || counties.length === 0) return;

    let cancelled = false;

    const run = async () => {
      let updated = false;
      const updates: Partial<JobFormData> = {};

      // 1. Auto-select county dropdown (with town-to-county fallback)
      if (formData.job_location_county && !selectedCountyId) {
        const matchedCounty = fuzzyMatch(formData.job_location_county, counties.map(c => c.name));
        if (matchedCounty) {
          const countyObj = counties.find(c => c.name === matchedCounty);
          if (countyObj && !cancelled) {
            setSelectedCountyId(String(countyObj.id));
            updates.job_location_county = matchedCounty;
            updated = true;
          }
        } else {
          // Fallback: parsed value might be a town name — look it up in towns table
          try {
            const parsedLoc = formData.job_location_county.toLowerCase().trim();
            const { data: matchedTowns } = await supabase
              .from("towns")
              .select("id, name, county_id")
              .ilike("name", `%${parsedLoc}%`)
              .limit(5);

            if (!cancelled && matchedTowns && matchedTowns.length > 0) {
              const exactTown = matchedTowns.find(t => t.name.toLowerCase().trim() === parsedLoc);
              const bestTown = exactTown || matchedTowns[0];
              if (bestTown) {
                const countyObj = counties.find(c => c.id === bestTown.county_id);
                if (countyObj) {
                  setSelectedCountyId(String(countyObj.id));
                  updates.job_location_county = countyObj.name;
                  updates.job_location_city = bestTown.name;
                  updated = true;
                }
              }
            }
          } catch (err) {
            console.warn("Town lookup failed:", err);
          }
        }
      }

      // 2. Auto-match industries (array) — only keep valid dropdown options
      if (formData.industries && formData.industries.length > 0 && industries && industries.length > 0) {
        const matchedIndustries = matchToAllowedOptions(
          dedupeStrings(formData.industries),
          industries.map((i) => i.name)
        );
        if (matchedIndustries.length > 0) {
          updates.industries = matchedIndustries;
          updates.industry = matchedIndustries[0];
          updated = true;
        } else {
          updates.industries = [];
          updates.industry = "";
          updated = true;
        }
      } else if (formData.industry && industries && industries.length > 0) {
        const matchedIndustries = matchToAllowedOptions([formData.industry], industries.map((i) => i.name));
        if (matchedIndustries.length > 0) {
          updates.industries = matchedIndustries;
          updates.industry = matchedIndustries[0];
          updated = true;
        } else {
          updates.industries = [];
          updates.industry = "";
          updated = true;
        }
      }

      // 3. Auto-match job functions (array) — only keep valid dropdown options
      if (formData.job_functions && formData.job_functions.length > 0 && jobFunctions && jobFunctions.length > 0) {
        const matchedFuncs = matchToAllowedOptions(
          dedupeStrings(formData.job_functions),
          jobFunctions.map((f) => f.name)
        );
        if (matchedFuncs.length > 0) {
          updates.job_functions = matchedFuncs;
          updates.job_function = matchedFuncs[0];
          updated = true;
        } else {
          updates.job_functions = [];
          updates.job_function = "";
          updated = true;
        }
      } else if (formData.job_function && jobFunctions && jobFunctions.length > 0) {
        const matchedFuncs = matchToAllowedOptions([formData.job_function], jobFunctions.map((f) => f.name));
        if (matchedFuncs.length > 0) {
          updates.job_functions = matchedFuncs;
          updates.job_function = matchedFuncs[0];
          updated = true;
        } else {
          updates.job_functions = [];
          updates.job_function = "";
          updated = true;
        }
      }

      // 4. Auto-match education level
      if (formData.education_level_id === "none" && educationLevels && educationLevels.length > 0) {
        const parsedEdu = (initialData as any)?.education_level_name;
        if (parsedEdu) {
          const matchedEdu = fuzzyMatch(parsedEdu, educationLevels.map(e => e.name));
          if (matchedEdu) {
            const eduObj = educationLevels.find(e => e.name === matchedEdu);
            if (eduObj) {
              updates.education_level_id = String(eduObj.id);
              updated = true;
            }
          }
        }
      }

      if (!cancelled) {
        if (updated) {
          setFormData(prev => ({ ...prev, ...updates }));
        }
        hasAutoMatchedRef.current = true;
      }
    };

    run();
    return () => { cancelled = true; };
  }, [isParsedData, counties, industries, jobFunctions, educationLevels, formData.job_location_county, formData.industries, formData.industry, formData.job_functions, formData.job_function, formData.education_level_id]);

  // Auto-select town dropdown once county is selected and towns are loaded
  const hasAutoMatchedTownRef = useRef(false);
  useEffect(() => {
    if (!isParsedData || hasAutoMatchedTownRef.current) return;
    if (!selectedCountyId || !towns || towns.length === 0) return;
    if (formData.job_location_city) {
      const matchedTown = fuzzyMatch(formData.job_location_city, towns.map(t => t.name));
      if (matchedTown) {
        const townObj = towns.find(t => t.name === matchedTown);
        if (townObj) {
          setSelectedTownId(String(townObj.id));
          setFormData(prev => ({ ...prev, job_location_city: matchedTown }));
        }
      }
    }
    hasAutoMatchedTownRef.current = true;
  }, [isParsedData, selectedCountyId, towns, formData.job_location_city]);

  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user || role === "admin") return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && role === "employer",
  });

  const { data: allCompanies } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (error) {
        if (error.code === '409') {
          console.error("Conflict error fetching companies:", error);
          return [];
        }
        throw error;
      }
      return data;
    },
    enabled: role === "admin",
    retry: false,
  });

  // Add query to fetch job data when editing
  const { data: existingJob, isLoading: isJobLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  // Populate form with existing job data when loaded
  const hasLoadedJobRef = useRef(false);
  
  useEffect(() => {
    if (!jobId || isParsedData) return;
    if (existingJob && !isJobLoading && !hasLoadedJobRef.current) {
      hasLoadedJobRef.current = true;
      
      // Build form data from existing job
      const newFormData = {
        // Core fields
        title: existingJob.title || "",
        company: existingJob.company || "",
        description: existingJob.description || "",
        responsibilities: existingJob.responsibilities || "",
        required_qualifications: existingJob.required_qualifications?.toString() || "",
        company_id: existingJob.company_id ? String(existingJob.company_id) : "",
        
        // Google Job Posting Fields
        valid_through: existingJob.valid_through || "",
        employment_type: existingJob.employment_type || "FULL_TIME",
        employment_types: (existingJob as any).employment_types?.length > 0
          ? (existingJob as any).employment_types
          : [existingJob.employment_type || "FULL_TIME"],
        job_location_type: existingJob.job_location_type || "ON_SITE",
        job_location_types: (existingJob as any).job_location_types?.length > 0
          ? (existingJob as any).job_location_types
          : [existingJob.job_location_type || "ON_SITE"],
        job_location_country: existingJob.job_location_country || "Kenya",
        job_location_county: existingJob.job_location_county || "",
        job_location_city: existingJob.job_location_city || "",
        additional_locations: (existingJob as any).additional_locations || [],
        direct_apply: existingJob.direct_apply ?? true,
        application_url: existingJob.application_url || "",
        
        // STEM/Health/Architecture Fields
        industry: existingJob.industry || "",
        industries: (existingJob as any).industries?.length > 0
          ? (existingJob as any).industries
          : existingJob.industry ? [existingJob.industry] : [],
        education_level_id: existingJob.education_level_id ? String(existingJob.education_level_id) : "none",
        area_of_study: (existingJob as any).area_of_study || "",
        field_of_study: (existingJob as any).field_of_study || "",
        education_requirements: (existingJob as any).education_requirements || "",
        experience_level: existingJob.experience_level || "Mid",
        language_requirements: existingJob.language_requirements || "",
        
        // New fields
        salary_visibility: existingJob.salary_visibility || "Show",
        minimum_experience: existingJob.minimum_experience?.toString() || "",
        is_featured: existingJob.is_featured ?? false,
        salary_type: existingJob.salary_type || "Monthly",
        
        // Compensation & Schedule
        salary_currency: existingJob.salary_currency || "KES",
        salary_min: existingJob.salary_min?.toString() || "",
        salary_max: existingJob.salary_max?.toString() || "",
        salary_period: existingJob.salary_period || "MONTH",
        work_schedule: existingJob.work_schedule || "",
        
        // Application
        apply_link: existingJob.apply_link || "",
        apply_email: existingJob.apply_email || "",
        
        // Functional Portal Fields
        tags: existingJob.tags?.toString() || "",
        job_function: existingJob.job_function || "",
        job_functions: (existingJob as any).job_functions?.length > 0
          ? (existingJob as any).job_functions
          : existingJob.job_function ? [existingJob.job_function] : [],
        status: existingJob.status || "active",
        additional_info: existingJob.additional_info?.toString() || "",
      };
      
      setFormData(newFormData);
      
      // Set county and town IDs if available
      if (existingJob.job_location_county && counties) {
        const county = counties.find(c => c.name === existingJob.job_location_county);
        if (county) {
          setSelectedCountyId(String(county.id));
        }
      }
      
      if (existingJob.job_location_city && towns) {
        const town = towns.find(townItem => townItem.name === existingJob.job_location_city);
        if (town) {
          setSelectedTownId(String(town.id));
        }
      }
      
      // Reset company creation state when loading existing job
      if (existingJob.company_id) {
        setShouldCreateCompany(false);
        setNewCompanyName("");
      }
    }
  }, [jobId, isParsedData, existingJob, counties, towns, isJobLoading]);

  const mutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      if (!user) throw new Error("Not authenticated");

      // Determine the company name to use
      const companyName =
        role === "employer" && userCompany?.name
          ? userCompany.name
          : shouldCreateCompany && role === "admin"
            ? newCompanyName
            : data.company;

      // Convert empty string to null for proper database handling
      let companyId = data.company_id && data.company_id !== "" ? data.company_id : null;
      // Employer posts must attach to their company profile
      if (role === "employer" && userCompany?.id) {
        companyId = userCompany.id;
      }

      let hiringOrganizationLogo: string | null = userCompany?.logo ?? null;
      let hiringOrganizationUrl: string | null = userCompany?.website ?? null;

      // Ensure company exists and logo is reused or fetched+stored immediately
      // (scraped / manual / parsed / employer all share this path for reuse).
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const ensureRes = await fetch("/api/companies/ensure-for-job", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            name: companyName,
            companyId,
            website: userCompany?.website ?? null,
            logo: userCompany?.logo ?? null,
            // Company industry comes from the employer profile / inference — not the job's industry
            industry: userCompany?.industry ?? null,
          }),
        });
        if (ensureRes.ok) {
          const ensured = await ensureRes.json();
          if (ensured.companyId) {
            if (shouldCreateCompany && role === "admin" && companyId !== ensured.companyId) {
              toast.success(`Company "${companyName}" ready`);
            }
            companyId = ensured.companyId;
          }
          if (ensured.logo) hiringOrganizationLogo = ensured.logo;
          if (ensured.website) hiringOrganizationUrl = ensured.website;
          queryClient.invalidateQueries({ queryKey: ["all-companies"] });
        } else {
          console.warn("ensure-for-job failed:", await ensureRes.text());
        }
      } catch (ensureErr) {
        console.warn("ensure-for-job error:", ensureErr);
      }

      console.log("Final company values:", {
        companyName,
        companyId,
        shouldCreateCompany,
        newCompanyName,
        originalCompanyId: data.company_id,
        hiringOrganizationLogo,
      });

      // Resolve industry names to UUIDs (allowed options only)
      const allowedIndustryNames = industries?.map((i: any) => i.name) || [];
      const normalizedIndustries = matchToAllowedOptions(
        dedupeStrings(data.industries && data.industries.length > 0 ? data.industries : data.industry ? [data.industry] : []),
        allowedIndustryNames
      );
      const industryIds = normalizedIndustries
        .map((name: string) => industries?.find((i: any) => i.name === name)?.id || null)
        .filter(Boolean);

      // Resolve job function names to UUIDs (allowed options only)
      const allowedFunctionNames = jobFunctions?.map((f: any) => f.name) || [];
      const normalizedJobFunctions = matchToAllowedOptions(
        dedupeStrings(data.job_functions && data.job_functions.length > 0 ? data.job_functions : data.job_function ? [data.job_function] : []),
        allowedFunctionNames
      );
      const jobFunctionIds = normalizedJobFunctions
        .map((name: string) => jobFunctions?.find((f: any) => f.name === name)?.id || null)
        .filter(Boolean);

      const jobData: any = {
        // Core fields
        title: data.title,
        company: companyName,
        description: data.description,
        user_id: user.id,
        company_id: companyId,
        posted_by: role === "admin" ? "admin" : "employer",
        status: data.status,

        // Google Job Posting Fields
        valid_through: jobId
          ? (data.valid_through?.trim() || null)
          : resolveValidThrough(data.valid_through),
        employment_type: data.employment_type,
        employment_types: data.employment_types && data.employment_types.length > 0 ? data.employment_types : [data.employment_type],
        hiring_organization_name: companyName,
        hiring_organization_logo: hiringOrganizationLogo,
        hiring_organization_url: hiringOrganizationUrl,
        job_location_type: data.job_location_type,
        job_location_types: data.job_location_types && data.job_location_types.length > 0 ? data.job_location_types : [data.job_location_type],
        job_location_country: data.job_location_country,
        job_location_county: data.job_location_county || null,
        job_location_city: data.job_location_city || null,
        location: `${data.job_location_city || ''}${data.job_location_county ? ', ' + data.job_location_county : ''}${data.job_location_country ? ', ' + data.job_location_country : ''}`.trim().replace(/^,\s*/, ''),
        direct_apply: data.direct_apply,
        application_url: data.application_url || null,

        // STEM/Health/Architecture Fields
        industry: normalizedIndustries[0] || null,
        industries: normalizedIndustries.length > 0 ? normalizedIndustries : null,
        industry_ids: industryIds.length > 0 ? industryIds : null,
        required_qualifications: data.required_qualifications || null,
        education_level_id: data.education_level_id && data.education_level_id !== "none" ? parseInt(data.education_level_id) : null,
        area_of_study: data.area_of_study || null,
        field_of_study: data.field_of_study || null,
        education_requirements: null,
        experience_level: data.experience_level || null,
        language_requirements: data.language_requirements || null,

        // New fields
        responsibilities: data.responsibilities || null,
        salary_visibility: data.salary_visibility || "Show",
        minimum_experience: data.minimum_experience ? parseInt(data.minimum_experience) : null,
        is_featured: data.is_featured,
        salary_type: data.salary_type || null,

        // Compensation & Schedule
        salary_currency: data.salary_currency,
        salary_min: data.salary_min ? parseInt(data.salary_min) : null,
        salary_max: data.salary_max ? parseInt(data.salary_max) : null,
        salary_period: data.salary_period,
        salary: data.salary_min && data.salary_max ? `${data.salary_currency} ${data.salary_min} - ${data.salary_max}/${data.salary_period.toLowerCase()}` : null,
        work_schedule: data.work_schedule || null,

        // Application
        apply_link: data.apply_link || null,
        apply_email: data.apply_email || null,

        // Functional Portal Fields
        tags: limitTags(data.tags) || null,
        job_function: normalizedJobFunctions[0] || null,
        job_functions: normalizedJobFunctions.length > 0 ? normalizedJobFunctions : null,
        job_function_ids: jobFunctionIds.length > 0 ? jobFunctionIds : null,
        additional_info: data.additional_info || null,

        // Multi-location support
        additional_locations: data.additional_locations && data.additional_locations.length > 0
          ? data.additional_locations.filter(loc => loc.county || loc.city)
          : null,
      };

      let savedJobId = jobId || null;

      if (!jobId) {
        // Google JobPosting requires datePosted. Set it on create so the DB
        // default is never skipped by a later explicit-null insert path.
        jobData.date_posted = new Date().toISOString();
      }

      if (jobId) {
        // Update existing job
        const { error } = await supabase
          .from("jobs")
          .update(jobData)
          .eq("id", jobId);
        
        if (error) {
          if (error.code === '409') {
            throw new Error("Conflict: The job could not be updated due to a database constraint. Please check that all referenced companies and data are valid.");
          }
          if (error.code === '23503') {
            throw new Error("Invalid company reference. Please select a valid company or create a new one.");
          }
          console.error("Job update error:", error);
          throw error;
        }
        savedJobId = jobId;
      } else {
        // Create new job
        console.log("Creating job with data:", {
          ...jobData,
          description: jobData.description?.substring(0, 50) + "...",
          company_id: jobData.company_id,
          company: jobData.company
        });
        
        const { data: inserted, error } = await supabase
          .from("jobs")
          .insert([jobData])
          .select("id")
          .single();
        
        if (error) {
          console.error("Job creation error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            company_id: jobData.company_id
          });
          
          if (error.code === '409') {
            throw new Error("Conflict: The job could not be created due to a database constraint. Please check that all data is valid.");
          }
          if (error.code === '23503') {
            throw new Error(`Invalid company reference. Company ID: ${jobData.company_id}. Please select a valid company or create a new one. Error: ${error.message}`);
          }
          console.error("Job creation error:", error);
          throw error;
        }
        savedJobId = inserted?.id || null;
      }

      // Universal AI normalize/enrich on production keys (any intake → CareerSasa fields).
      // Save already succeeded — enrich errors must not fail the mutation.
      let enriched = false;
      if (savedJobId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (accessToken) {
            const enrichRes = await fetch("/api/jobs/enrich", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ job_id: savedJobId, force: true }),
            });
            enriched = enrichRes.ok;
            if (!enrichRes.ok) {
              console.warn("[JobPostingForm] enrich failed", await enrichRes.text());
            }
          }
        } catch (enrichErr) {
          console.warn("[JobPostingForm] enrich error", enrichErr);
        }
      }

      return { jobId: savedJobId, enriched };
    },
    onSuccess: async (result) => {
      const isDraft = formData.status === "draft";
      const message = jobId 
        ? "Job updated successfully!" 
        : isDraft 
          ? "Job saved as draft! You can publish it later from your dashboard." 
          : "Job published successfully!";
      toast.success(message);
      if (result?.enriched) {
        toast.message("AI enrichment applied — taxonomy and sections refreshed.");
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all-companies"] });
      queryClient.invalidateQueries({ queryKey: ["relatedJobs"] });
    },
    onError: (error: any) => {
      console.error("Job operation error:", error);
      
      let errorMessage = jobId ? "Failed to update job." : "Failed to post job.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
      
      if (error?.code) {
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyName = shouldCreateCompany && role === "admin" ? newCompanyName : formData.company;
    
    if (!formData.title || !companyName || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (role === "employer" && !userCompany) {
      toast.error("Please create a company profile first from your dashboard");
      return;
    }
    
    // Check that at least one application method is provided
    const hasApplicationMethod = formData.direct_apply || formData.application_url || formData.apply_email || formData.apply_link;
    if (!hasApplicationMethod) {
      toast.error("Please provide at least one application method (enable direct apply, or add an external URL/email/link)");
      return;
    }
    
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  if (jobId && isJobLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isParsedData && (
        <Alert className="bg-primary/10 border-primary">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>AI-Parsed Data:</strong> This form has been pre-filled with AI-extracted information. Please review all fields carefully before saving.
            {shouldCreateCompany && newCompanyName && (
              <span className="block mt-2">
                <strong>Note:</strong> Company "{newCompanyName}" will be automatically created when you save this job.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {role === "employer" && !userCompany && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please create a company profile first from your dashboard before posting jobs.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-muted rounded-lg mb-8">
          <TabsTrigger value="basic" className="w-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">1/4. Basic</TabsTrigger>
          <TabsTrigger value="details" className="w-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">2/4. Further Details</TabsTrigger>
          <TabsTrigger value="requirements" className="w-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">3/4. Requirements</TabsTrigger>
          <TabsTrigger value="application" className="w-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">4/4. Application Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {role === "admin" && (
            <div className="space-y-2">
              <Label htmlFor="company_id">Attach to Company (Optional)</Label>
              <Select
                value={formData.company_id || (shouldCreateCompany ? "create-new" : "none")}
                onValueChange={(value) => {
                  if (value === "create-new") {
                    setShouldCreateCompany(true);
                    setFormData({
                      ...formData,
                      company_id: "",
                    });
                  } else if (value === "none") {
                    setShouldCreateCompany(false);
                    setFormData({
                      ...formData,
                      company_id: "",
                    });
                  } else {
                    const selectedCompany = allCompanies?.find((c: any) => c.id === value);
                    setShouldCreateCompany(false);
                    setFormData({
                      ...formData,
                      company_id: value,
                      company: selectedCompany?.name || formData.company,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Company (Direct Listing)</SelectItem>
                  <SelectItem value="create-new">Create New Company</SelectItem>
                  {allCompanies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show company creation form when needed */}
          {role === "admin" && shouldCreateCompany && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium">
                {existingCompanyCheck ? "Existing Company Found" : "Create New Company"}
              </h3>
              <div className="space-y-2">
                <Label htmlFor="new_company_name">Company Name *</Label>
                <Input
                  id="new_company_name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g., TechCorp Kenya"
                  required
                />
                {existingCompanyCheck ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Company "{existingCompanyCheck.name}" already exists and will be reused (no duplicate will be created).
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This company will be automatically created when you post the job.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Show regular company input when not creating new company */}
          {(!shouldCreateCompany || role !== "admin") && (
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                name="company"
                value={userCompany?.name || formData.company}
                onChange={handleChange}
                placeholder="e.g., TechCorp Kenya"
                required
                disabled={role === "employer" && !!userCompany}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Software Engineer"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry *</Label>
              {industries && industries.length > 0 ? (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {industries.map((ind: any) => (
                    <div key={ind.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`industry-${ind.id}`}
                        checked={formData.industries.includes(ind.name)}
                        onCheckedChange={(checked) => {
                          const newIndustries = checked
                            ? [...formData.industries, ind.name]
                            : formData.industries.filter(i => i !== ind.name);
                          setFormData({
                            ...formData,
                            industries: newIndustries,
                            industry: newIndustries[0] || "",
                          });
                        }}
                      />
                      <label htmlFor={`industry-${ind.id}`} className="text-sm cursor-pointer">
                        {ind.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <Select 
                  value={formData.industry} 
                  onValueChange={(value) => setFormData({...formData, industry: value, industries: [value]})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries?.map((industry: any) => (
                      <SelectItem key={industry.id} value={industry.name}>{industry.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formData.industries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.industries.map((ind, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                      {ind}
                      <button type="button" onClick={() => {
                        const newIndustries = formData.industries.filter(i => i !== ind);
                        setFormData({...formData, industries: newIndustries, industry: newIndustries[0] || ""});
                      }} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Job Function</Label>
              {jobFunctions && jobFunctions.length > 0 ? (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {jobFunctions.map((func: any) => (
                    <div key={func.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`func-${func.id}`}
                        checked={formData.job_functions.includes(func.name)}
                        onCheckedChange={(checked) => {
                          const newFuncs = checked
                            ? [...formData.job_functions, func.name]
                            : formData.job_functions.filter(f => f !== func.name);
                          setFormData({
                            ...formData,
                            job_functions: newFuncs,
                            job_function: newFuncs[0] || "",
                          });
                        }}
                      />
                      <label htmlFor={`func-${func.id}`} className="text-sm cursor-pointer">
                        {func.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <Select 
                  value={formData.job_function} 
                  onValueChange={(value) => setFormData({...formData, job_function: value, job_functions: [value]})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job function" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobFunctions?.map((func: any) => (
                      <SelectItem key={func.id} value={func.name}>{func.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formData.job_functions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.job_functions.map((fn, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                      {fn}
                      <button type="button" onClick={() => {
                        const newFuncs = formData.job_functions.filter(f => f !== fn);
                        setFormData({...formData, job_functions: newFuncs, job_function: newFuncs[0] || ""});
                      }} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData({...formData, description: value})}
              label="Job Description *"
              placeholder="Describe the role, requirements, and responsibilities..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <RichTextEditor
              value={formData.responsibilities}
              onChange={(value) => setFormData({...formData, responsibilities: value})}
              label="Key Responsibilities"
              placeholder="List the key responsibilities for this role..."
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employment Type (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                {[
                  { value: "FULL_TIME", label: "Full Time" },
                  { value: "PART_TIME", label: "Part Time" },
                  { value: "CONTRACTOR", label: "Contractor" },
                  { value: "INTERN", label: "Intern" },
                  { value: "TEMPORARY", label: "Temporary" },
                  { value: "VOLUNTEER", label: "Volunteer" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp_${opt.value}`}
                      checked={formData.employment_types.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked
                          ? [...formData.employment_types, opt.value]
                          : formData.employment_types.filter(t => t !== opt.value);
                        if (newTypes.length > 0) {
                          setFormData({ ...formData, employment_types: newTypes, employment_type: newTypes[0] });
                        }
                      }}
                    />
                    <Label htmlFor={`emp_${opt.value}`} className="font-normal text-sm cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Location Type (select all that apply)</Label>
              <div className="grid grid-cols-1 gap-2 p-3 border rounded-md">
                {[
                  { value: "ON_SITE", label: "On Site" },
                  { value: "REMOTE", label: "Remote" },
                  { value: "HYBRID", label: "Hybrid" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc_${opt.value}`}
                      checked={formData.job_location_types.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked
                          ? [...formData.job_location_types, opt.value]
                          : formData.job_location_types.filter(t => t !== opt.value);
                        if (newTypes.length > 0) {
                          setFormData({ ...formData, job_location_types: newTypes, job_location_type: newTypes[0] });
                        }
                      }}
                    />
                    <Label htmlFor={`loc_${opt.value}`} className="font-normal text-sm cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_level">Experience Level</Label>
              <Select value={formData.experience_level} onValueChange={(value) => setFormData({...formData, experience_level: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entry">Entry</SelectItem>
                  <SelectItem value="Mid">Mid</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Managerial">Managerial</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_through">Valid Through (Expiry Date)</Label>
              <Input
                id="valid_through"
                name="valid_through"
                type="date"
                value={formData.valid_through}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Required for Google job listings. Defaults to 30 days after posting if left blank.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minimum_experience">Minimum Years of Experience</Label>
              <Input
                id="minimum_experience"
                name="minimum_experience"
                type="number"
                value={formData.minimum_experience}
                onChange={handleChange}
                placeholder="e.g., 3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="is_featured">Featured Job</Label>
              <Select value={formData.is_featured.toString()} onValueChange={(value) => setFormData({...formData, is_featured: value === "true"})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium">Compensation Details</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_min">Minimum Salary</Label>
                <Input
                  id="salary_min"
                  name="salary_min"
                  type="number"
                  value={formData.salary_min}
                  onChange={handleChange}
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_max">Maximum Salary</Label>
                <Input
                  id="salary_max"
                  name="salary_max"
                  type="number"
                  value={formData.salary_max}
                  onChange={handleChange}
                  placeholder="80000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_period">Period</Label>
                <Select value={formData.salary_period} onValueChange={(value) => setFormData({...formData, salary_period: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOUR">Per Hour</SelectItem>
                    <SelectItem value="DAY">Per Day</SelectItem>
                    <SelectItem value="WEEK">Per Week</SelectItem>
                    <SelectItem value="MONTH">Per Month</SelectItem>
                    <SelectItem value="YEAR">Per Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="salary_type">Salary Type</Label>
                <Select value={formData.salary_type} onValueChange={(value) => setFormData({...formData, salary_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_visibility">Salary Visibility</Label>
                <Select value={formData.salary_visibility} onValueChange={(value) => setFormData({...formData, salary_visibility: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Show">Show Salary</SelectItem>
                    <SelectItem value="Hide">Hide Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_schedule">Work Schedule</Label>
                <Input
                  id="work_schedule"
                  name="work_schedule"
                  value={formData.work_schedule}
                  onChange={handleChange}
                  placeholder="e.g., Monday–Friday 8:00–17:00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium">Location Details</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Select value={selectedCountyId} onValueChange={setSelectedCountyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select county" />
                  </SelectTrigger>
                  <SelectContent>
                    {counties?.map((county: any) => (
                      <SelectItem key={county.id} value={String(county.id)}>{county.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City/Town</Label>
                <Select 
                  value={selectedTownId} 
                  onValueChange={setSelectedTownId}
                  disabled={!selectedCountyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCountyId ? "Select town" : "Select county first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {towns?.map((town: any) => (
                      <SelectItem key={town.id} value={String(town.id)}>{town.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Locations */}
            <div className="space-y-2">
              <Label>Additional Locations (optional)</Label>
              <p className="text-xs text-muted-foreground">Add if this job is available in multiple locations</p>
              {formData.additional_locations.map((loc, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={loc.county}
                    onChange={(e) => {
                      const newLocs = [...formData.additional_locations];
                      newLocs[idx] = { ...newLocs[idx], county: e.target.value, city: e.target.value };
                      setFormData({ ...formData, additional_locations: newLocs });
                    }}
                    placeholder="County"
                    className="flex-1"
                  />
                  <Input
                    value={loc.city}
                    onChange={(e) => {
                      const newLocs = [...formData.additional_locations];
                      newLocs[idx] = { ...newLocs[idx], city: e.target.value };
                      setFormData({ ...formData, additional_locations: newLocs });
                    }}
                    placeholder="City/Town"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newLocs = formData.additional_locations.filter((_, i) => i !== idx);
                      setFormData({ ...formData, additional_locations: newLocs });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData({
                    ...formData,
                    additional_locations: [...formData.additional_locations, { county: "", city: "" }],
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Location
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4 mt-4">
          <div className="space-y-2">
            <RichTextEditor
              value={formData.required_qualifications}
              onChange={(value) => setFormData({...formData, required_qualifications: value})}
              label="Required Qualifications"
              placeholder="Enter required qualifications, e.g., Bachelor's in Computer Science, 3+ years experience"
            />
            <p className="text-xs text-muted-foreground">Use the editor to format your qualifications</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="education_level_id">Minimum Education Level</Label>
              <Select 
                value={formData.education_level_id} 
                onValueChange={(value) => setFormData({...formData, education_level_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select minimum education level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific requirement</SelectItem>
                  {educationLevels?.map((level: any) => (
                    <SelectItem key={level.id} value={String(level.id)}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_of_study">Area of Study / Discipline</Label>
              <Input
                id="area_of_study"
                name="area_of_study"
                value={formData.area_of_study}
                onChange={handleChange}
                placeholder="e.g., Science, Commerce, Arts, Engineering, Business"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_of_study">Specific Course / Major</Label>
              <Input
                id="field_of_study"
                name="field_of_study"
                value={formData.field_of_study}
                onChange={handleChange}
                placeholder="e.g., Industrial Chemistry, Computer Science, Accounting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language_requirements">Language Requirements</Label>
              <Input
                id="language_requirements"
                name="language_requirements"
                value={formData.language_requirements}
                onChange={handleChange}
                placeholder="e.g., English, Kiswahili"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <RichTextEditor
              value={formData.additional_info}
              onChange={(value) => setFormData({...formData, additional_info: value})}
              label="Additional Information"
              placeholder="Add any additional information about this job, such as career tips, FAQs, etc..."
            />
            <p className="text-xs text-muted-foreground">Shown in the Additional Information card on the job details page (How to Apply plus generated career tips).</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Keywords)</Label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., engineering, remote, senior (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">Add up to 5 of the most relevant tags, separated by commas</p>
          </div>
        </TabsContent>

        <TabsContent value="application" className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              At least one application method must be enabled. You can enable multiple methods - all will be shown to candidates.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="direct_apply" 
              checked={formData.direct_apply}
              onCheckedChange={(checked) => setFormData({...formData, direct_apply: !!checked})}
            />
            <Label htmlFor="direct_apply" className="font-normal">
              Enable direct application through this portal
            </Label>
          </div>

          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium">External Application Methods (Optional)</p>
            <p className="text-xs text-muted-foreground">Add any external application methods. All provided methods will be shown to candidates.</p>
            
            <div className="space-y-2">
              <Label htmlFor="application_url">Company Application URL</Label>
              <Input
                id="application_url"
                name="application_url"
                type="url"
                value={formData.application_url}
                onChange={handleChange}
                placeholder="https://company.com/apply"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apply_email">Apply via Email</Label>
              <Input
                id="apply_email"
                name="apply_email"
                type="email"
                value={formData.apply_email}
                onChange={handleChange}
                placeholder="careers@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apply_link">Apply via External Link</Label>
              <Input
                id="apply_link"
                name="apply_link"
                type="url"
                value={formData.apply_link}
                onChange={handleChange}
                placeholder="https://company.com/careers"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Job Status</Label>
            <Select
              value={formData.status || "active"}
              onValueChange={(value) => setFormData({...formData, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Active (Publish Now)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Publish Now)</SelectItem>
                <SelectItem value="draft">Draft (Save for Later)</SelectItem>
                {role === "admin" && (
                  <>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.status === "draft" 
                ? "Draft jobs are saved but not visible to job seekers. You can edit and publish them later." 
                : "Active jobs are immediately visible to job seekers."}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button 
        type="submit" 
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        disabled={mutation.isPending || (role === "employer" && !userCompany)}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {formData.status === "draft" ? "Saving Draft..." : isEdit ? "Updating Job..." : "Publishing Job..."}
          </>
        ) : (
          formData.status === "draft" ? "Save as Draft" : isEdit ? "Update Job" : "Publish Job"
        )}
      </Button>
    </form>
  );
};

export default JobPostingForm;