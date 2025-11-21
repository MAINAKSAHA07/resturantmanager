import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';
import { generateInvoiceFromOrder, generateInvoiceHTML } from '@restaurant/lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    const pb = await createPocketBaseAdminClient();

    // Get order
    const order = await pb.collection('orders').getOne(orderId, {
      expand: 'locationId,customerId',
    });

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

    // In production, convert HTML to PDF using a library like puppeteer or pdfkit
    // For now, return HTML (can be converted client-side or server-side)
    
    // Store invoice PDF in PocketBase (would need to convert HTML to PDF first)
    // const pdfBuffer = await convertHTMLToPDF(invoiceHTML);
    // const formData = new FormData();
    // formData.append('invoicePdf', new Blob([pdfBuffer], { type: 'application/pdf' }), 'invoice.pdf');
    // await pb.collection('order').update(orderId, { invoicePdf: formData });

    return NextResponse.json({
      invoiceNumber: invoiceData.invoiceNumber,
      html: invoiceHTML,
      data: invoiceData,
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}



