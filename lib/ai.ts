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

// AI Feature 1: HR-Focused Attendance Insights & Employee Engagement Analysis
export async function getAttendanceInsights(attendanceData: any[], timeRange: string): Promise<AIResponse> {
  const prompt = `Analyze this attendance data from an HR and employee engagement perspective for ${timeRange}:

${JSON.stringify(attendanceData, null, 2)}

Please provide insights focusing on:

1. **Employee Engagement Patterns**
   - Work-life balance indicators
   - Consistency and reliability patterns
   - Potential burnout or stress signals
   - Positive engagement behaviors

2. **Team Dynamics & Collaboration**
   - Office vs remote collaboration patterns
   - Team availability for meetings
   - Cross-functional interaction opportunities
   - Communication effectiveness indicators

3. **Employee Well-being & Satisfaction**
   - Work schedule preferences
   - Flexibility utilization
   - Potential stress indicators
   - Positive work habits

4. **HR Recommendations for Engagement**
   - Recognition opportunities
   - Support initiatives needed
   - Policy adjustments for better work-life balance
   - Team building suggestions

5. **Empathy-Driven Insights**
   - Individual employee stories and patterns
   - Personal circumstances considerations
   - Supportive intervention opportunities
   - Positive reinforcement areas

Focus on employee-centric analysis with empathy and understanding.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a compassionate HR professional with expertise in employee engagement, well-being, and organizational psychology. Provide empathetic, employee-focused insights that prioritize human connection and understanding.' },
    { role: 'user', content: prompt }
  ], 0.6);
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

// AI Feature 3: HR-Focused Attendance Report Summary
export async function generateAttendanceReport(attendanceData: any[], timeRange: string): Promise<AIResponse> {
  const prompt = `Generate a comprehensive HR-focused attendance report for ${timeRange}:

Data: ${JSON.stringify(attendanceData, null, 2)}

Please structure the report with:

1. **Executive Summary**
   - Overall employee engagement health
   - Key well-being indicators
   - Team collaboration effectiveness

2. **Employee Engagement Metrics**
   - Work-life balance scores
   - Flexibility utilization rates
   - Consistency and reliability patterns
   - Burnout risk indicators

3. **Team Dynamics Analysis**
   - Office vs remote collaboration patterns
   - Cross-functional interaction opportunities
   - Communication effectiveness
   - Team building needs

4. **Individual Employee Stories**
   - Notable positive patterns
   - Support opportunities
   - Recognition moments
   - Personal circumstances considerations

5. **HR Action Items**
   - Recognition and appreciation opportunities
   - Support initiatives needed
   - Policy recommendations for better engagement
   - Team building and culture initiatives

6. **Empathy & Well-being Focus**
   - Stress management opportunities
   - Work-life balance improvements
   - Mental health support considerations
   - Positive reinforcement strategies

Format this as a professional HR report that prioritizes employee well-being and engagement.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights.' },
    { role: 'user', content: prompt }
  ], 0.5);
}

// AI Feature 4: Smart Notifications & Alerts
export async function generateSmartNotification(userData: any, context: string): Promise<AIResponse> {
  const prompt = `Generate a personalized, encouraging notification for this user:

User: ${JSON.stringify(userData, null, 2)}
Context: ${context}

IMPORTANT: All times mentioned in the context are in IST (India Standard Time). Do not convert or reinterpret these times.

Create a friendly, motivating message that:
1. Acknowledges their work pattern
2. Provides encouragement or tips
3. Maintains a positive tone
4. Is specific to their situation
5. Uses the exact times provided in the context (IST timezone)

Keep it under 100 words and make it feel personal. Use the times exactly as provided in the context.`;

  return callOpenRouter([
    { role: 'system', content: 'You are a supportive workplace assistant. Create encouraging, personalized messages. Always use the exact times provided in the context without converting them.' },
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
