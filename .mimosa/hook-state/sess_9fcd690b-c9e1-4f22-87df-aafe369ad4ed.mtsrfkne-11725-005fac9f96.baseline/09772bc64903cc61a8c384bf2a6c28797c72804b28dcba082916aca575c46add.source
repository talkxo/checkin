import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: employeeId, slug } = session;

    // We fetch EVERYTHING in parallel
    const [
      employeeRes,
      leaveRes,
      monthlyRes,
      punctualityRes,
      presenceRes
    ] = await Promise.all([
      // 1. Employee Detail
      supabaseAdmin.from('employees').select('*').eq('id', employeeId).maybeSingle(),
      
      // 2. Leave Balance
      fetch(`${req.nextUrl.origin}/api/leave/balance?slug=${slug}`).then(r => r.json()).catch(() => null),
      
      // 3. Monthly Stats
      fetch(`${req.nextUrl.origin}/api/monthly/stats?slug=${slug}`).then(r => r.json()).catch(() => null),
      
      // 4. Punctuality (Deep Score)
      fetch(`${req.nextUrl.origin}/api/stats/punctuality?slug=${slug}`).then(r => r.json()).catch(() => null),

      // 5. Today's Presence (Team)
      fetch(`${req.nextUrl.origin}/api/today/summary`).then(r => r.json()).catch(() => [])
    ]);

    // Construct the response
    return NextResponse.json({
      success: true,
      employee: employeeRes.data || { id: employeeId, full_name: session.fullName, slug: session.slug },
      stats: {
        leaveBalance: leaveRes,
        monthlyStats: monthlyRes,
        punctualityStats: punctualityRes
      },
      team: {
        presence: presenceRes
      },
      timestamp: nowIST().toISOString()
    });

  } catch (error: any) {
    console.error('Dashboard init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
