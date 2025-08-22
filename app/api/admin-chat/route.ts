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

    // Get relevant data based on the query - improved logic
    let contextData = '';
    const messageLower = message.toLowerCase();
    
    // Always fetch basic stats for context
    try {
      const statsResponse = await fetch(`${req.nextUrl.origin}/api/admin/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        contextData += `Current Stats: ${JSON.stringify(statsData, null, 2)}\n`;
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    
    // Fetch daily stats for location/attendance patterns
    try {
      const dailyResponse = await fetch(`${req.nextUrl.origin}/api/admin/daily-stats`);
      if (dailyResponse.ok) {
        const dailyData = await dailyResponse.json();
        contextData += `Daily Stats: ${JSON.stringify(dailyData, null, 2)}\n`;
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
    
    // Fetch employee data for detailed insights
    try {
      const employeeResponse = await fetch(`${req.nextUrl.origin}/api/admin/users`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        contextData += `Employee List: ${JSON.stringify(employeeData.slice(0, 5), null, 2)} (showing first 5)\n`;
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
    
    // Add specific data based on query keywords
    if (messageLower.includes('pattern') || messageLower.includes('trend') || messageLower.includes('unusual')) {
      try {
        const historicalResponse = await fetch(`${req.nextUrl.origin}/api/admin/historical-data`);
        if (historicalResponse.ok) {
          const historicalData = await historicalResponse.json();
          contextData += `Historical Patterns: ${JSON.stringify(historicalData, null, 2)}\n`;
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    }
    
    if (messageLower.includes('meeting') || messageLower.includes('collaboration') || messageLower.includes('team')) {
      try {
        const moodResponse = await fetch(`${req.nextUrl.origin}/api/admin/mood-data`);
        if (moodResponse.ok) {
          const moodData = await moodResponse.json();
          contextData += `Mood/Engagement Data: ${JSON.stringify(moodData, null, 2)}\n`;
        }
      } catch (error) {
        console.error('Error fetching mood data:', error);
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

IMPORTANT: This company uses Basecamp for chats, notes and tasks, Google Drive for files and other Google Workspace services like Gmail, and Canva for design work. Do NOT mention Slack, Microsoft Teams, or other tools they don't use.

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
    console.log('Context data available:', contextData ? 'Yes' : 'No');
    
    // If no context data is available, provide a fallback prompt
    if (!contextData.trim()) {
      console.log('No context data available, using fallback prompt');
      const fallbackPrompt = `You are an INSYDE admin assistant. The user asked: "${message}"

Unfortunately, I cannot access the current attendance data right now. Please provide a helpful response that:
1. Acknowledges the data access issue
2. Suggests alternative ways to get this information
3. Maintains a professional and helpful tone

Response style: ${responseStyle}`;
      
      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an INSYDE admin assistant. Provide helpful guidance when data is unavailable.' },
        { role: 'user', content: fallbackPrompt }
      ], 0.7);
      
      if (!aiResponse.success) {
        // If AI also fails, return the static fallback
        const staticFallback = `I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
        
        return NextResponse.json({ response: staticFallback });
      }
      
      return NextResponse.json({ response: aiResponse.data });
    }
    
    // Normal flow with context data
    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are an INSYDE admin assistant. Provide concise, actionable insights in Markdown format. Keep responses brief and focused on business value. This company uses Basecamp, Google Workspace, and Canva - do not mention other tools.' },
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
