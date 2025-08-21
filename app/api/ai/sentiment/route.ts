import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { moodData, timeRange } = await req.json();

    if (!moodData || !Array.isArray(moodData)) {
      return NextResponse.json({ error: 'moodData array is required' }, { status: 400 });
    }

    if (!timeRange) {
      return NextResponse.json({ error: 'timeRange is required' }, { status: 400 });
    }

    const prompt = `Analyze this employee mood data from an HR and well-being perspective for ${timeRange}:

${JSON.stringify(moodData, null, 2)}

Please provide insights focusing on:

1. **Mood Trends & Patterns**
   - Overall mood trajectory (improving/declining/stable)
   - Weekly patterns and seasonal variations
   - Correlation with work patterns

2. **Well-being Indicators**
   - Stress level assessment
   - Work-life balance indicators
   - Burnout risk signals
   - Positive engagement patterns

3. **Individual Employee Insights**
   - Personal mood stories and patterns
   - Support opportunities
   - Recognition moments
   - Intervention recommendations

4. **Team Dynamics**
   - Team mood health
   - Collaboration impact on mood
   - Cross-team mood patterns

5. **HR Recommendations**
   - Support initiatives needed
   - Recognition opportunities
   - Policy adjustments for better well-being
   - Team building suggestions

6. **Empathy-Driven Analysis**
   - Personal circumstances considerations
   - Individual coping patterns
   - Positive reinforcement areas
   - Supportive intervention timing

Focus on employee-centric analysis with empathy and understanding.`;

    const sentiment = await callOpenRouter([
      { 
        role: 'system', 
        content: 'You are a compassionate HR professional with expertise in employee well-being, organizational psychology, and workplace mental health. Provide empathetic, employee-focused insights that prioritize human connection and understanding.' 
      },
      { role: 'user', content: prompt }
    ], 0.6);

    if (!sentiment.success) {
      return NextResponse.json({ error: sentiment.error }, { status: 500 });
    }

    return NextResponse.json({ sentiment: sentiment.data });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
