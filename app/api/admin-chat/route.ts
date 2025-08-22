import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, responseStyle = 'short' } = await req.json();

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

    // Create AI prompt based on response style
    const styleInstructions = {
      short: 'Provide a brief executive summary (2-3 sentences) with key metrics and one actionable insight. Use tables for data presentation.',
      executive: 'Provide a concise executive summary (3-4 bullet points) with key insights and recommendations. Focus on business impact.',
      detailed: 'Provide a detailed analysis with multiple sections, but keep it focused and actionable. Use tables and structured formatting.',
      report: 'Provide a comprehensive report format with executive summary, detailed analysis, and action plan. Include tables and charts.',
      analytical: 'Provide deep analytical insights with data patterns, trends, and strategic recommendations. Use tables and visual formatting.'
    };

    const prompt = `You are an INSYDE admin assistant for People Ops/HR teams. Analyze this attendance data and provide intelligent insights.

User Question: ${message}
Response Style: ${responseStyle}
Style Instructions: ${styleInstructions[responseStyle as keyof typeof styleInstructions]}

Available Data: ${contextData}

IMPORTANT: Keep responses concise and focused. Use proper Markdown tables and formatting.

**Key Focus Areas:**
- Team status and patterns
- Space utilization insights
- Cost optimization opportunities
- Employee engagement insights

**Formatting Rules:**
- Use proper Markdown tables with | separators and header rows
- Keep table rows on single lines
- Use bullet points for lists
- Keep paragraphs short and focused
- Use bold text for emphasis

Format your response appropriately for the selected style. Ensure all tables and lists render correctly.`;

    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are an INSYDE admin assistant. Provide concise, actionable insights in Markdown format. Keep responses brief and focused on business value.' },
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
