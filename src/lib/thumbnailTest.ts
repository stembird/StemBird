/**
 * Test utility for verifying thumbnail generation with various job types
 */

import { getModelForJob } from '@/lib/jobIndustryModel';

// Test cases for different job categories
const testCases = [
  // Healthcare jobs
  { title: 'Medical Doctor', company: 'Kenyatta Hospital', expected: 'healthcare' },
  { title: 'Nurse', company: 'Aga Khan Hospital', expected: 'healthcare' },
  { title: 'Dentist', company: 'Smile Dental Clinic', expected: 'healthcare' },
  
  // Technology jobs
  { title: 'Software Engineer', company: 'TechCorp Kenya', expected: 'technology' },
  { title: 'Data Analyst', company: 'Data Solutions Ltd', expected: 'technology' },
  { title: 'Network Administrator', company: 'Safaricom', expected: 'technology' },
  
  // Education jobs
  { title: 'High School Teacher', company: 'Kenya High School', expected: 'education' },
  { title: 'University Professor', company: 'University of Nairobi', expected: 'education' },
  { title: 'Research Scientist', company: 'KARI', expected: 'science' },
  
  // Finance jobs
  { title: 'Accountant', company: 'KPMG Kenya', expected: 'finance' },
  { title: 'Financial Analyst', company: 'Equity Bank', expected: 'finance' },
  { title: 'Stock Broker', company: 'Nairobi Securities Exchange', expected: 'finance' },
  
  // Agriculture jobs
  { title: 'Agricultural Officer', company: 'Ministry of Agriculture', expected: 'agriculture' },
  { title: 'Tea Plantation Manager', company: 'Kericho Tea Company', expected: 'agriculture' },
  { title: 'Fisheries Officer', company: 'Lake Victoria Fisheries', expected: 'agriculture' },
  
  // Construction jobs
  { title: 'Civil Engineer', company: 'Bamburi Cement', expected: 'engineering' },
  { title: 'Architect', company: 'Design Studio Kenya', expected: 'construction' },
  { title: 'Carpenter', company: 'Home Builders Ltd', expected: 'construction' },
  
  // Hospitality jobs
  { title: 'Hotel Manager', company: 'Serena Hotel', expected: 'hospitality' },
  { title: 'Chef', company: 'Carnivore Restaurant', expected: 'food-services' },
  { title: 'Tour Guide', company: 'Kenya Wildlife Service', expected: 'tourism' },
  
  // Retail jobs
  { title: 'Sales Associate', company: 'Nakumatt', expected: 'retail' },
  { title: 'Store Manager', company: 'Uchumi Supermarket', expected: 'retail' },
  { title: 'Customer Service Rep', company: 'Shopmart', expected: 'customer-service' },
  
  // Government jobs
  { title: 'County Administrator', company: 'Nairobi County', expected: 'government' },
  { title: 'Police Officer', company: 'Kenya Police', expected: 'government' },
  { title: 'Parliamentary Assistant', company: 'Kenya Parliament', expected: 'government' },
  
  // Creative jobs
  { title: 'Graphic Designer', company: 'Creative Agency', expected: 'creative' },
  { title: 'Music Producer', company: 'Benga Records', expected: 'creative' },
  { title: 'Film Director', company: 'Nollywood Kenya', expected: 'creative' },
  
  // NGO jobs
  { title: 'Program Manager', company: 'Amref Health Africa', expected: 'professional' },
  { title: 'Community Development Officer', company: 'World Vision Kenya', expected: 'community' },
  { title: 'Humanitarian Coordinator', company: 'UNICEF Kenya', expected: 'community' },
  
  // Default professional
  { title: 'Operations Manager', company: 'Generic Company', expected: 'professional' },
  { title: 'Business Consultant', company: 'Consulting Firm', expected: 'professional' },
];

export function testThumbnailGeneration(): void {
  console.log('Testing thumbnail generation with various job types...\n');
  
  let passedTests = 0;
  const totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const result = getModelForJob(testCase.title, testCase.company);
    const passed = result === testCase.expected;
    
    if (passed) {
      passedTests++;
    }
    
    console.log(
      `${index + 1}. ${testCase.title} at ${testCase.company}\n` +
      `   Expected: ${testCase.expected}, Got: ${result} ${passed ? '✅' : '❌'}\n`
    );
  });
  
  console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Thumbnail generation is working correctly.');
  } else {
    console.log('❌ Some tests failed. Please review the implementation.');
  }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  testThumbnailGeneration();
}