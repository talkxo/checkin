// Server-side wrapper for TypeSafe's System One HTTP API (Jev). Returns typed
// judgments — never call this from client code; the API key is server-only.

const API_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';

export interface TypeSafeAnswer {
  type: 'noul' | 'choice' | 'score';
  noul?: number;
  choice?: string;
  score?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
}

export interface TypeSafeResult {
  answers: Record<string, TypeSafeAnswer>;
}

type Question = {
  type: 'noul' | 'choice' | 'score';
  instructions: string;
  criteria?: unknown;
};

export function isTypeSafeConfigured(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

export async function askJev(
  state: unknown,
  questions: Record<string, Question>
): Promise<{ success: true; data: TypeSafeResult } | { success: false; error: string }> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'TYPESAFE_API_KEY is not configured' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state, model: MODEL, questions }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `TypeSafe API error ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as TypeSafeResult;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown TypeSafe error',
    };
  }
}
