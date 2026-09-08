import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Giphy API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(
      apiKey,
    )}&q=${encodeURIComponent('get well soon')}&limit=40&rating=g&lang=en`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch gif' }, { status: 502 });
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const nearSquare = items.filter((item: any) => {
      const original = item?.images?.original;
      const w = Number(original?.width || 0);
      const h = Number(original?.height || 0);
      if (!w || !h) return false;
      const ratio = w / h;
      return ratio >= 0.85 && ratio <= 1.15;
    });

    const pool = nearSquare.length > 0 ? nearSquare : items;
    if (!pool.length) {
      return NextResponse.json({ error: 'No gif found' }, { status: 404 });
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    const gifUrl = pick?.images?.downsized_medium?.url || pick?.images?.original?.url;

    if (!gifUrl) {
      return NextResponse.json({ error: 'No gif found' }, { status: 404 });
    }

    return NextResponse.json({ gifUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
