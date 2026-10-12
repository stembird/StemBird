// Test job enrichment with tips, FAQs, and career growth using OpenRouter
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

ENRICHMENT RULES (for description and responsibilities fields):
- If description is scanty (less than 100 words), enrich it with relevant context about the role WITHOUT inventing facts
- If responsibilities are scanty (less than 3 items), expand with typical responsibilities for this role
- DO NOT invent or change: salary, expiry date, location, company name, or any specific facts from the original text

ADDITIONAL_INFO FIELD (CRITICAL):
The additional_info field should ONLY contain:

1. HOW TO APPLY (if present):
   Format: "<p><strong>How to Apply:</strong></p><ul><li>Send CV to email@company.com</li><li>Deadline: Date</li></ul>"

2. APPLICATION & INTERVIEW TIPS (8 TIPS):
   - Start with: "<h3>Application & Interview Tips for [Job Title]</h3>"
   - Brief enticing intro (2-3 sentences)
   - 8 detailed tips with 3-4 sentences each plus example in <em>
   - Format: "<p><strong>1. Tip Title:</strong> Explanation. <em>Example: Specific example.</em></p>"

3. FAQs (4 QUESTIONS):
   - Start with: "<h3>Frequently Asked Questions</h3>"
   - Format: "<p><strong>Q: Question?</strong><br>A: 2-3 sentence answer.</p>"

4. SALARY & CAREER GROWTH:
   - Start with: "<h3>Salary & Career Growth Projection</h3>"
   - 3 paragraphs: salary ranges, career path, industry growth

Return ONLY valid JSON.`;

  const url = "https://openrouter.ai/api/v1/chat/completions";

  try {
    console.log('📡 Calling OpenRouter API...\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://careerninja.co.ke',
        'X-Title': 'CareerNinja Job Parser Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this job posting:\n\n${scantyJobText}` }
        ],
        temperature: 0.1,
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      const errorText = await response.text();
      console.log(errorText);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
    console.log('='.repeat(80));
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
