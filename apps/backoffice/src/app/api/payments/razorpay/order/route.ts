import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json(
                { error: 'Razorpay is not configured. Please use Place Order option instead.' },
                { status: 503 }
            );
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

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
            key: keyId,
        });
    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create Razorpay order' },
            { status: 500 }
        );
    }
}
