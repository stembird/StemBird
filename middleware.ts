import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Detect Facebook in-app browser
  const isFacebookBrowser = userAgent.includes('FBAN') || 
                           userAgent.includes('FBAV') || 
                           userAgent.includes('FB_IAB') ||
                           userAgent.includes('FB4A');
  
  // Process job and scholarship detail pages
  const isDetailPath =
    (pathname.startsWith('/jobs/') && pathname !== '/jobs' && pathname !== '/jobs/') ||
    (pathname.startsWith('/scholarships/') && pathname !== '/scholarships' && pathname !== '/scholarships/');

  if (isDetailPath) {
    const url = request.nextUrl.clone();
    
    // List of tracking parameters to remove
    const trackingParams = [
      'fbclid',
      'gclid',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'mc_cid',
      'mc_eid',
      '_ga',
      'msclkid',
      'twclid',
      'li_fat_id',
      'igshid'
    ];
    
    // Check if any tracking parameters exist
    let hasTrackingParams = false;
    trackingParams.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        hasTrackingParams = true;
      }
    });
    
    // Create response
    let response: NextResponse;
    
    // If tracking params were found, redirect to clean URL
    if (hasTrackingParams) {
      response = NextResponse.redirect(url, { status: 302 }); // Use 302 for temporary redirect
    } else {
      response = NextResponse.next();
    }
    
    // Add cache control headers to prevent Facebook WebView from caching 404s
    if (isFacebookBrowser) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    
    // Add Vary header to ensure different caching for different user agents
    response.headers.set('Vary', 'User-Agent');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/jobs/:path*',
    '/scholarships/:path*',
  ],
};
