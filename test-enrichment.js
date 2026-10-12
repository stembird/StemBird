// Test job enrichment with tips, FAQs, and career growth
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Test with a scanty job posting
const scantyJobText = `Marketing Assistant - XYZ Ltd
Location: Nairobi
Salary: KES 40,000 - 60,000/month

We need a marketing assistant.

Requirements:
- Diploma in Marketing
- 1 year experience

How to Apply:
Email CV to jobs@xyzltd.co.ke by Dec 31, 2025`;

async function testEnrichment() {
  console.log('🧪 Testing Job Enrichment with Tips, FAQs & Career Growth\n');
  console.log('Original Job Text (Scanty):');
  console.log(scantyJobText);
  console.log('\n' + '='.repeat(80) + '\n');

  const systemPrompt = `You are a job posting parser and enrichment specialist. Extract structured information from job postings and return ONLY valid JSON.

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown, no explanations
2. All text fields should be clean HTML (use <p>, <ul>, <li>, <strong>, <em> tags only)
3. For employment_type, use ONLY: FULL_TIME, PART_TIME, CONTRACTOR, INTERN, TEMPORARY, VOLUNTEER
4. For job_location_type, use ONLY: ON_SITE, REMOTE, HYBRID
5. For experience_level, use ONLY: Entry, Mid, Senior, Managerial, Internship
6. For salary_period, use ONLY: HOUR, DAY, WEEK, MONTH, YEAR
7. For salary_currency, use ONLY: KES, USD

ENRICHMENT RULES (for description and responsibilities fields):
- If description is scanty (less than 100 words), enrich it with relevant context about the role WITHOUT inventing facts
- If responsibilities are scanty (less than 3 items), expand with typical responsibilities for this role
- DO NOT invent or change: salary, expiry date, location, company name, or any specific facts from the original text
- Only enrich with general industry-standard information that would apply to this type of role

ADDITIONAL_INFO FIELD (CRITICAL - COMPREHENSIVE CONTENT):
The additional_info field should ONLY contain the following sections in HTML format:

1. HOW TO APPLY (if present in original text):
   - Extract application instructions, email, link, deadline from the job posting
   - Format: "<p><strong>How to Apply:</strong></p><ul><li>Send your CV to email@company.com</li><li>Application deadline: Date</li></ul>"

2. APPLICATION & INTERVIEW TIPS (ALWAYS GENERATE - 8 TIPS):
   - Start with: "<h3>Application & Interview Tips for [Job Title]</h3>"
   - Brief enticing intro paragraph (2-3 sentences) about succeeding in this application
   - Then exactly 8 detailed tips, each with:
     * Tip number and heading in <strong>
     * 3-4 sentences explaining the tip in detail
     * A concrete, specific example in <em>
   - Format each tip as: "<p><strong>1. Research the Company:</strong> Explanation text here. More details. Even more context. <em>Example: Specific concrete example here.</em></p>"

3. FREQUENTLY ASKED QUESTIONS (ALWAYS GENERATE - 4 FAQs):
   - Start with: "<h3>Frequently Asked Questions</h3>"
   - Generate 4 relevant FAQs about this specific job role, industry, or application process
   - Each FAQ should have a question and a detailed 2-3 sentence answer
   - Format: "<p><strong>Q: Question here?</strong><br>A: Answer with 2-3 sentences providing helpful information.</p>"

4. SALARY & CAREER GROWTH PROJECTION (ALWAYS GENERATE):
   - Start with: "<h3>Salary & Career Growth Projection</h3>"
   - First paragraph: Discuss typical salary ranges for this role in Kenya (entry to senior level)
   - Second paragraph: Outline career progression path over 3-5 years
   - Third paragraph: Discuss growth opportunities in this industry/company type
   - Format: "<p>Paragraph about salary ranges...</p><p>Paragraph about career progression...</p><p>Paragraph about industry growth...</p>"

Parse this job posting and return ONLY the JSON object:

${scantyJobText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    console.log('📡 Calling Gemini API...\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt }]
        }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 8000 
        }
      }),
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      const errorText = await response.text();
      console.log(errorText);
      return;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.log('❌ No response content');
      return;
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(cleanContent);

    console.log('✅ PARSING SUCCESSFUL\n');
    console.log('=' .repeat(80));
    console.log('\n📋 ENRICHED FIELDS:\n');
    
    console.log('1️⃣  DESCRIPTION (enriched if scanty):');
    console.log(parsed.description || 'NOT FOUND');
    console.log('\n' + '-'.repeat(80) + '\n');
    
    console.log('2️⃣  RESPONSIBILITIES (enriched if scanty):');
    console.log(parsed.responsibilities || 'NOT FOUND');
    console.log('\n' + '-'.repeat(80) + '\n');
    
    console.log('3️⃣  ADDITIONAL INFO (comprehensive content):');
    if (parsed.additional_info) {
      console.log(parsed.additional_info);
      console.log('\n' + '-'.repeat(80) + '\n');
      
      // Validate content
      const checks = {
        'Has "How to Apply" section': parsed.additional_info.includes('How to Apply'),
        'Has H3 heading for tips': parsed.additional_info.includes('<h3>Application & Interview Tips'),
        'Has intro paragraph': parsed.additional_info.match(/<p>(?!<strong>).*?<\/p>/),
        'Has 8 tips': (parsed.additional_info.match(/<strong>\d+\./g) || []).length >= 8,
        'Tips have examples': parsed.additional_info.includes('<em>Example:'),
        'Has FAQ section': parsed.additional_info.includes('<h3>Frequently Asked Questions'),
        'Has 4 FAQs': (parsed.additional_info.match(/<strong>Q:/g) || []).length >= 4,
        'Has Salary & Career Growth': parsed.additional_info.includes('<h3>Salary & Career Growth'),
        'Has career progression info': parsed.additional_info.toLowerCase().includes('career') || parsed.additional_info.toLowerCase().includes('growth'),
      };
      
      console.log('📊 CONTENT VALIDATION:\n');
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      });
      
      const passedChecks = Object.values(checks).filter(v => v).length;
      const totalChecks = Object.keys(checks).length;
      
      console.log(`\n🎯 Score: ${passedChecks}/${totalChecks} checks passed`);
      
      if (passedChecks >= 8) {
        console.log('🎉 EXCELLENT - All enrichment content generated!');
      } else if (passedChecks >= 5) {
        console.log('⚠️  GOOD - Most enrichment content present');
      } else {
        console.log('❌ NEEDS IMPROVEMENT - Missing key enrichment content');
      }
      
    } else {
      console.log('❌ additional_info field is MISSING!');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📄 FULL PARSED OBJECT:\n');
    console.log(JSON.stringify(parsed, null, 2));

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

testEnrichment();
