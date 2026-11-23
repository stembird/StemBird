import { callAI, hasAIConfigured } from './aiProviders'
import type { ParsedCVData } from './cvParsing'

const SYSTEM_PROMPT = `You are an expert CV/Resume parser. Extract structured information from the provided CV text.

IMPORTANT INSTRUCTIONS:
1. Extract ALL information accurately from the CV
2. For dates, use YYYY-MM-DD format (use YYYY-MM-01 if only month/year is given, YYYY-01-01 if only year)
3. For current positions/education, set is_current to true and end_date to null
4. Categorize skills as: technical, soft, language, or tool
5. Estimate proficiency levels based on context (years, descriptions)
6. Extract phone numbers, emails, LinkedIn, GitHub, portfolio URLs
7. Infer years of experience from work history if not explicitly stated
8. For employment_type, use: full_time, part_time, contract, freelance, or internship
9. Return ONLY valid JSON, no markdown formatting

Return a JSON object with this exact structure:
{
  "basicInfo": {
    "full_name": "string",
    "phone": "string",
    "location": "string (city, country)",
    "bio": "string (professional summary/objective)",
    "linkedin_url": "string",
    "portfolio_url": "string",
    "github_url": "string"
  },
  "professional": {
    "current_title": "string (most recent job title)",
    "years_experience": number,
    "expected_salary_min": number,
    "expected_salary_max": number
  },
  "workExperience": [
    {
      "company_name": "string",
      "job_title": "string",
      "employment_type": "full_time|part_time|contract|freelance|internship",
      "location": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null",
      "is_current": boolean,
      "description": "string",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "institution_name": "string",
      "degree_type": "string (Bachelor's, Master's, PhD, Diploma, etc.)",
      "field_of_study": "string",
      "location": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null",
      "is_current": boolean,
      "grade": "string (GPA, First Class, etc.)",
      "description": "string"
    }
  ],
  "skills": [
    {
      "skill_name": "string",
      "skill_category": "technical|soft|language|tool",
      "proficiency_level": "beginner|intermediate|advanced|expert",
      "years_of_experience": number
    }
  ]
}`

export async function parseCVText(
  cvText: string
): Promise<{ response: ParsedCVData; modelUsed: string }> {
  if (!hasAIConfigured()) {
    throw new Error('No AI API key configured. Please contact support.')
  }

  const result = await callAI(`CV TEXT:\n${cvText}`, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 8192,
    temperature: 0.1,
    timeoutMs: 20000,
    maxKeyTries: 2,
    json: true,
  })

  if (!result.parsed || typeof result.parsed !== 'object') {
    throw new Error('The CV parser returned invalid data. Please try again.')
  }

  return { response: result.parsed as ParsedCVData, modelUsed: result.model }
}
