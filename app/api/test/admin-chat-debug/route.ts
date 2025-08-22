import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const results: any = {};
  
  try {
    // Test stats API
    const statsResponse = await fetch(`${req.nextUrl.origin}/api/admin/stats`);
    results.stats = {
      status: statsResponse.status,
      ok: statsResponse.ok,
      data: statsResponse.ok ? await statsResponse.json() : null
    };
  } catch (error) {
    results.stats = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  try {
    // Test daily stats API
    const dailyResponse = await fetch(`${req.nextUrl.origin}/api/admin/daily-stats`);
    results.dailyStats = {
      status: dailyResponse.status,
      ok: dailyResponse.ok,
      data: dailyResponse.ok ? await dailyResponse.json() : null
    };
  } catch (error) {
    results.dailyStats = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  try {
    // Test users API
    const usersResponse = await fetch(`${req.nextUrl.origin}/api/admin/users`);
    results.users = {
      status: usersResponse.status,
      ok: usersResponse.ok,
      data: usersResponse.ok ? await usersResponse.json() : null
    };
  } catch (error) {
    results.users = { error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  return NextResponse.json(results);
}
