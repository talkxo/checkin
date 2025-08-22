import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get relevant data based on the query
    let contextData = '';
    
    if (message.toLowerCase().includes('week') || message.toLowerCase().includes('statistics')) {
      // Fetch weekly stats
      const weeklyResponse = await fetch(`${req.nextUrl.origin}/api/admin/stats`);
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        contextData = `Weekly Statistics: ${JSON.stringify(weeklyData, null, 2)}`;
      }
    }

    if (message.toLowerCase().includes('employee') || message.toLowerCase().includes('attentive')) {
      // Fetch employee data
      const employeeResponse = await fetch(`${req.nextUrl.origin}/api/admin/users`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        contextData += `\nEmployee Data: ${JSON.stringify(employeeData, null, 2)}`;
      }
    }

    if (message.toLowerCase().includes('remote') || message.toLowerCase().includes('office')) {
      // Fetch location data
      const locationResponse = await fetch(`${req.nextUrl.origin}/api/admin/daily-stats`);
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        contextData += `\nLocation Data: ${JSON.stringify(locationData, null, 2)}`;
      }
    }

    // Create AI prompt
    const prompt = `You are an INSYDE admin assistant. Analyze this attendance data and answer the user's question.

User Question: ${message}

Available Data: ${contextData}

Provide a concise, professional response in Markdown format. Focus on:
- Key insights and patterns
- Actionable recommendations
- Clear data presentation
- Professional tone

Keep the response focused and well-formatted.`;

    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are an INSYDE admin assistant. Provide concise, professional insights about attendance data in Markdown format.' },
      { role: 'user', content: prompt }
    ], 0.7);

    if (!aiResponse.success) {
      return NextResponse.json({ error: aiResponse.error }, { status: 500 });
    }

    return NextResponse.json({ response: aiResponse.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
