// Test script to verify Gemini API works
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

console.log('✓ API Key found:', GEMINI_API_KEY.substring(0, 10) + '...');

const testJobText = `Software Engineer at TechCorp Kenya
Location: Nairobi, Kenya (Westlands Office)
Type: Full-time, On-site
Salary: KES 80,000 - 120,000 per month

About the role:
We are looking for a talented Software Engineer to join our growing team in Nairobi.

Responsibilities:
- Develop web applications using React and Node.js
- Write clean, maintainable code
- Collaborate with cross-functional teams

Requirements:
- Bachelor's degree in Computer Science or related field
- 3+ years of professional experience
- Strong skills in React, Node.js, and TypeScript
- Excellent communication skills in English

How to Apply:
Interested candidates should send their CV and cover letter to careers@techcorp.co.ke with the subject line "Software Engineer Application".
Application deadline: December 31, 2025.

Only shortlisted candidates will be contacted.`;

const systemPrompt = `You are a job posting parser. Extract structured information and return ONLY valid JSON.

CRITICAL: Extract these fields:
- education_level_id: "1"=Certificate, "2"=Diploma, "3"=Bachelor's, "4"=Master's, "5"=PhD
- job_location_county: County name (e.g., "Nairobi", "Mombasa")
- job_location_city: City/area name (e.g., "Westlands", "Nairobi")
- additional_info: Application instructions as HTML

Return JSON in this structure:
{
  "title": "Job Title",
  "company": "Company Name",
  "employment_type": "FULL_TIME",
  "job_location_country": "Kenya",
  "job_location_county": "Nairobi",
  "job_location_city": "Westlands",
  "education_level_id": "3",
  "additional_info": "<p><strong>How to Apply:</strong></p><ul><li>Send CV to email</li></ul>"
}`;

async function listModels() {
  console.log('\n📋 Listing available models...\n');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(model => {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`  - ${model.name}`);
        }
      });
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

async function testGemini() {
  await listModels();
  
  console.log('\n🧪 Testing Gemini API...\n');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nParse this job posting:\n\n${testJobText}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        }
      }),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:');
      console.error(errorText);
      return;
    }

    const data = await response.json();
    console.log('✓ Gemini API Success!\n');
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (content) {
      console.log('📝 Response:');
      console.log(content);
      
      // Try to parse as JSON
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const parsed = JSON.parse(cleanContent);
        console.log('\n✓ Successfully parsed JSON:');
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('\n⚠️  Response is not valid JSON');
      }
    } else {
      console.log('⚠️  No content in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();
