import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (for demo purposes)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

interface FetchedData {
  chatbot?: any;
  historical?: any;
  mood?: any;
}

// Builds a clean, human-readable fallback directly from the structured data
// objects — not by re-parsing pretty-printed JSON text, which previously
// leaked raw `{`/`[` characters into the response whenever the AI call failed.
function buildDataSummary(data: FetchedData): string {
  const lines: string[] = [];

  if (data.chatbot?.summary) {
    const s = data.chatbot.summary;
    lines.push(
      `**Team Status:** ${s.totalEmployees ?? 'unknown'} total employees, ` +
      `${s.activeToday ?? 0} active today, ${s.currentlyCheckedIn ?? 0} currently checked in.`
    );
  }
  if (data.chatbot?.currentlyCheckedIn?.length) {
    const names = data.chatbot.currentlyCheckedIn
      .map((p: any) => p?.full_name || p?.name)
      .filter(Boolean)
      .slice(0, 10)
      .join(', ');
    if (names) lines.push(`**Currently working:** ${names}`);
  }
  if (data.chatbot?.todayStats) {
    const t = data.chatbot.todayStats;
    lines.push(`**Today's split:** ${t.office ?? 0} office, ${t.remote ?? 0} remote.`);
  }
  if (data.mood?.length) {
    lines.push(`**Mood check-ins:** ${data.mood.length} recorded for this range.`);
  }
  if (data.historical) {
    lines.push(`Historical pattern data is available — ask a more specific question to dig in.`);
  }

  return lines.join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      console.error('OpenRouter API key not configured');
      return NextResponse.json({
        response: 'AI service is not configured. Please contact the administrator to set up the OpenRouter API key. For now, you can use the admin dashboard to view attendance data directly.'
      });
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

    const messageLower = message.toLowerCase();

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

    // Fetch whatever data is relevant to the question, in parallel.
    const wantsHistorical = messageLower.includes('pattern') || messageLower.includes('trend') || messageLower.includes('unusual');
    const wantsMood = messageLower.includes('mood') || messageLower.includes('engagement') || messageLower.includes('wellbeing');

    const [chatbot, historical, mood] = await Promise.all([
      fetchWithTimeout(`${req.nextUrl.origin}/api/admin/chatbot-data`),
      wantsHistorical ? fetchWithTimeout(`${req.nextUrl.origin}/api/admin/historical-data`) : Promise.resolve(null),
      wantsMood ? fetchWithTimeout(`${req.nextUrl.origin}/api/admin/mood-data`) : Promise.resolve(null),
    ]);

    const fetchedData: FetchedData = { chatbot, historical, mood };
    const hasData = Boolean(chatbot || historical || mood);

    // Build the context block for the AI prompt from the same structured data.
    let contextData = '';
    if (chatbot?.summary) contextData += `Team Status: ${JSON.stringify(chatbot.summary)}\n`;
    if (chatbot?.currentlyCheckedIn?.length) contextData += `Currently Active: ${JSON.stringify(chatbot.currentlyCheckedIn)}\n`;
    if (chatbot?.todayStats) contextData += `Today's Distribution: ${JSON.stringify(chatbot.todayStats)}\n`;
    if (historical) contextData += `Historical Patterns: ${JSON.stringify(historical)}\n`;
    if (mood) contextData += `Mood/Engagement Data: ${JSON.stringify(mood)}\n`;

    if (!hasData) {
      return NextResponse.json({
        response: `I couldn't access attendance data right now. Try the admin dashboard directly for current team status, or ask again in a moment.`
      });
    }

    let prompt = `You are an INSYDE admin assistant for People Ops/HR teams.

User Question: "${message}"
Response Style: ${responseStyle}

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

    const aiResponse = await callOpenRouter(
      [
        { role: 'system', content: 'You are an INSYDE admin assistant. Provide brief, helpful responses about team attendance and status. Keep responses concise and actionable.' },
        { role: 'user', content: prompt }
      ],
      0.3
    );

    if (!aiResponse.success || !aiResponse.data?.trim()) {
      console.error('Admin chat AI call failed:', aiResponse.error);
      const summary = buildDataSummary(fetchedData);
      const fallbackResponse = summary
        ? `I couldn't get an AI-generated answer right now, but here's what the current data shows:\n\n${summary}\n\n_Reason: ${aiResponse.error || 'no response returned'}_`
        : `I couldn't get an AI-generated answer right now (${aiResponse.error || 'no response returned'}). Try the admin dashboard for current attendance data, or ask again shortly.`;
      return NextResponse.json({ response: fallbackResponse });
    }

    return NextResponse.json({ response: aiResponse.data.trim() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
