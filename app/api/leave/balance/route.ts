import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeLeaveBalance } from '@/lib/leave';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    const email = url.searchParams.get('email') || '';
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());

    if (!slug && !email) {
      return NextResponse.json({ error: 'slug or email required' }, { status: 400 });
    }

    // Use shared function for leave balance
    const result = await getEmployeeLeaveBalance(slug || email, year);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in leave balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
