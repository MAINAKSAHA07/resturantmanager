import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, orderId } = body;

    const razorpayOrder = await razorpay.orders.create({
      amount: amount, // in paise
      currency: 'INR',
      receipt: `order_${orderId}`,
      notes: {
        orderId,
      },
    });

    return NextResponse.json({
      razorpay_order_id: razorpayOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Razorpay order' },
      { status: 500 }
    );
  }
}



