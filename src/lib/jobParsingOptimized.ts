import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';
import {
  buildJobParseSystemPrompt,
  FALLBACK_INDUSTRIES,
  FALLBACK_JOB_FUNCTIONS,
  normalizeParsedJobFields,
} from '@/lib/jobParseNormalization';
import { sanitizeStockTipsCopy } from '@/lib/sanitizeStockTipsCopy';
import { ensureCareerTipsHtml } from '@/lib/careerTips';
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabaseEnv';

function buildJobParseClient() {
  try {
    return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}

const supabase = buildJobParseClient();

export interface ParsedJobData {
  title: string;
  company: string;
  description: string;
  responsibilities: string;
  required_qualifications: string;
  software_skills?: string;
  employment_type: string;
  employment_types?: string[];
  job_location_type: string;
  job_location_types?: string[];
  job_location_country: string;
  job_location_county?: string;
  job_location_city?: string;
  additional_locations?: Array<{ county: string; city: string }>;
  industry: string;
  industries?: string[];
  education_level_name?: string;
  area_of_study?: string;
  field_of_study?: string;
  experience_level: string;
  language_requirements?: string;
  salary_min?: string;
  salary_max?: string;
  salary_period?: string;
  salary_currency?: string;
  minimum_experience?: string;
  apply_email?: string;
  apply_link?: string;
  application_url?: string;
  additional_info?: string;
  tags?: string;
  job_function?: string;
  job_functions?: string[];
  valid_through?: string;
}

export interface JobParsingResult {
  success: boolean;
  data?: ParsedJobData;
  error?: string;
  cached?: boolean;
  processingTime?: number;
}

// Generate hash for caching using Web Crypto API (Edge runtime compatible)
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check cache first
export async function getCachedResponse(jobText: string): Promise<ParsedJobData | null> {
  // If Supabase isn't configured, return null
  if (!supabase) {
    console.warn("Supabase not configured - skipping cache lookup");
    return null;
  }
  
  try {
    const hash = await generateHash(jobText);
    
    const { data, error } = await (supabase as any)
      .from('ai_response_cache')
      .select('response_data')
      .eq('input_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Update hit count
    await (supabase as any)
      .from('ai_response_cache')
      .update({ hit_count: (supabase as any).sql`hit_count + 1` })
      .eq('input_hash', hash);

    return finalizeParsedJobData(data.response_data as ParsedJobData & { status?: string; job_status?: string; direct_apply?: boolean });
  } catch (error) {
    console.error('Cache lookup error:', error);
    return null;
  }
}

// Save response to cache
export async function saveToCache(
  jobText: string, 
  response: ParsedJobData, 
  modelUsed: string = 'unknown'
): Promise<void> {
  // If Supabase isn't configured, skip cache save
  if (!supabase) {
    console.warn("Supabase not configured - skipping cache save");
    return;
  }
  
  try {
    const hash = await generateHash(jobText);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days cache

    await (supabase as any)
      .from('ai_response_cache')
      .upsert({
        input_hash: hash,
        input_text: jobText,
        response_data: response,
        model_used: modelUsed,
        expires_at: expiresAt.toISOString(),
        hit_count: 1
      }, {
        onConflict: 'input_hash'
      });
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

/** Quota / auth failures should not burn retries — fall through to next provider. */
function isNonRetryableAiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /(?:\b429\b|\b403\b|quota|rate.?limit|resource.?exhausted|too many requests|insufficient.?quota|api key not valid|invalid.?api.?key|permission.?denied|balance|payment.?required|\b402\b)/i.test(
    msg
  )
}

function nonEmptyEnv(...keys: Array<string | undefined>): string[] {
  return keys
    .map(k => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean)
}

type ProviderAttempt =
  | { ok: true; response: ParsedJobData; modelUsed: string }
  | { ok: false; error: unknown }

/** Works with strictNullChecks:false — boolean discriminants do not narrow there. */
function providerFailure(result: ProviderAttempt): unknown {
  return 'error' in result ? result.error : null
}

export type CallAIRetryOptions = {
  attachCareerTips?: boolean
  /** Stop after this many provider keys (DeepSeek then Gemini). Default: all keys. */
  maxKeyTries?: number
}

async function tryProviderWithRetries(
  label: string,
  call: () => Promise<ParsedJobData>,
  maxRetries: number,
  finalizeOptions?: { attachCareerTips?: boolean }
): Promise<ProviderAttempt> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await call()
      console.info(`[callAIWithRetry] success via ${label}`)
      return {
        ok: true,
        response: await finalizeParsedJobData(response, finalizeOptions),
        modelUsed: label,
      }
    } catch (error) {
      lastError = error
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(
        `[callAIWithRetry] ${label} attempt ${attempt + 1} failed: ${msg}`
      )
      // Quota / bad keys: skip remaining retries and try next provider
      if (isNonRetryableAiError(error)) {
        break
      }
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)))
      }
    }
  }
  return { ok: false, error: lastError }
}

