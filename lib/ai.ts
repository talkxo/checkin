const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to make API calls to OpenRouter with fallback models
export async function callOpenRouter(messages: any[], temperature: number = 0.7): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error('OpenRouter API key not configured');
    return {
      success: false,
      error: 'OpenRouter API key not configured'
    };
  }

  console.log('OpenRouter API Key available:', OPENROUTER_API_KEY.substring(0, 10) + '...');

  // Define models in order of preference with fallbacks
  const models = [
    'google/gemma-3n-e4b-it:free',    // Primary (Google's Gemma model)
    'openai/gpt-oss-20b:free',        // Fallback 1
    'moonshotai/kimi-k2:free',        // Fallback 2
    'anthropic/claude-3-haiku:free'   // Fallback 3
  ];

  const maxRetries = 2;
  const baseDelay = 1000; // 1 second

  for (const model of models) {
    console.log(`Trying model: ${model}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://talkxo-checkin.vercel.app',
            'X-Title': 'INSYDE AI'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: 800 // Reduced to avoid rate limits
          })
        });

        if (response.status === 429) {
          // Rate limited - try next model
          console.log(`Rate limited on ${model}, trying next model...`);
          break;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Model ${model} failed: ${response.status} - ${errorText}`);
          
          // If it's an authentication error, don't try other models
          if (response.status === 401) {
            console.error('Authentication error - API key might be invalid');
            return {
              success: false,
              error: 'Authentication failed - check API key'
            };
          }
          
          // Try next model
          break;
        }

        const data = await response.json();
        console.log(`Success with model: ${model}`);
        return {
          success: true,
          data: data.choices[0]?.message?.content || ''
        };
      } catch (error) {
        console.log(`Model ${model} error (attempt ${attempt}):`, error);
        
        if (attempt === maxRetries) {
          // Try next model
          break;
        }
        
        // Wait before retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: 'All models failed or rate limited'
  };
}

// AI Feature 1: HR-Focused Attendance Insights & Employee Engagement Analysis
export async function getAttendanceInsights(attendanceData: any[], timeRange: string): Promise<AIResponse> {
  const prompt = `Analyze attendance data for ${timeRange}. Format response in Markdown with clear sections:

${JSON.stringify(attendanceData, null, 2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`;

  return callOpenRouter([
    { role: 'system', content: 'You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations.' },
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
  const prompt = `Create a brief motivational message for ${userData?.full_name || 'Employee'} who is ${context}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

DO NOT include any reasoning, analysis, or word counting. Return ONLY the message.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`;

  return callOpenRouter([
    { role: 'system', content: 'You are a workplace productivity expert. Return ONLY the final motivational message with "Did you know?" facts. Do not include any reasoning or analysis.' },
    { role: 'user', content: prompt }
  ], 0.1);
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
