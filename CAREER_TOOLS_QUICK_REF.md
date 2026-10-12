# Career Tools - Quick Reference Guide

## 🚀 Quick Start

### Access Career Tools
```
URL: /dashboard/career-tools
Button: Candidate Dashboard → "Career Tools"
```

### Import Library
```typescript
import {
  getCVTemplates,
  getUserCVs,
  createCV,
  getCoverLetterTemplates,
  generateCoverLetterFromTemplate,
  getSkillAssessments,
  suggestCareerPaths,
  getSalaryInsights
} from '@/lib/careerTools';
```

## 📋 Common Operations

### CV Management

**Create a CV:**
```typescript
const cv = await createCV({
  user_id: userId,
  template_id: templateId,
  title: "Software Engineer CV",
  content: {
    personal: { name: "John Doe", email: "john@example.com" },
    experience: [],
    education: [],
    skills: []
  },
  is_primary: true
});
```

**Get User's CVs:**
```typescript
const cvs = await getUserCVs(userId);
// Returns array sorted by primary first, then by updated_at
```

**Set Primary CV:**
```typescript
await setPrimaryCV(userId, cvId);
// Automatically unsets other primary CVs
```

### Cover Letters

**Generate from Template:**
```typescript
const content = await generateCoverLetterFromTemplate(
  templateId,
  {
    hiring_manager: "Jane Smith",
    job_title: "Senior Developer",
    company_name: "Tech Corp",
    years_experience: "5",
    industry: "Technology",
    key_skills: "React, Node.js, AWS"
  }
);

const letter = await createCoverLetter({
  user_id: userId,
  template_id: templateId,
  job_id: jobId, // optional
  title: "Tech Corp Application",
  content: content
});
```

**Available Placeholders:**
- `{{hiring_manager}}`
- `{{job_title}}`
- `{{company_name}}`
- `{{years_experience}}`
- `{{industry}}`
- `{{key_skills}}`
- `{{custom_paragraph}}`
- `{{company_reason}}`
- `{{candidate_name}}`

### Skill Assessments

**Get Assessments by Category:**
```typescript
const assessments = await getSkillAssessments('technical');
// Categories: 'technical', 'soft', 'language', 'tool'
```

**Submit Assessment Result:**
```typescript
const result = await submitAssessment({
  user_id: userId,
  assessment_id: assessmentId,
  score: 85,
  passed: true,
  time_taken_minutes: 18,
  answers: userAnswers,
  is_public: true // Show on profile
});
```

**Calculate Score:**
```typescript
const { score, passed } = await calculateAssessmentScore(
  assessment,
  userAnswers
);
```

### Career Planning

**Get Personalized Suggestions:**
```typescript
const paths = await suggestCareerPaths(userId);
// Returns paths with match scores based on user's skills
```

**Create Career Goal:**
```typescript
const goal = await createCareerGoal({
  user_id: userId,
  current_role: "Junior Developer",
  target_role: "Senior Developer",
  target_timeline_months: 36,
  notes: "Focus on system design and mentoring",
  is_active: true
});
```

**Update Progress:**
```typescript
await updateCareerGoal(goalId, {
  progress_percentage: 50,
  completed_steps: ['step1', 'step2']
});
```

### Salary Research

**Get Market Insights:**
```typescript
const insights = await getSalaryInsights(
  "Software Engineer",
  "San Francisco, CA",
  "mid" // entry, mid, senior, lead, executive
);

// Returns:
// {
//   min_salary: 120000,
//   max_salary: 180000,
//   median_salary: 150000,
//   percentile_25: 135000,
//   percentile_75: 165000,
//   sample_size: 150,
//   currency: "USD"
// }
```

**Compare User Salary:**
```typescript
const comparison = await compareSalaryToMarket(
  "Software Engineer",
  145000, // user's salary
  "San Francisco, CA",
  "mid"
);

// Returns:
// {
//   userSalary: 145000,
//   marketMedian: 150000,
//   percentile: 45,
//   difference: -5000,
//   differencePercentage: -3,
//   status: "below" // or "at" or "above"
// }
```

**Save Salary Expectation:**
```typescript
await setSalaryExpectation({
  user_id: userId,
  job_title: "Senior Developer",
  min_salary: 150000,
  max_salary: 200000,
  currency: "USD",
  is_negotiable: true,
  preferred_benefits: ["health", "401k", "remote"]
});
```

## 🗄️ Database Tables

### cv_templates
```sql
id, name, description, category, thumbnail_url, 
template_data (JSONB), is_premium, is_active
```

### candidate_cvs
```sql
id, user_id, template_id, title, content (JSONB),
is_primary, version, file_url, created_at, updated_at
```

### cover_letter_templates
```sql
id, name, description, category, template_text,
placeholders (JSONB), is_premium, usage_count
```