// Optimized AI API call with timeout and retry
// Priority chain: DeepSeek (~95%) → Gemini (backup)
export async function callAIWithRetry(
  jobText: string,
  systemPrompt: string,
  maxRetries: number = 2,
  finalizeOptions?: CallAIRetryOptions
): Promise<{ response: ParsedJobData; modelUsed: string }> {
  const deepseekKeys = nonEmptyEnv(
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_2
  )
  const geminiApiKeys = nonEmptyEnv(
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  )
  const deepseekModel =
    process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash'
  const maxKeyTries = finalizeOptions?.maxKeyTries
  const finalizeOnly = { attachCareerTips: finalizeOptions?.attachCareerTips }
  let keysTried = 0
  const canTryKey = () => maxKeyTries == null || keysTried < maxKeyTries

  let lastError: unknown = null

  // 1. DeepSeek primary
  for (let i = 0; i < deepseekKeys.length; i++) {
    if (!canTryKey()) break
    keysTried++
    const result = await tryProviderWithRetries(
      `${deepseekModel}#${i + 1}`,
      () => callDeepSeekAPI(deepseekKeys[i], jobText, systemPrompt, deepseekModel),
      maxRetries,
      finalizeOnly
    )
    if (result.ok) {
      return { response: result.response, modelUsed: deepseekModel }
    }
    lastError = providerFailure(result) || lastError
  }

  if (!deepseekKeys.length) {
    console.warn('[callAIWithRetry] DEEPSEEK_API_KEY missing — falling back to Gemini')
  }

  // 2. Gemini backup
  for (let i = 0; i < geminiApiKeys.length; i++) {
    if (!canTryKey()) break
    keysTried++
    const result = await tryProviderWithRetries(
      `gemini-2.5-flash#${i + 1}`,
      () => callGeminiAPI(geminiApiKeys[i], jobText, systemPrompt),
      maxRetries,
      finalizeOnly
    )
    if (result.ok) {
      return { response: result.response, modelUsed: 'gemini-2.5-flash' }
    }
    lastError = providerFailure(result) || lastError
  }

  throw lastError || new Error('All AI services failed')
}

// DeepSeek primary (OpenAI-compatible)
async function callDeepSeekAPI(
  apiKey: string,
  jobText: string,
  systemPrompt: string,
  model: string
): Promise<ParsedJobData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nReturn ONLY valid JSON for the job parse schema (no markdown). The word json is required for JSON mode.`,
          },
          { role: 'user', content: `Parse this job posting as JSON:\n\n${jobText}` },
        ],
        temperature: 0.35,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}${
          body ? ` — ${body.slice(0, 200)}` : ''
        }`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in DeepSeek response');
    }

    return parseAIResponse(content);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Gemini backup
async function callGeminiAPI(apiKey: string, jobText: string, systemPrompt: string): Promise<ParsedJobData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}

Parse this job posting:

${jobText}` }]
          }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 8192,
          }
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}${
          body ? ` — ${body.slice(0, 200)}` : ''
        }`
      )
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in Gemini response');
    }
    
    return parseAIResponse(content);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Parse AI response with better error handling
function stripParsedMetaFields(
  data: ParsedJobData & { status?: string; job_status?: string; direct_apply?: boolean; education_requirements?: string }
): ParsedJobData {
  const {
    status: _status,
    job_status: _jobStatus,
    direct_apply: _directApply,
    education_requirements: _educationRequirements,
    ...clean
  } = data;
  return clean as ParsedJobData;
}

export async function getLookupOptions(): Promise<{ industries: string[]; jobFunctions: string[] }> {
  if (!supabase) {
    return {
      industries: [...FALLBACK_INDUSTRIES],
      jobFunctions: [...FALLBACK_JOB_FUNCTIONS],
    };
  }

  const [{ data: industries }, { data: jobFunctions }] = await Promise.all([
    supabase.from('industries').select('name').order('name'),
    supabase.from('job_functions').select('name').order('name'),
  ]);

  return {
    industries: industries?.map((row) => row.name) || [...FALLBACK_INDUSTRIES],
    jobFunctions: jobFunctions?.map((row) => row.name) || [...FALLBACK_JOB_FUNCTIONS],
  };
}

export async function getJobParseSystemPrompt(): Promise<string> {
  const { industries, jobFunctions } = await getLookupOptions();
  return buildJobParseSystemPrompt(industries, jobFunctions);
}

