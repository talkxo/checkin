import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authenticated = isAdminAuthenticated();
    
    if (authenticated) {
      return NextResponse.json({ 
        authenticated: true,
        message: 'Admin is authenticated'
      });
    } else {
      return NextResponse.json(
        { 
          authenticated: false,
          message: 'Admin not authenticated'
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Admin auth check error:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
