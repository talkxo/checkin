import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getUserSession } from '@/lib/auth';
import { getScheduleSuggestions } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated() && !getUserSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { userData, teamData } = await req.json();

    if (!userData) {
      return NextResponse.json({ error: 'userData is required' }, { status: 400 });
    }

    const suggestions = await getScheduleSuggestions(userData, teamData || []);

    if (!suggestions.success) {
      return NextResponse.json({ error: suggestions.error }, { status: 500 });
    }

    return NextResponse.json({ suggestions: suggestions.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
