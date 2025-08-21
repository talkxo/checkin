const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to make API calls to OpenRouter
export async function callOpenRouter(messages: any[], temperature: number = 0.7): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      error: 'OpenRouter API key not configured'
    };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://talkxo-checkin.vercel.app',
        'X-Title': 'TalkXO Check-in AI'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2:free',
        messages,
        temperature,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.choices[0]?.message?.content || ''
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// AI Feature 1: Attendance Insights & Recommendations
export async function getAttendanceInsights(attendanceData: any[]): Promise<AIResponse> {
  const prompt = `Analyze this attendance data and provide insights:

${JSON.stringify(attendanceData, null, 2)}

Please provide:
1. Key patterns or trends
2. Potential issues (late arrivals, early departures, etc.)
3. Recommendations for improvement
4. Positive observations

Keep it concise and actionable.`;

  return callOpenRouter([
    { role: 'system', content: 'You are an HR analytics expert. Provide clear, actionable insights from attendance data.' },
    { role: 'user', content: prompt }
  ], 0.5);
}

// AI Feature 2: Smart Work Schedule Suggestions
export async function getScheduleSuggestions(userData: any, teamData: any[]): Promise<AIResponse> {
  const prompt = `Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(userData, null, 2)}
Team Data: ${JSON.stringify(teamData, null, 2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a workplace productivity expert. Provide personalized schedule recommendations.' },
    { role: 'user', content: prompt }
  ], 0.6);
}

// AI Feature 3: Attendance Report Summary
export async function generateAttendanceReport(attendanceData: any[], timeRange: string): Promise<AIResponse> {
  const prompt = `Generate a professional attendance report summary for ${timeRange}:

Data: ${JSON.stringify(attendanceData, null, 2)}

Include:
1. Executive summary
2. Key metrics and trends
3. Notable achievements
4. Areas for attention
5. Recommendations

Format it professionally for management review.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a professional HR analyst. Create clear, executive-level reports.' },
    { role: 'user', content: prompt }
  ], 0.4);
}

// AI Feature 4: Smart Notifications & Alerts
export async function generateSmartNotification(userData: any, context: string): Promise<AIResponse> {
  const prompt = `Generate a personalized, encouraging notification for this user:

User: ${JSON.stringify(userData, null, 2)}
Context: ${context}

Create a friendly, motivating message that:
1. Acknowledges their work pattern
2. Provides encouragement or tips
3. Maintains a positive tone
4. Is specific to their situation

Keep it under 100 words and make it feel personal.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a supportive workplace assistant. Create encouraging, personalized messages.' },
    { role: 'user', content: prompt }
  ], 0.8);
}

// AI Feature 5: Team Collaboration Insights
export async function getTeamInsights(teamData: any[]): Promise<AIResponse> {
  const prompt = `Analyze this team attendance data for collaboration insights:

${JSON.stringify(teamData, null, 2)}

Provide insights on:
1. Team availability patterns
2. Optimal meeting times
3. Collaboration opportunities
4. Potential scheduling conflicts
5. Recommendations for better team coordination

Focus on practical collaboration insights.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a team collaboration expert. Provide insights for better team coordination.' },
    { role: 'user', content: prompt }
  ], 0.5);
}

// AI Feature 6: Productivity Analysis
export async function analyzeProductivity(userData: any, historicalData: any[]): Promise<AIResponse> {
  const prompt = `Analyze this user's productivity patterns:

User: ${JSON.stringify(userData, null, 2)}
Historical Data: ${JSON.stringify(historicalData, null, 2)}

Provide:
1. Productivity patterns and trends
2. Peak performance times
3. Potential distractions or issues
4. Personalized productivity tips
5. Work-life balance insights

Be constructive and actionable.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a productivity coach. Provide constructive, personalized productivity insights.' },
    { role: 'user', content: prompt }
  ], 0.6);
}
