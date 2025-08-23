import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    const prompt = `Analyze this AI chat response and recommend 3-5 relevant tags for organization and filtering.

Response Title: ${title || 'Untitled'}
Response Content: ${content}

Consider these tag categories:
- **Topic**: attendance, patterns, alerts, insights, trends
- **Priority**: urgent, important, routine, low-priority
- **Action**: needs-action, review, monitor, resolved
- **Team**: remote, office, management, individual
- **Time**: daily, weekly, monthly, seasonal

Provide only the tags as a JSON array, no explanations:
["tag1", "tag2", "tag3"]`;

    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are a helpful assistant that recommends relevant tags for organizing chat responses. Return only a JSON array of 3-5 tags.' },
      { role: 'user', content: prompt }
    ], 0.3);

    if (!aiResponse.success) {
      // Fallback tags
      const fallbackTags = ['attendance', 'insights', 'needs-review'];
      return NextResponse.json({ tags: fallbackTags });
    }

    try {
      // Try to parse the AI response as JSON
      const tags = JSON.parse(aiResponse.data);
      if (Array.isArray(tags)) {
        return NextResponse.json({ tags: tags.slice(0, 5) }); // Limit to 5 tags
      }
    } catch (parseError) {
      console.log('Failed to parse AI response as JSON, using fallback');
    }

    // Fallback if AI response isn't valid JSON
    const fallbackTags = ['attendance', 'insights', 'needs-review'];
    return NextResponse.json({ tags: fallbackTags });

  } catch (error) {
    console.error('Tag recommendation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