export async function finalizeParsedJobData(
  data: ParsedJobData & { status?: string; job_status?: string; direct_apply?: boolean; education_requirements?: string },
  options?: { attachCareerTips?: boolean }
): Promise<ParsedJobData> {
  const { industries, jobFunctions } = await getLookupOptions();
  const stripped = stripParsedMetaFields(data);
  const normalized = normalizeParsedJobFields(stripped, industries, jobFunctions);
  if (normalized.additional_info) {
    const cleaned = sanitizeStockTipsCopy(
      normalized.additional_info,
      normalized.title || null
    );
    if (cleaned) normalized.additional_info = cleaned;
    else delete normalized.additional_info;
  }
  if (options?.attachCareerTips === false) {
    return normalized;
  }
  const withTips = await ensureCareerTipsHtml(normalized.additional_info || '', {
    title: normalized.title,
    company: normalized.company,
    description: normalized.description,
    responsibilities: normalized.responsibilities,
    qualifications: normalized.required_qualifications,
  });
  if (withTips) normalized.additional_info = withTips;
  else if (!normalized.additional_info) delete normalized.additional_info;
  return normalized;
}

function parseAIResponse(content: string): ParsedJobData {
  let cleanedContent = content.trim();
  
  // Remove markdown code blocks
  if (cleanedContent.startsWith("``json")) {
    cleanedContent = cleanedContent.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.replace(/^```\n/, "").replace(/\n```$/, "");
  }
  
  try {
    return stripParsedMetaFields(JSON.parse(cleanedContent));
  } catch (error) {
    // Try to extract JSON from the response
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return stripParsedMetaFields(JSON.parse(jsonMatch[0]));
      } catch (e) {
        throw new Error(`Failed to parse AI response: ${error}`);
      }
    }
    throw new Error(`Invalid JSON in AI response: ${error}`);
  }
}

// Queue job for async processing
export async function queueJobForParsing(jobText: string): Promise<string> {
  // If Supabase isn't configured, throw an error
  if (!supabase) {
    throw new Error("Supabase not configured - cannot queue job");
  }
  
  const hash = await generateHash(jobText);
  
  const { data, error } = await (supabase as any)
    .from('job_parsing_queue')
    .insert({
      job_text: jobText,
      job_text_hash: hash,
      status: 'pending'
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to queue job: ${error.message}`);
  }
  
  return data.id;
}

// Get job parsing status
export async function getJobParsingStatus(jobId: string): Promise<{
  status: string;
  result?: ParsedJobData;
  error?: string;
  progress?: number;
}> {
  // If Supabase isn't configured, throw an error
  if (!supabase) {
    throw new Error("Supabase not configured - cannot get job status");
  }
  
  const { data, error } = await (supabase as any)
    .from('job_parsing_queue')
    .select('status, result, error_message')
    .eq('id', jobId)
    .single();
  
  if (error) {
    throw new Error(`Failed to get job status: ${error.message}`);
  }
  
  return {
    status: data.status,
    result: data.result as ParsedJobData | undefined,
    error: data.error_message || undefined,
    progress: data.status === 'completed' ? 100 : data.status === 'processing' ? 50 : 0
  };
}

// Process queued jobs (for background processing)
export async function processQueuedJobs(batchSize: number = 5): Promise<void> {
  // If Supabase isn't configured, skip processing
  if (!supabase) {
    console.warn("Supabase not configured - skipping job processing");
    return;
  }
  
  const { data: jobs, error } = await (supabase as any)
    .from('job_parsing_queue')
    .select('id, job_text')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);
  
  if (error || !jobs?.length) {
    return;
  }
  
  // Process jobs in parallel (but limited batch size)
  await Promise.allSettled(
    jobs.map((job: any) => processQueuedJob(job.id, job.job_text))
  );
}

// Process individual queued job
async function processQueuedJob(jobId: string, jobText: string): Promise<void> {
  // If Supabase isn't configured, skip processing
  if (!supabase) {
    console.warn("Supabase not configured - skipping job processing");
    return;
  }
  
  try {
    // Mark as processing
    await (supabase as any)
      .from('job_parsing_queue')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', jobId);
    
    // Check cache first
    let result = await getCachedResponse(jobText);
    let modelUsed = 'cache';
    
    if (!result) {
      // Parse with AI
      const aiResult = await callAIWithRetry(jobText, await getJobParseSystemPrompt());
      result = aiResult.response;
      modelUsed = aiResult.modelUsed;
      
      // Save to cache
      await saveToCache(jobText, result, modelUsed);
    }
    
    // Mark as completed
    await (supabase as any)
      .from('job_parsing_queue')
      .update({ 
        status: 'completed',
        result: result,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
  } catch (error: any) {
    // Mark as failed
    await (supabase as any)
      .from('job_parsing_queue')
      .update({ 
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}