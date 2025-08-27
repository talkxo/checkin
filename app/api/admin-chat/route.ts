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

    // Create a simpler, more focused AI prompt
    const prompt = `You are an INSYDE admin assistant for People Ops/HR teams. 

User Question: "${message}"
Response Style: ${responseStyle}

Available Data: ${contextData || 'No specific data available'}

Instructions:
- Provide helpful insights about team attendance and status
- Keep responses concise and actionable
- Use bullet points for lists
- This company uses Basecamp, Google Workspace, and Canva
- Do not mention Slack, Microsoft Teams, or other tools

Response Style Guidelines:
- SHORT: 1-2 sentences maximum
- DETAILED: 2-3 bullet points with insights
- REPORT: 3-4 bullet points with recommendations

Focus on: team status, attendance patterns, space utilization, and employee engagement.`;

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
    
    // Try AI response with better error handling
    let aiResponse;
    try {
      aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an INSYDE admin assistant. Provide brief, helpful responses about team attendance and status. Keep responses concise and actionable.' },
        { role: 'user', content: prompt }
      ], 0.3);
    } catch (aiError) {
      console.error('AI call failed completely:', aiError);
      aiResponse = { success: false, error: 'AI service unavailable' };
    }

    console.log('AI Response:', aiResponse);
    console.log('AI Response Content:', aiResponse.data);

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

    // Validate AI response content
    const responseContent = aiResponse.data || '';
    
    // Check if response looks like an error or corrupted data
    const errorIndicators = [
      'Error:', 'Exception:', 'stack trace', 'undefined', 'null',
      'function', 'system', 'lib', 'from', 'at at', '))":'
    ];
    
    const hasErrorIndicators = errorIndicators.some(indicator => 
      responseContent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Check if response is too short or too long
    const isTooShort = responseContent.trim().length < 10;
    const isTooLong = responseContent.length > 2000;
    
    // Check if response contains suspicious patterns (more specific)
    const suspiciousPatterns = [
      /at\s+\w+\s+\(/, // Stack trace patterns with parentheses
      /function\s+\w+\s*\(/, // Function definitions with parentheses
      /from\s+['"]\w+/, // Import statements with quotes
    ];
    
    const hasSuspiciousPatterns = suspiciousPatterns.some(pattern => 
      pattern.test(responseContent)
    );
    
    if (hasErrorIndicators || isTooShort || isTooLong || hasSuspiciousPatterns) {
      console.error('AI response appears corrupted or contains errors:', {
        content: responseContent.substring(0, 200),
        hasErrorIndicators,
        isTooShort,
        isTooLong,
        hasSuspiciousPatterns,
        errorIndicators: errorIndicators.filter(indicator => 
          responseContent.toLowerCase().includes(indicator.toLowerCase())
        )
      });
      
      const safeFallbackResponse = `I'm having trouble processing that request right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      
      return NextResponse.json({ response: safeFallbackResponse });
    }

    // Clean the AI response to remove any reasoning or analysis
    let cleanResponse = responseContent;
    
    // Remove common reasoning patterns
    const reasoningPatterns = [
      /analysis.*?assistantfinal/i,
      /we need to.*?good\./i,
      /let's craft.*?words, within/i,
      /count words.*?good\./i,
      /that's \d+ words.*?good\./i,
      /provide concise.*?assistantfinal/i,
      /use short style.*?assistantfinal/i
    ];
    
    reasoningPatterns.forEach(pattern => {
      cleanResponse = cleanResponse.replace(pattern, '');
    });
    
    // Clean up any remaining artifacts
    cleanResponse = cleanResponse
      .replace(/analysis/i, '')
      .replace(/assistantfinal/i, '')
      .replace(/^\s*/, '') // Remove leading whitespace
      .replace(/\s*$/, ''); // Remove trailing whitespace

    return NextResponse.json({ response: cleanResponse });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