### candidate_cover_letters
```sql
id, user_id, template_id, job_id, title, content,
generated_content, file_url, created_at, updated_at
```

### skill_assessments
```sql
id, skill_name, category, difficulty_level, description,
duration_minutes, passing_score, questions (JSONB)
```

### candidate_assessment_results
```sql
id, user_id, assessment_id, score, passed,
time_taken_minutes, answers (JSONB), certificate_url,
completed_at, expires_at, is_public
```

### career_paths
```sql
id, from_role, to_role, difficulty, typical_duration_months,
required_skills (JSONB), recommended_certifications (JSONB),
salary_increase_percentage, description, steps (JSONB), success_rate
```

### candidate_career_goals
```sql
id, user_id, current_role, target_role, target_timeline_months,
career_path_id, progress_percentage, completed_steps (JSONB),
notes, is_active, created_at, updated_at
```

### salary_data
```sql
id, job_title, location, country, experience_level,
min_salary, max_salary, median_salary, currency,
sample_size, industry, company_size, remote_type
```

### candidate_salary_expectations
```sql
id, user_id, job_title, min_salary, max_salary,
currency, is_negotiable, preferred_benefits (JSONB)
```

## 🔒 Security (RLS Policies)

**User-Owned Data:**
- `candidate_cvs` - Users can only CRUD their own
- `candidate_cover_letters` - Users can only CRUD their own
- `candidate_assessment_results` - Users can only CRUD their own (public if marked)
- `candidate_career_goals` - Users can only CRUD their own
- `candidate_salary_expectations` - Users can only CRUD their own

**Public Read:**
- `cv_templates` - All active templates
- `cover_letter_templates` - All active templates
- `skill_assessments` - All active assessments
- `career_paths` - All paths
- `salary_data` - All market data

**Admin Only:**
- Template management
- Assessment creation
- Career path curation

## 🎨 UI Components

### Main Dashboard
```typescript
import CareerToolsPage from '@/app/dashboard/career-tools/page';
// Tabs: CV Builder, Cover Letters, Assessments, Career Path, Salary
```

### Individual Components
```typescript
import CVBuilder from '@/components/career-tools/CVBuilder';
import CoverLetterGenerator from '@/components/career-tools/CoverLetterGenerator';
import SkillAssessments from '@/components/career-tools/SkillAssessments';
import CareerPathPlanner from '@/components/career-tools/CareerPathPlanner';
import SalaryInsights from '@/components/career-tools/SalaryInsights';
```

## 🧪 Testing

### Test CV Creation
```typescript
const testCV = await createCV({
  user_id: testUserId,
  title: "Test CV",
  content: { personal: {}, experience: [], education: [], skills: [] }
});
console.log('CV created:', testCV.id);
```

### Test Salary Insights
```typescript
const insights = await getSalaryInsights("Software Engineer");
console.log('Median salary:', insights?.median_salary);
```

### Test Career Suggestions
```typescript
const paths = await suggestCareerPaths(testUserId);
console.log('Suggested paths:', paths.length);
```

## 📊 Seed Data

**CV Templates:** 3 (Modern, Classic, Creative)
**Cover Letter Templates:** 2 (Professional, Technical)
**Skill Assessments:** 2 (JavaScript, Communication)
**Career Paths:** 2 (Junior→Senior Dev, Coordinator→Manager)
**Salary Data:** 6 entries (Various tech roles)

## 🔧 Helper Functions

### Database Functions
```sql
-- Get salary insights
SELECT * FROM get_salary_insights('Software Engineer', 'San Francisco', 'mid');

-- Suggest career paths
SELECT * FROM suggest_career_paths('user-uuid');
```

## 💡 Tips

1. **CV Versions:** Encourage users to create role-specific CVs
2. **Cover Letters:** Pre-fill placeholders from user profile
3. **Assessments:** Show progress and encourage completion
4. **Career Goals:** Link to relevant job postings
5. **Salary Data:** Update regularly for accuracy

## 🐛 Common Issues

**Issue:** CV not saving
**Fix:** Check user authentication and RLS policies

**Issue:** Salary insights returning null
**Fix:** Ensure salary_data table has relevant entries

**Issue:** Career paths not suggesting
**Fix:** User needs completed profile with current_job_title

## 📈 Analytics to Track

- CVs created per user
- Cover letters generated
- Assessments completed
- Career goals set
- Salary searches performed
- Template usage
- Feature engagement time

## 🚀 Next Steps

1. Implement PDF generation for CVs
2. Add AI-powered cover letter enhancement
3. Create assessment interface with timer
4. Integrate career paths with job recommendations
5. Add real-time salary data API
6. Build skill gap analysis
7. Create mentor matching system

---

**Need Help?** Check `PHASE_5.1_CAREER_TOOLS.md` for detailed documentation.
