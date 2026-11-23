export interface ParsedCVData {
  basicInfo: {
    full_name?: string
    phone?: string
    location?: string
    bio?: string
    linkedin_url?: string
    portfolio_url?: string
    github_url?: string
  }
  professional: {
    current_title?: string
    years_experience?: number
    expected_salary_min?: number
    expected_salary_max?: number
  }
  workExperience: Array<{
    company_name: string
    job_title: string
    employment_type?: string
    location?: string
    start_date: string
    end_date?: string
    is_current: boolean
    description?: string
    achievements?: string[]
  }>
  education: Array<{
    institution_name: string
    degree_type: string
    field_of_study: string
    location?: string
    start_date: string
    end_date?: string
    is_current: boolean
    grade?: string
    description?: string
  }>
  skills: Array<{
    skill_name: string
    skill_category?: string
    proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    years_of_experience?: number
  }>
}

export async function parseCVFile(file: File): Promise<ParsedCVData> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/parse-cv', {
    method: 'POST',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Failed to parse CV file')
  }
  if (!result.data || typeof result.data !== 'object') {
    throw new Error('The CV parser returned invalid data. Please try again.')
  }

  return result.data as ParsedCVData
}
