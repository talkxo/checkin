import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('=== BASECAMP SENDER DATA TEST ===');
    console.log('Full request body:', JSON.stringify(body, null, 2));
    
    // Extract sender data
    let sender;
    if (body.type === 'chatbot_message') {
      sender = body.sender;
    } else if (body.command) {
      sender = {
        type: 'person',
        id: body.creator?.id,
        name: body.creator?.name,
        email_address: body.creator?.email_address,
        email: body.creator?.email_address
      };
    }
    
    console.log('Sender data:', JSON.stringify(sender, null, 2));
    
    // Test different lookup strategies
    const lookupStrategies = {
      byName: sender?.name || sender?.full_name,
      byEmail: sender?.email_address || sender?.email,
      byId: sender?.id,
      generatedSlug: sender?.name ? sender.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null
    };
    
    console.log('Lookup strategies:', JSON.stringify(lookupStrategies, null, 2));
    
    return NextResponse.json({
      message: 'Sender data analyzed',
      sender: sender,
      lookupStrategies: lookupStrategies,
      recommendations: {
        bestForCheckin: 'name (full_name)',
        bestForCheckout: 'generated slug from name',
        fallback: 'email if name not available'
      }
    });
    
  } catch (error) {
    console.error('Sender data test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
