// Test specifically for additional_info field extraction
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const jobText = `Senior Accountant - ABC Company Ltd
Location: Nairobi, Kenya
Salary: KES 100,000 - 150,000 per month

Requirements:
- Bachelor's degree in Accounting (CPA-K required)
- 5+ years experience in financial reporting
- Proficiency in QuickBooks and Excel

Responsibilities:
- Prepare monthly financial statements
- Manage accounts payable and receivable
- Ensure compliance with tax regulations

How to Apply:
Qualified candidates should submit the following documents:
1. Updated CV
2. Cover letter
3. Copies of academic certificates
4. CPA-K certificate

Send all documents to: recruitment@abccompany.co.ke
Subject line: "Senior Accountant Application"

Application Deadline: January 31, 2026

Only shortlisted candidates will be contacted.
For inquiries, call: +254 700 123 456`;

async function testAdditionalInfo() {
  console.log('🧪 Testing additional_info Field Extraction\n');
  console.log('Job Text Preview:');
  console.log(jobText.substring(0, 200) + '...\n');
  console.log('='.repeat(70) + '\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a job posting parser. Extract structured information and return ONLY valid JSON.

CRITICAL: Extract additional_info field with ALL application instructions as HTML.
Look for: "How to Apply", "Application Process", "Send CV to", "Application Deadline", "Contact"

Include:
- Required documents
- Email addresses
- Phone numbers
- Deadlines
- Any special instructions

Format as clean HTML with <p>, <ul>, <li>, <strong> tags.

Parse this job posting:

${jobText}`
          }]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
      }),
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
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
    console.log('📋 Key Fields Extracted:');
    console.log(`  Title: ${parsed.title || 'NOT FOUND'}`);
    console.log(`  Company: ${parsed.company || 'NOT FOUND'}`);
    console.log(`  Education Level ID: ${parsed.education_level_id || 'NOT FOUND'}`);
    console.log(`  Location: ${parsed.job_location_city || 'NOT FOUND'}, ${parsed.job_location_county || 'NOT FOUND'}`);
    console.log(`  Apply Email: ${parsed.apply_email || 'NOT FOUND'}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📝 ADDITIONAL_INFO FIELD (Application Instructions):\n');
    
    if (parsed.additional_info) {
      console.log('✅ Field Found!\n');
      console.log('Raw HTML:');
      console.log(parsed.additional_info);
      console.log('\n' + '-'.repeat(70));
      
      // Check for key elements
      const checks = {
        'Contains "How to Apply"': parsed.additional_info.includes('How to Apply') || parsed.additional_info.includes('apply'),
        'Contains email': parsed.additional_info.includes('recruitment@abccompany.co.ke'),
        'Contains deadline': parsed.additional_info.includes('January 31') || parsed.additional_info.includes('Deadline'),
        'Contains required documents': parsed.additional_info.includes('CV') || parsed.additional_info.includes('certificate'),
        'Contains phone number': parsed.additional_info.includes('+254') || parsed.additional_info.includes('700'),
        'Is HTML formatted': parsed.additional_info.includes('<p>') || parsed.additional_info.includes('<ul>')
      };
      
      console.log('\nContent Validation:');
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      });
      
      const passedChecks = Object.values(checks).filter(v => v).length;
      const totalChecks = Object.keys(checks).length;
      
      console.log(`\n📊 Score: ${passedChecks}/${totalChecks} checks passed`);
      
      if (passedChecks >= 4) {
        console.log('🎉 EXCELLENT - Application info fully extracted!');
      } else if (passedChecks >= 2) {
        console.log('⚠️  PARTIAL - Some application info extracted');
      } else {
        console.log('❌ POOR - Application info not properly extracted');
      }
      
    } else {
      console.log('❌ additional_info field is MISSING or EMPTY!');
      console.log('\nFull parsed object:');
      console.log(JSON.stringify(parsed, null, 2));
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testAdditionalInfo();
