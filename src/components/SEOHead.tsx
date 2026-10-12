import { Metadata } from 'next';

interface SEOData {
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_canonical_url?: string | null;
  seo_index?: boolean | null;
  seo_follow?: boolean | null;
}

export function generateSEOMetadata(seoData: SEOData, fallbackTitle?: string, fallbackDescription?: string): Metadata {
  const robots = [];
  
  if (seoData.seo_index === false) {
    robots.push('noindex');
  } else {
    robots.push('index');
  }
  
  if (seoData.seo_follow === false) {
    robots.push('nofollow');
  } else {
    robots.push('follow');
  }

  return {
    title: seoData.seo_title || fallbackTitle || 'CareerSasa',
    description: seoData.seo_meta_description || fallbackDescription || 'Find your dream job in Kenya',
    robots: robots.join(', '),
    alternates: seoData.seo_canonical_url ? {
      canonical: seoData.seo_canonical_url,
    } : undefined,
    openGraph: {
      title: seoData.seo_title || fallbackTitle || 'CareerSasa',
      description: seoData.seo_meta_description || fallbackDescription || 'Find your dream job in Kenya',
      url: seoData.seo_canonical_url || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoData.seo_title || fallbackTitle || 'CareerSasa',
      description: seoData.seo_meta_description || fallbackDescription || 'Find your dream job in Kenya',
    },
  };
}
