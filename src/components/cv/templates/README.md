# CV Templates

Professional CV templates for Kenyan job seekers, designed to be ATS-friendly and print-ready.

## Available Templates

### Professional CV Templates

These templates are designed for experienced professionals with established careers, emphasizing work history, achievements, and leadership.

#### 1. Classic Professional Template

A clean, single-column CV template suitable for most professional roles in Kenya.

**Features:**
- ✅ ATS-friendly (no complex tables or graphics)
- ✅ A4 size (794px × 1123px)
- ✅ Single-column layout
- ✅ Professional typography (system fonts)
- ✅ Print-optimized
- ✅ Tailwind CSS styling
- ✅ TypeScript support

**Best for:**
- Administrative roles
- Management positions
- Corporate jobs
- Government applications
- Entry to mid-level positions

#### 2. Modern Professional Template

A stylized two-column design with blue accents and modern aesthetics.

**Features:**
- ✅ Two-column layout (sidebar + main content)
- ✅ Color accents for visual appeal
- ✅ Skills and tools sidebar
- ✅ Modern typography
- ✅ ATS-friendly structure

**Best for:**
- Marketing positions
- Corporate roles
- Creative industries
- Mid-level professionals

#### 3. Executive Leadership Template

A premium layout emphasizing leadership achievements and strategic impact.

**Features:**
- ✅ Leadership-focused sections
- ✅ Board memberships section
- ✅ Strategic initiatives highlight
- ✅ Professional serif typography
- ✅ Executive-level presentation

**Best for:**
- Directors and C-level executives
- Senior management
- Board positions
- Strategic leadership roles

---

### Entry-Level / Graduate CV Templates

These templates are specifically designed for students, fresh graduates, and entry-level candidates with limited work experience. They emphasize education, skills, potential, and transferable competencies rather than extensive work history.

#### 4. Graduate Starter CV Template

Education-focused layout prioritizing academic projects, internships, and extracurricular activities.

**Features:**
- ✅ Education-first structure
- ✅ Academic projects section
- ✅ Internship/industrial attachment section
- ✅ Extracurricular activities
- ✅ Career objective statement
- ✅ Skills showcase
- ✅ ATS-friendly

**Best for:**
- Fresh graduates
- University students
- Internship applicants
- Entry-level job seekers
- Recent diploma holders

#### 5. Skills-Based (Functional) Template

Emphasizes skills and competencies instead of chronological work history.

**Features:**
- ✅ Skills-first structure
- ✅ Core competencies section
- ✅ Professional skills categories
- ✅ Brief work experience summary
- ✅ Transferable skills focus
- ✅ ATS-friendly

**Best for:**
- Career changers
- Candidates with employment gaps
- Entry-level candidates with transferable skills
- People transitioning industries
- Those with diverse experience backgrounds

#### 6. Internship / Industrial Attachment Template

Student-focused template emphasizing education, technical skills, and potential over work experience.

**Features:**
- ✅ Education-first layout
- ✅ Career objective section
- ✅ Technical skills showcase
- ✅ Academic projects section
- ✅ Industrial attachment/internship section
- ✅ Extracurricular activities
- ✅ Referees section
- ✅ ATS-friendly

**Best for:**
- Students seeking industrial attachment
- Internship applicants
- Technical college students
- Diploma students
- TVET graduates
- Entry-level candidates with limited work experience

## Usage

### Basic Implementation

```tsx
import ClassicTemplate from '@/components/cv/templates/ClassicTemplate';

const cvData = {
  name: "John Mwangi Kariuki",
  title: "Administrative Officer",
  contact: {
    phone: "+254712345678",
    email: "johnmwangi@email.com",
    linkedin: "linkedin.com/in/johnmwangi",
    location: "Nairobi, Kenya"
  },
  profile: "Results-driven professional with 5+ years experience...",
  skills: [
    "Office Administration",
    "Records Management",
    "Customer Service"
  ],
  experience: [
    {
      jobTitle: "Administrative Officer",
      company: "ABC Logistics Ltd",
      location: "Nairobi",
      dates: "March 2021 – Present",
      details: [
        "Coordinate daily office operations",
        "Prepare reports and meeting minutes",
        "Manage document filing systems"
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor of Business Administration",
      institution: "University of Nairobi",
      dates: "2014 – 2018"
    }
  ],
  certifications: [
    "Certificate in Project Management – Kenya Institute of Management, 2020"
  ]
};

function MyCV() {
  return <ClassicTemplate data={cvData} />;
}
```

