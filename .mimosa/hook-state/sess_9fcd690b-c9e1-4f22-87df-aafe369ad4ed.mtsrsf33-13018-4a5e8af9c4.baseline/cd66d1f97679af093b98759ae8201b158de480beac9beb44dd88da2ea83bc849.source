const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Primary model + fallback chain, all free. OpenRouter retries down this
// list server-side on ANY error (rate-limit, downtime, context overflow,
// moderation) via the `models` array — this replaces a hand-rolled
// client-side loop across several hardcoded free-model IDs that kept going
// defunct. `openrouter/free` sits last: it's OpenRouter's own router across
// ~24 free models and self-updates as models come and go, but its picks are
// unscoped by role — live testing surfaced it landing on a content-safety
// classifier model that returned "User Safety: safe" instead of an actual
// answer. A named general-purpose model sits ahead of it as a real fallback
// before falling back to that fully random pool.
const PRIMARY_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const SECONDARY_MODEL = 'nvidia/nemotron-3.5-lightning:free';
const FALLBACK_MODEL = 'openrouter/free';

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function requestCompletion(messages: any[], temperature: number, maxTokens: number, signal: AbortSignal) {
  return fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://insyde.talkxo.com',
      'X-Title': 'INSYDE AI'
    },
    body: JSON.stringify({
      model: PRIMARY_MODEL,
      models: [SECONDARY_MODEL, FALLBACK_MODEL],
      messages,
      temperature,
      max_tokens: maxTokens,
      // Strip reasoning/thinking tokens from the response server-side instead
      // of regex-scrubbing leaked chain-of-thought out of the final text.
      reasoning: { exclude: true }
    }),
    signal
  });
}

export async function callOpenRouter(
  messages: any[],
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    console.error('OpenRouter API key not configured');
    return {
      success: false,
      error: 'OpenRouter API key not configured'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await requestCompletion(messages, temperature, maxTokens, controller.signal);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter request failed: ${response.status} - ${errorText}`);
      if (response.status === 401) {
        return { success: false, error: 'Authentication failed - check API key' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limited - please try again shortly' };
      }
      return { success: false, error: `OpenRouter error: ${response.status}` };
    }

    const data = await response.json();
    const firstChoice = data.choices?.[0];
    let finalContent = firstChoice?.message?.content || '';
    let finishReason = firstChoice?.finish_reason;

    // If model output is truncated, request continuation and append.
    for (let continuation = 0; continuation < 2 && finishReason === 'length'; continuation++) {
      const continuationResponse = await requestCompletion(
        [
          ...messages,
          { role: 'assistant', content: finalContent },
          {
            role: 'user',
            content:
              'Continue exactly from where you stopped. Do not repeat previous sections. Return only the remaining markdown.'
          }
        ],
        temperature,
        maxTokens,
        controller.signal
      );

      if (!continuationResponse.ok) break;

      const continuationData = await continuationResponse.json();
      const continuationChoice = continuationData.choices?.[0];
      const continuationContent = continuationChoice?.message?.content || '';
      if (!continuationContent.trim()) break;

      finalContent = `${finalContent.trimEnd()}\n\n${continuationContent.trimStart()}`;
      finishReason = continuationChoice?.finish_reason;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`OpenRouter response via ${data.model || PRIMARY_MODEL}, length: ${finalContent.length} characters`);
    }

    // A 200 response with empty content is a real failure mode — seen when
    // the fallback router lands on a flaky free model. Treat it as one
    // rather than returning success with nothing for callers to render.
    if (!finalContent.trim()) {
      console.error(`OpenRouter returned an empty completion (model: ${data.model || PRIMARY_MODEL})`);
      return { success: false, error: 'Model returned an empty response' };
    }

    return { success: true, data: finalContent };
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbortError = typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
    if (process.env.NODE_ENV === 'development') console.log('OpenRouter request error:', isAbortError ? 'timeout' : error);
    return { success: false, error: isAbortError ? 'Request timed out' : 'Request failed' };
  }
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
  ], 0.5, 2400);
}

// AI Feature 4: Smart Notifications & Alerts
export async function generateSmartNotification(userData: any, context: string): Promise<AIResponse> {
  const prompt = `Create a brief motivational message for ${userData?.full_name || 'Employee'} who is ${context}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`;

  return callOpenRouter([
    { role: 'system', content: 'You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message.' },
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
