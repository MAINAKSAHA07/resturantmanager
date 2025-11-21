import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';
import { generateInvoiceFromOrder, generateInvoiceHTML } from '@restaurant/lib';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const pb = await createPocketBaseAdminClient();

    // Get order
    const order = await pb.collection('orders').getOne(orderId, {
      expand: 'locationId,customerId',
    });

    // Only generate invoice for completed orders
    if (order.status !== 'completed') {
      return NextResponse.json(
        { error: 'Invoice can only be generated for completed orders' },
        { status: 400 }
      );
    }

    // Get order items
    const orderItems = await pb.collection('orderItem').getList(1, 100, {
      filter: `orderId = "${orderId}"`,
    });

    // Get location
    const location = typeof order.expand?.locationId === 'object'
      ? order.expand.locationId
      : await pb.collection('location').getOne(order.locationId);

    // Get customer if exists
    const customer = order.customerId
      ? (typeof order.expand?.customerId === 'object'
          ? order.expand.customerId
          : await pb.collection('customer').getOne(order.customerId))
      : undefined;

    // Generate invoice data
    const invoiceData = await generateInvoiceFromOrder(
      order,
      orderItems.items,
      location,
      customer
    );

    // Generate HTML
    const invoiceHTML = generateInvoiceHTML(invoiceData);

    // Note: PDF generation requires a service like Puppeteer, Playwright, or a headless browser
    // For now, we'll store the HTML and convert to PDF on-demand or via a background job
    // In production, use a dedicated PDF service or convert HTML to PDF server-side
    
    // Store invoice HTML reference (you can convert to PDF later)
    // For now, return the HTML and let the client handle PDF generation if needed
    // Or use a service like @react-pdf/renderer for server-side PDF generation

    // Return invoice HTML (can be converted to PDF client-side or via a service)
    return NextResponse.json({
      success: true,
      invoiceNumber: invoiceData.invoiceNumber,
      html: invoiceHTML,
      data: invoiceData,
      message: 'Invoice generated successfully. PDF conversion can be done client-side or via a service.',
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

