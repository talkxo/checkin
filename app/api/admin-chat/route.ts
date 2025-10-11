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

    // Smart data fetching based on query type
    let contextData = '';
    const messageLower = message.toLowerCase();
    
    // Helper function to fetch with timeout
    const fetchWithTimeout = async (url: string, timeoutMs: number = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok ? await response.json() : null;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Timeout or error fetching ${url}:`, error);
        return null;
      }
    };

    // Determine which data to fetch based on query
    const fetchPromises: Promise<any>[] = [];
    
    // Always fetch basic chatbot data (most comprehensive)
    fetchPromises.push(
      fetchWithTimeout(`${req.nextUrl.origin}/api/admin/chatbot-data`)
        .then(data => data ? { type: 'chatbot', data } : null)
    );

    // Add specific data based on query keywords
    if (messageLower.includes('pattern') || messageLower.includes('trend') || messageLower.includes('unusual')) {
      fetchPromises.push(
        fetchWithTimeout(`${req.nextUrl.origin}/api/admin/historical-data`)
          .then(data => data ? { type: 'historical', data } : null)
      );
    }
    
    if (messageLower.includes('mood') || messageLower.includes('engagement') || messageLower.includes('wellbeing')) {
      fetchPromises.push(
        fetchWithTimeout(`${req.nextUrl.origin}/api/admin/mood-data`)
          .then(data => data ? { type: 'mood', data } : null)
      );
    }

    // Execute all fetches in parallel with timeout
    try {
      const results = await Promise.allSettled(fetchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const { type, data } = result.value;
          if (type === 'chatbot') {
            contextData += `Team Status: ${JSON.stringify(data.summary, null, 2)}\n`;
            if (data.currentlyCheckedIn?.length > 0) {
              contextData += `Currently Active: ${JSON.stringify(data.currentlyCheckedIn, null, 2)}\n`;
            }
            if (data.todayStats) {
              contextData += `Today's Distribution: ${JSON.stringify(data.todayStats, null, 2)}\n`;
            }
          } else if (type === 'historical') {
            contextData += `Historical Patterns: ${JSON.stringify(data, null, 2)}\n`;
          } else if (type === 'mood') {
            contextData += `Mood/Engagement Data: ${JSON.stringify(data, null, 2)}\n`;
          }
        }
      });
    } catch (error) {
      console.error('Error in parallel data fetching:', error);
    }

    // Create a focused AI prompt based on available data
    const hasData = contextData.trim().length > 0;
    
    let prompt = `You are an INSYDE admin assistant for People Ops/HR teams.

User Question: "${message}"
Response Style: ${responseStyle}`;

    if (hasData) {
      prompt += `

Available Data: ${contextData}

Instructions:
- Analyze the provided data to answer the user's question
- Provide specific insights based on the actual data
- Use bullet points for lists
- Be concise and actionable
- This company uses Basecamp, Google Workspace, and Canva

Response Style Guidelines:
- SHORT: 1-2 sentences maximum
- DETAILED: 2-3 bullet points with insights  
- REPORT: 3-4 bullet points with recommendations`;
    } else {
      prompt += `

No specific data available. Provide a helpful response that:
- Acknowledges the data access limitation
- Suggests alternative ways to get the information
- Maintains a professional and helpful tone

Response Style: ${responseStyle}`;
    }

    console.log('Calling OpenRouter with prompt:', prompt.substring(0, 200) + '...');
    console.log('Context data available:', contextData ? 'Yes' : 'No');
    console.log('Context data length:', contextData.length);
    console.log('Has data flag:', hasData);
    
    // If no context data is available, provide a helpful fallback
    if (!hasData) {
      console.log('No context data available, using fallback response');
      
      // Try to get at least basic chatbot data as fallback
      try {
        const basicData = await fetchWithTimeout(`${req.nextUrl.origin}/api/admin/chatbot-data`, 3000);
        if (basicData) {
          const fallbackResponse = `I'm having trouble accessing detailed data right now, but here's what I can tell you:

• **Team Overview**: ${basicData.summary?.totalEmployees || 'Unknown'} total employees
• **Active Today**: ${basicData.summary?.activeToday || 0} people have checked in
• **Currently Online**: ${basicData.summary?.currentlyCheckedIn || 0} people are currently working

For more detailed insights, please try asking again in a few minutes or visit the admin dashboard.`;
          
          return NextResponse.json({ response: fallbackResponse });
        }
      } catch (error) {
        console.error('Even basic data fetch failed:', error);
      }
      
      // Final fallback if everything fails
      const staticFallback = `I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      
      return NextResponse.json({ response: staticFallback });
    }
    
    // Try AI response with better error handling
    let aiResponse;
    try {
      console.log('About to call OpenRouter with messages:', [
        { role: 'system', content: 'You are an INSYDE admin assistant. Provide brief, helpful responses about team attendance and status. Keep responses concise and actionable.' },
        { role: 'user', content: prompt.substring(0, 500) + '...' }
      ]);
      
      aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an INSYDE admin assistant. Provide brief, helpful responses about team attendance and status. Keep responses concise and actionable.' },
        { role: 'user', content: prompt }
      ], 0.3);
      
      console.log('OpenRouter call completed. Success:', aiResponse.success);
      console.log('OpenRouter response data length:', aiResponse.data?.length || 0);
    } catch (aiError) {
      console.error('AI call failed completely:', aiError);
      aiResponse = { success: false, error: 'AI service unavailable' };
    }

    console.log('AI Response success:', aiResponse.success);
    console.log('AI Response error:', aiResponse.error);
    console.log('AI Response data preview:', aiResponse.data?.substring(0, 100) + '...');

    if (!aiResponse.success) {
      console.error('AI Error:', aiResponse.error);
      
      // Try to provide a data-driven response even when AI fails
      if (hasData) {
        try {
          // Parse the context data to extract useful information
          const dataLines = contextData.split('\n').filter(line => line.trim());
          let dataSummary = '';
          
          dataLines.forEach(line => {
            if (line.includes('Team Status:')) {
              dataSummary += `\n**Current Team Status:**\n${line.replace('Team Status:', '').trim()}\n`;
            } else if (line.includes('Currently Active:')) {
              dataSummary += `\n**Currently Working:**\n${line.replace('Currently Active:', '').trim()}\n`;
            } else if (line.includes('Today\'s Distribution:')) {
              dataSummary += `\n**Today\'s Distribution:**\n${line.replace('Today\'s Distribution:', '').trim()}\n`;
            }
          });
          
          if (dataSummary) {
            const dataDrivenResponse = `I'm having trouble processing your request with AI, but here's what I can tell you from the current data:${dataSummary}\n\nFor more detailed insights, please try asking again in a few minutes or visit the admin dashboard.`;
            return NextResponse.json({ response: dataDrivenResponse });
          }
        } catch (parseError) {
          console.error('Error parsing context data for fallback:', parseError);
        }
      }
      
      // Final fallback response
      const fallbackResponse = `I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      
      return NextResponse.json({ response: fallbackResponse });
    }

    // Basic response validation (relaxed)
    const responseContent = aiResponse.data || '';
    
    // Only reject responses that are clearly corrupted or empty
    const isTooShort = responseContent.trim().length < 5;
    const isTooLong = responseContent.length > 3000;
    
    // Only check for obvious error patterns, not normal text
    const obviousErrors = [
      'stack trace', 'undefined', 'null', '))":'
    ];
    
    const hasObviousErrors = obviousErrors.some(error => 
      responseContent.toLowerCase().includes(error.toLowerCase())
    );
    
    if (isTooShort || isTooLong || hasObviousErrors) {
      console.error('AI response rejected for basic issues:', {
        content: responseContent.substring(0, 100),
        isTooShort,
        isTooLong,
        hasObviousErrors
      });
      
      // Provide data-driven fallback instead of generic message
      let fallbackResponse = `I'm having trouble processing that request right now. `;
      
      if (hasData) {
        fallbackResponse += `Based on the available data, here's what I can tell you:

• **Team Status**: Check the admin dashboard for current attendance
• **Quick Stats**: Review today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      } else {
        fallbackResponse += `Please try asking again in a few minutes, or use the dashboard for immediate insights.`;
      }
      
      return NextResponse.json({ response: fallbackResponse });
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
