import { NextRequest, NextResponse } from 'next/server';
import { callAI, hasAIConfigured } from '@/lib/aiProviders';

export const runtime = 'nodejs';

/**
 * POST /api/salary-compare
 * AI-powered salary comparison: takes user's salary and market data,
 * returns intelligent analysis of how the user's salary compares.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasAIConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'AI comparison is not available. Please try again later.',
      });
    }

    const body = await request.json();
    const { jobTitle, userSalary, location, experienceLevel, marketData } = body;

    if (!jobTitle || !userSalary || !marketData) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields.',
      }, { status: 400 });
    }

    // Basic numerical comparison (always available)
    const difference = userSalary - marketData.median_salary;
    const differencePercentage = (difference / marketData.median_salary) * 100;

    let percentile = 50;
    if (userSalary <= marketData.percentile_25) percentile = 25;
    else if (userSalary >= marketData.percentile_75) percentile = 75;
    else {
      const range = marketData.percentile_75 - marketData.percentile_25;
      const position = userSalary - marketData.percentile_25;
      percentile = 25 + (position / range) * 50;
    }

    let status: 'below' | 'at' | 'above' = 'at';
    if (differencePercentage < -10) status = 'below';
    else if (differencePercentage > 10) status = 'above';

    // AI-powered analysis
    let aiAnalysis = '';
    try {
      const prompt = `You are a Kenyan salary expert. Analyze how this person's salary compares to the market.

Role: ${jobTitle}
Location: ${location || 'Kenya'}
Experience: ${experienceLevel || 'Not specified'}

User's salary: KES ${userSalary.toLocaleString()} per month

Market data for this role:
- Minimum: KES ${marketData.min_salary.toLocaleString()}
- 25th percentile: KES ${marketData.percentile_25.toLocaleString()}
- Median: KES ${marketData.median_salary.toLocaleString()}
- 75th percentile: KES ${marketData.percentile_75.toLocaleString()}
- Maximum: KES ${marketData.max_salary.toLocaleString()}

Provide a brief, actionable analysis (2-3 sentences max). Include:
1. Where they stand in the market
2. Whether they should negotiate (and by how much)
3. Any relevant context for the Kenyan job market

Return JSON: {"analysis": "your analysis here"}`;

      const result = await callAI(prompt, {
        systemPrompt: 'You are a Kenyan salary negotiation expert. Be concise and practical.',
        maxTokens: 300,
        temperature: 0.3,
        json: true,
      });

      aiAnalysis = result.parsed?.analysis || '';
    } catch (aiError: any) {
      console.error('[salary-compare] AI analysis failed:', aiError.message);
      // Continue without AI analysis
    }

    return NextResponse.json({
      success: true,
      data: {
        userSalary,
        marketMedian: marketData.median_salary,
        percentile: Math.round(percentile),
        difference,
        differencePercentage: Math.round(differencePercentage * 10) / 10,
        status,
        aiAnalysis,
      },
    });
  } catch (error: any) {
    console.error('[salary-compare] Error:', error.message);
    return NextResponse.json({
      success: false,
      message: 'Comparison failed. Try again later.',
    }, { status: 500 });
  }
}