### Data Structure

```typescript
interface CVData {
  name: string;                    // Full name
  title: string;                   // Job title/position
  contact: {
    phone: string;                 // Phone number (e.g., +254712345678)
    email: string;                 // Email address
    linkedin?: string;             // LinkedIn profile (optional)
    location: string;              // City/location (e.g., "Nairobi, Kenya")
  };
  profile: string;                 // Professional summary paragraph
  skills: string[];                // Array of skills
  experience: Array<{
    jobTitle: string;              // Position title
    company: string;               // Company name
    location: string;              // Work location
    dates: string;                 // Employment period
    details: string[];             // Responsibilities/achievements
  }>;
  education: Array<{
    degree: string;                // Degree/qualification
    institution: string;           // School/university name
    dates: string;                 // Study period
  }>;
  certifications?: string[];       // Optional certifications
  referees?: string;               // Optional referees text
}
```

## Printing to PDF

### Browser Print Method

1. Open the CV in your browser
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. Configure print settings:
   - **Destination:** Save as PDF
   - **Paper size:** A4
   - **Margins:** Default or None
   - **Scale:** 100%
   - **Background graphics:** Enabled
   - **Headers and footers:** Disabled
4. Click "Save" or "Print"

### Programmatic PDF Generation

For server-side PDF generation, consider using:

```bash
npm install puppeteer
# or
npm install @react-pdf/renderer
```

Example with Puppeteer:

```typescript
import puppeteer from 'puppeteer';

async function generatePDF(htmlContent: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent);
  await page.pdf({
    path: 'cv.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  
  await browser.close();
}
```

## Customization

### Styling

The template uses Tailwind CSS classes. To customize:

```tsx
// Change header color
<h1 className="text-4xl font-bold text-blue-900">

// Adjust spacing
<section className="mb-10">

// Modify font size
<p className="text-base">
```

### Adding Sections

To add a new section (e.g., Languages):

```tsx
{/* Languages Section */}
<section className="mb-7">
  <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
    Languages
  </h2>
  <ul className="space-y-1.5">
    {data.languages?.map((lang, index) => (
      <li key={index} className="text-sm text-gray-700">
        <span className="font-medium">{lang.name}:</span> {lang.proficiency}
      </li>
    ))}
  </ul>
</section>
```

## Best Practices for Kenyan CVs

### Content Guidelines

1. **Contact Information**
   - Use Kenyan phone format: +254712345678
   - Include Nairobi or specific county
   - LinkedIn is optional but recommended

2. **Professional Summary**
   - Keep to 3-4 sentences
   - Highlight years of experience
   - Mention key achievements

3. **Experience**
   - List most recent first
   - Use action verbs (Coordinated, Managed, Implemented)
   - Quantify achievements where possible
   - Include company location

4. **Education**
   - Include KCSE if recent graduate
   - Mention university name clearly
   - Add relevant coursework if applicable

5. **Skills**
   - List 6-12 relevant skills
   - Include both technical and soft skills
   - Match job description keywords

6. **Certifications**
   - Include institution name
   - Add year of completion
   - Prioritize recognized Kenyan institutions

7. **Referees**
   - "Available upon request" is standard
   - Or list 2-3 professional references with contact details

### ATS Optimization

- ✅ Use standard section headings
- ✅ Avoid images, charts, and graphics
- ✅ Use simple bullet points
- ✅ Include relevant keywords from job description
- ✅ Use standard fonts
- ✅ Avoid tables and columns for main content
- ✅ Save as PDF (not Word doc)

## Troubleshooting

### PDF looks different from browser preview

- Ensure "Background graphics" is enabled in print settings
- Check that margins are set correctly
- Verify paper size is A4

### Content overflows page

- Reduce content in each section
- Decrease font sizes slightly
- Adjust padding/margins
- Consider a two-page CV if necessary

### Skills section looks unbalanced

- Aim for even number of skills (8, 10, 12)
- Or adjust grid columns: `grid-cols-3` for more columns

## Support

For issues or feature requests, please contact the development team or create an issue in the project repository.

## License

This template is part of the CareerSasa platform and is subject to the project's license terms.
