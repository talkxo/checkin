import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceInsights } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { attendanceData } = await req.json();

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json({ error: 'attendanceData array is required' }, { status: 400 });
    }

    const insights = await getAttendanceInsights(attendanceData);

    if (!insights.success) {
      return NextResponse.json({ error: insights.error }, { status: 500 });
    }

    return NextResponse.json({ insights: insights.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
