import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';

export const runtime = 'edge';
export const revalidate = 900;

const COLORS = {
  primary: '#0b66c3',
  teal: '#0ea5e9',
  orange: '#f97316',
  white: '#ffffff',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    if (!slug) {
      return new Response('Missing blog slug', { status: 400 });
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('title, excerpt, category, created_at')
      .eq('slug', slug)
      .single();

    if (error || !post) {
      return getDefaultImage();
    }

    const title = post.title || 'Blog Post';
    const excerpt = post.excerpt || '';
    const category = post.category || 'Career Tips';
    
    const truncateText = (text: string, maxLength: number) => {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.teal})`,
            position: 'relative',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Geometric shapes background */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '5%',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8%',
              width: '150px',
              height: '150px',
              transform: 'rotate(45deg)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '15%',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '25%',
              right: '25%',
              width: '80px',
              height: '80px',
              transform: 'rotate(30deg)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '30%',
              right: '10%',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
            }}
          />
          
          {/* Logo - Top Left */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: COLORS.orange,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            C
          </div>
          
          {/* Category Badge - Top Right */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              right: '50px',
              padding: '15px 30px',
              borderRadius: '25px',
              backgroundColor: COLORS.orange,
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            {category}
          </div>
          
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '80px 100px',
              height: '100%',
              textAlign: 'center',
            }}
          >
            {/* Blog Title */}
            <h1
              style={{
                fontSize: '68px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '30px',
                lineHeight: '1.2',
                maxWidth: '90%',
              }}
            >
              {truncateText(title, 80)}
            </h1>
            
            {/* Excerpt */}
            {excerpt && (
              <p
                style={{
                  fontSize: '32px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: '1.5',
                  maxWidth: '85%',
                }}
              >
                {truncateText(excerpt, 120)}
              </p>
            )}
          </div>
          
          {/* Bottom Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              fontSize: '28px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            CareerSasa.co.ke — Career Insights
          </div>
          
          {/* Read More CTA - Bottom Right */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              padding: '20px 40px',
              borderRadius: '12px',
              backgroundColor: COLORS.orange,
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            READ MORE
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('Error generating blog OG image:', error);
    return getDefaultImage();
  }
}

function getDefaultImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.teal})`,
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Geometric shapes */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '140px',
            height: '140px',
            transform: 'rotate(45deg)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '40px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: COLORS.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          C
        </div>
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
            }}
          >
            CareerSasa Blog
          </h1>
          <p
            style={{
              fontSize: '42px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            Career Insights & Tips
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600',
      },
    }
  );
}
