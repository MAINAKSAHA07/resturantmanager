import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Clear auth token on server side
  // Client side will clear localStorage
  return NextResponse.json({ success: true });
}

