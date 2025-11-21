import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PocketBase from 'pocketbase';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Idempotency store (in production, use Redis or database)
const processedPayments = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId,
      amount,
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
      return NextResponse.json(
        { error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    // Verify signature (if webhook secret is set)
    if (WEBHOOK_SECRET) {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(text)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Idempotency check
    const idempotencyKey = `payment_${razorpay_payment_id}`;
    if (processedPayments.has(idempotencyKey)) {
      return NextResponse.json({ message: 'Payment already processed' });
    }

    // Capture payment (amount is optional - will capture full amount if not specified)
    let payment;
    try {
      payment = await razorpay.payments.capture(
        razorpay_payment_id,
        amount || undefined
      );
    } catch (error: any) {
      // Payment might already be captured
      if (error.error?.code === 'BAD_REQUEST_ERROR' && error.error?.description?.includes('already captured')) {
        console.log('Payment already captured, proceeding with order update');
      } else {
        throw error;
      }
    }

    // Update order in PocketBase
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    await pb.collection('orders').update(orderId, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'accepted', // Mark as accepted after payment
      timestamps: {
        acceptedAt: new Date().toISOString(),
      },
    });

    // Mark as processed
    processedPayments.add(idempotencyKey);

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Payment capture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture payment' },
      { status: 500 }
    );
  }
}



