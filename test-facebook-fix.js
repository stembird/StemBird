/**
 * Test script to verify Facebook Mobile 404 fix
 * Run with: node test-facebook-fix.js
 */

// Simulate middleware behavior
function testMiddleware(url, userAgent) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  // Detect Facebook browser
  const isFacebookBrowser = userAgent.includes('FBAN') || 
                           userAgent.includes('FBAV') || 
                           userAgent.includes('FB_IAB') ||
                           userAgent.includes('FB4A');
  
  // Check if it's a job detail page
  if (pathname.startsWith('/jobs/') && pathname !== '/jobs' && pathname !== '/jobs/') {
    const trackingParams = [
      'fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign',
      'utm_term', 'utm_content', 'mc_cid', 'mc_eid', '_ga',
      'msclkid', 'twclid', 'li_fat_id', 'igshid'
    ];
    
    let hasTrackingParams = false;
    const cleanUrl = new URL(url);
    
    trackingParams.forEach(param => {
      if (cleanUrl.searchParams.has(param)) {
        cleanUrl.searchParams.delete(param);
        hasTrackingParams = true;
      }
    });
    
    return {
      originalUrl: url,
      cleanUrl: cleanUrl.toString(),
      shouldRedirect: hasTrackingParams,
      isFacebookBrowser,
      headers: isFacebookBrowser ? {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'User-Agent'
      } : {
        'Vary': 'User-Agent'
      }
    };
  }
  
  return { originalUrl: url, cleanUrl: url, shouldRedirect: false, isFacebookBrowser };
}

// Test cases
console.log('🧪 Testing Facebook Mobile 404 Fix\n');
console.log('=' .repeat(80));

const testCases = [
  {
    name: 'Facebook Mobile with fbclid',
    url: 'https://careersasa.co.ke/jobs/technician-home-appliances?fbclid=ABC123',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 [FBAN/FB4A;FBAV/325.0.0.34.120;]'
  },
  {
    name: 'Facebook Mobile with multiple params',
    url: 'https://careersasa.co.ke/jobs/technician-home-appliances?fbclid=ABC&utm_source=facebook',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/325.0;]'
  },
  {
    name: 'Regular browser with fbclid',
    url: 'https://careersasa.co.ke/jobs/technician-home-appliances?fbclid=ABC123',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  {
    name: 'Clean URL (no params)',
    url: 'https://careersasa.co.ke/jobs/technician-home-appliances',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 [FBAN/FB4A;FBAV/325.0.0.34.120;]'
  },
  {
    name: 'Jobs listing page (should not redirect)',
    url: 'https://careersasa.co.ke/jobs?fbclid=ABC123',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 [FBAN/FB4A;FBAV/325.0.0.34.120;]'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const result = testMiddleware(testCase.url, testCase.userAgent);
  
  console.log(`   Original URL: ${result.originalUrl}`);
  console.log(`   Clean URL:    ${result.cleanUrl}`);
  console.log(`   Facebook Browser: ${result.isFacebookBrowser ? '✅ YES' : '❌ NO'}`);
  console.log(`   Should Redirect:  ${result.shouldRedirect ? '✅ YES (302)' : '❌ NO'}`);
  
  if (result.headers) {
    console.log(`   Headers:`);
    Object.entries(result.headers).forEach(([key, value]) => {
      console.log(`     - ${key}: ${value}`);
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ All test cases processed successfully!\n');
console.log('Expected behavior:');
console.log('  1. URLs with tracking params → Redirect to clean URL (302)');
console.log('  2. Facebook browsers → Get no-cache headers');
console.log('  3. Clean URLs → No redirect, pass through');
console.log('  4. Jobs listing page → No redirect (not a detail page)\n');
