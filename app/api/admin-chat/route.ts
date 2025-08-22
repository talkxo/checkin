import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (for demo purposes)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Simple rate limiting
    const clientIP = req.ip || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(clientIP);
    
    if (clientData && now < clientData.resetTime) {
      if (clientData.count >= RATE_LIMIT) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please wait a moment before trying again.' 
        }, { status: 429 });
      }
      clientData.count++;
    } else {
      requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

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
      short: 'Provide a very brief summary (1-2 sentences) with only the most critical metric and one key insight. Use simple bullet points.',
      detailed: 'Provide a focused analysis (3-4 bullet points) with key insights and 1-2 actionable recommendations. Use bullet points for data presentation.',
      report: 'Provide a comprehensive report with executive summary, detailed analysis, and action plan. Use structured bullet points and sections.'
    };

    const prompt = `You are an INSYDE admin assistant for People Ops/HR teams. Analyze this attendance data and provide intelligent insights.

User Question: ${message}
Response Style: ${responseStyle}
Style Instructions: ${styleInstructions[responseStyle as keyof typeof styleInstructions]}

Available Data: ${contextData}

CRITICAL: You MUST follow the exact response style requested. Do NOT default to executive summary format.

**Response Style Requirements:**
- SHORT: Maximum 2 sentences + 1 bullet point
- DETAILED: 3-4 bullet points with 1-2 recommendations
- REPORT: Full structured report with multiple sections

**Key Focus Areas:**
- Team status and patterns
- Space utilization insights
- Cost optimization opportunities
- Employee engagement insights

**Formatting Rules:**
- Use bullet points for lists (• or -)
- Keep paragraphs short and focused
- Use bold text for emphasis (**text**)
- Use simple text formatting only
- NO markdown tables - use simple text lists instead

STRICTLY follow the response style: ${responseStyle}. Do not exceed the specified length.`;

    console.log('Calling OpenRouter with prompt:', prompt.substring(0, 200) + '...');
    
    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are an INSYDE admin assistant. Provide concise, actionable insights in Markdown format. Keep responses brief and focused on business value.' },
      { role: 'user', content: prompt }
    ], 0.7);

    console.log('AI Response:', aiResponse);

    if (!aiResponse.success) {
      console.error('AI Error:', aiResponse.error);
      
      // Provide a fallback response when all AI models fail
      const fallbackResponse = `I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      
      return NextResponse.json({ response: fallbackResponse });
    }

    return NextResponse.json({ response: aiResponse.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
