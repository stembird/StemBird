// Test script for the optimized job parser
// Run with: node test-optimized-parser.js

const testJobText = `Software Engineer at TechCorp Kenya
Location: Nairobi, Kenya
Type: Full-time, On-site
Salary: KES 80,000 - 120,000 per month

About the role:
We are looking for a talented Software Engineer to join our growing team in Nairobi.

Responsibilities:
- Develop and maintain web applications using React and Node.js
- Collaborate with cross-functional teams
- Write clean, maintainable code

Requirements:
- Bachelor's degree in Computer Science
- 3+ years of experience in software development
- Proficiency in React, Node.js, and TypeScript

How to Apply:
Send your CV to careers@techcorp.co.ke`;

async function testDirectParsing() {
  console.log('🧪 Testing Direct Parsing...');
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/parse-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobText: testJobText })
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log('✅ Direct parsing successful!');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📊 Cached: ${result.cached ? 'Yes' : 'No'}`);
      console.log(`🤖 Model: ${result.modelUsed || 'Unknown'}`);
      console.log(`📝 Title: ${result.data.title}`);
      console.log(`🏢 Company: ${result.data.company}`);
    } else {
      console.log('❌ Direct parsing failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Direct parsing error:', error.message);
  }
}

async function testAsyncParsing() {
  console.log('\n🧪 Testing Async Parsing...');
  
  try {
    // Queue the job
    const response = await fetch('http://localhost:3000/api/parse-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobText: testJobText, async: true })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Job queued successfully!');
      console.log(`🆔 Job ID: ${result.jobId}`);
      
      // Poll for status
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`http://localhost:3000/api/parse-job/status?jobId=${result.jobId}`);
        const statusResult = await statusResponse.json();
        
        console.log(`📊 Status: ${statusResult.status} (${statusResult.progress || 0}%)`);
        
        if (statusResult.status === 'completed') {
          console.log('✅ Async parsing completed!');
          console.log(`📝 Title: ${statusResult.result.title}`);
          console.log(`🏢 Company: ${statusResult.result.company}`);
          break;
        }
        
        if (statusResult.status === 'failed') {
          console.log('❌ Async parsing failed:', statusResult.error);
          break;
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('⏰ Async parsing timed out');
      }
    } else {
      console.log('❌ Failed to queue job:', result.error);
    }
  } catch (error) {
    console.log('❌ Async parsing error:', error.message);
  }
}

async function testCachePerformance() {
  console.log('\n🧪 Testing Cache Performance...');
  
  // First request (should be slow)
  console.log('📡 First request (no cache)...');
  const start1 = Date.now();
  const response1 = await fetch('http://localhost:3000/api/parse-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobText: testJobText })
  });
  const result1 = await response1.json();
  const duration1 = Date.now() - start1;
  
  console.log(`⏱️  First request: ${duration1}ms (cached: ${result1.cached})`);
  
  // Second request (should be fast from cache)
  console.log('📡 Second request (should be cached)...');
  const start2 = Date.now();
  const response2 = await fetch('http://localhost:3000/api/parse-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobText: testJobText })
  });
  const result2 = await response2.json();
  const duration2 = Date.now() - start2;
  
  console.log(`⏱️  Second request: ${duration2}ms (cached: ${result2.cached})`);
  
  if (result2.cached && duration2 < duration1 * 0.1) {
    console.log('✅ Cache is working! Significant speed improvement detected.');
  } else {
    console.log('⚠️  Cache might not be working as expected.');
  }
}

async function runTests() {
  console.log('🚀 Starting Optimized Job Parser Tests\n');
  
  // Test direct parsing
  await testDirectParsing();
  
  // Test async parsing
  await testAsyncParsing();
  
  // Test cache performance
  await testCachePerformance();
  
  console.log('\n✨ Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testDirectParsing, testAsyncParsing, testCachePerformance };