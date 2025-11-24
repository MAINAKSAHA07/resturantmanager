import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import PocketBase from 'pocketbase';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Idempotency store (in production, use Redis or database)
const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const text = JSON.stringify(body);
    const generatedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = body.event;
    const payment = body.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ message: 'No payment data' });
    }

    // Idempotency check
    const eventId = body.event_id || payment.id;
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ message: 'Event already processed' });
    }

    // Process webhook event
    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    if (event === 'payment.captured') {
      // Find order by razorpay order ID
      const orders = await pb.collection('orders').getList(1, 1, {
        filter: `razorpayOrderId = "${payment.order_id}"`,
      });

      if (orders.items.length > 0) {
        const order = orders.items[0];
        await pb.collection('orders').update(order.id, {
          razorpayPaymentId: payment.id,
          status: 'accepted', // Auto-accept paid orders
        });
      }
    }

    // Mark as processed
    processedEvents.add(eventId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}



