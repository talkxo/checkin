import { NextRequest, NextResponse } from 'next/server';
import { generateAttendanceReport } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { attendanceData, timeRange } = await req.json();

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json({ error: 'attendanceData array is required' }, { status: 400 });
    }

    if (!timeRange) {
      return NextResponse.json({ error: 'timeRange is required' }, { status: 400 });
    }

    const report = await generateAttendanceReport(attendanceData, timeRange);

    if (!report.success) {
      return NextResponse.json({ error: report.error }, { status: 500 });
    }

    return NextResponse.json({ report: report.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
