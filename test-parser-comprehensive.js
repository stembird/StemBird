// Comprehensive test for education, location, and application info parsing
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const testCases = [
  {
    name: "Test 1: Bachelor's Degree + Nairobi + Email Application",
    jobText: `Marketing Manager at Safaricom PLC
Location: Nairobi, Kenya
Employment Type: Full-time

Requirements:
- Bachelor's degree in Marketing or Business
- 5+ years experience in marketing
- Strong communication skills

How to Apply:
Send your CV to jobs@safaricom.co.ke by January 15, 2026.`,
    expectedEducation: "3",
    expectedCounty: "Nairobi",
    expectedHasApplicationInfo: true
  },
  {
    name: "Test 2: Diploma + Mombasa + Application Link",
    jobText: `Hotel Receptionist - Serena Hotels
Based in Mombasa, Coast Region

Qualifications:
- Diploma in Hospitality Management
- 2 years experience
- Fluent in English and Swahili

To Apply:
Visit our careers portal at https://serenahotels.com/careers
Deadline: February 28, 2026`,
    expectedEducation: "2",
    expectedCounty: "Mombasa",
    expectedHasApplicationInfo: true
  },
  {
    name: "Test 3: Master's Degree + Kisumu + Multiple Application Methods",
    jobText: `Research Scientist - KEMRI
Location: Kisumu, Nyanza Region
Type: Contract

Requirements:
- Master's degree or PhD in Public Health
- Research experience required

Application Process:
1. Email CV to recruitment@kemri.org
2. Or apply online at www.kemri.org/jobs
3. Include 3 references
Application closes: March 31, 2026`,
    expectedEducation: "4",
    expectedCounty: "Kisumu",
    expectedHasApplicationInfo: true
  }
];

async function testParser() {
  console.log('🧪 COMPREHENSIVE PARSER TEST\n');
  console.log('Testing: Education Level, Location, Application Info\n');
  console.log('='.repeat(60) + '\n');

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('-'.repeat(60));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract job information and return ONLY JSON with these fields:
- education_level_id: "1"=Certificate, "2"=Diploma, "3"=Bachelor's, "4"=Master's, "5"=PhD
- job_location_county: County name
- job_location_city: City name
- additional_info: Application instructions as HTML
- apply_email: Email if mentioned
- apply_link: URL if mentioned

Job posting:
${testCase.jobText}`
            }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        }),
      });

      if (!response.ok) {
        console.log(`❌ API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.log('❌ No response content');
        continue;
      }

      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanContent);

      // Verify results
      console.log(`\n✓ Parsed Successfully`);
      console.log(`  Education Level: ${parsed.education_level_id || 'NOT FOUND'} ${parsed.education_level_id === testCase.expectedEducation ? '✅' : '❌ Expected: ' + testCase.expectedEducation}`);
      console.log(`  County: ${parsed.job_location_county || 'NOT FOUND'} ${parsed.job_location_county === testCase.expectedCounty ? '✅' : '⚠️'}`);
      console.log(`  City: ${parsed.job_location_city || 'NOT FOUND'}`);
      console.log(`  Application Info: ${parsed.additional_info ? '✅ Found' : '❌ NOT FOUND'}`);
      console.log(`  Apply Email: ${parsed.apply_email || 'Not found'}`);
      console.log(`  Apply Link: ${parsed.apply_link || 'Not found'}`);

      if (parsed.additional_info) {
        console.log(`\n  Application Details:`);
        console.log(`  ${parsed.additional_info.substring(0, 150)}...`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test Complete!\n');
}

testParser();
