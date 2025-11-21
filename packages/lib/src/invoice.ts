/**
 * GST Invoice PDF Generation
 * Note: This is a simplified implementation. In production, use a proper PDF library like pdfkit or puppeteer
 */

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  orderId: string;
  location: {
    name: string;
    address: any;
    gstin: string;
    stateCode: string;
  };
  customer?: {
    name: string;
    email?: string;
  };
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    tax: number;
  }>;
  subtotal: number;
  taxCgst: number;
  taxSgst: number;
  taxIgst: number;
  total: number;
}

/**
 * Generate invoice number (format: LOC-YYYY-XXXXX)
 */
export function generateInvoiceNumber(
  locationId: string,
  fiscalYear: string,
  sequence: number
): string {
  const prefix = locationId.slice(0, 3).toUpperCase();
  return `${prefix}-${fiscalYear}-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Generate invoice HTML (can be converted to PDF)
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const fiscalYear = new Date(data.date).getFullYear().toString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .company-info, .customer-info {
      flex: 1;
    }
    .company-info h3, .customer-info h3 {
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      float: right;
      width: 300px;
    }
    .totals table {
      margin: 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .gst-summary {
      margin-top: 20px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TAX INVOICE</h1>
    <p><strong>Invoice No:</strong> ${data.invoiceNumber}</p>
    <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-IN')}</p>
    <p><strong>Order ID:</strong> ${data.orderId}</p>
  </div>

  <div class="invoice-info">
    <div class="company-info">
      <h3>From:</h3>
      <p><strong>${data.location.name}</strong></p>
      <p>${data.location.address?.street || ''}</p>
      <p>${data.location.address?.city || ''}, ${data.location.address?.state || ''} ${data.location.address?.zip || ''}</p>
      <p><strong>GSTIN:</strong> ${data.location.gstin}</p>
    </div>
    <div class="customer-info">
      <h3>Bill To:</h3>
      ${data.customer ? `
        <p><strong>${data.customer.name}</strong></p>
        ${data.customer.email ? `<p>${data.customer.email}</p>` : ''}
      ` : '<p>Guest Customer</p>'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Tax Rate</th>
        <th class="text-right">Tax</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right">₹${(item.unitPrice / 100).toFixed(2)}</td>
          <td class="text-right">${item.taxRate}%</td>
          <td class="text-right">₹${(item.tax / 100).toFixed(2)}</td>
          <td class="text-right">₹${(item.subtotal / 100).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td><strong>Subtotal:</strong></td>
        <td class="text-right">₹${(data.subtotal / 100).toFixed(2)}</td>
      </tr>
      ${data.taxCgst > 0 ? `
        <tr>
          <td>CGST:</td>
          <td class="text-right">₹${(data.taxCgst / 100).toFixed(2)}</td>
        </tr>
      ` : ''}
      ${data.taxSgst > 0 ? `
        <tr>
          <td>SGST:</td>
          <td class="text-right">₹${(data.taxSgst / 100).toFixed(2)}</td>
        </tr>
      ` : ''}
      ${data.taxIgst > 0 ? `
        <tr>
          <td>IGST:</td>
          <td class="text-right">₹${(data.taxIgst / 100).toFixed(2)}</td>
        </tr>
      ` : ''}
      <tr>
        <td><strong>Total:</strong></td>
        <td class="text-right"><strong>₹${(data.total / 100).toFixed(2)}</strong></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>This is a computer-generated invoice and is valid without signature.</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate invoice data from order
 * This should be called after order is completed
 */
export async function generateInvoiceFromOrder(
  order: any,
  orderItems: any[],
  location: any,
  customer?: any
): Promise<InvoiceData> {
  // Generate invoice number (simplified - in production, use a sequence counter)
  const fiscalYear = new Date().getFullYear().toString();
  const sequence = Math.floor(Math.random() * 10000); // In production, use database sequence
  const invoiceNumber = generateInvoiceNumber(location.id, fiscalYear, sequence);

  const items = orderItems.map((item) => {
    const itemSubtotal = item.unitPrice * item.qty;
    const taxRate = 5; // Should come from menu item
    const tax = Math.round(itemSubtotal * (taxRate / 100));

    return {
      name: item.nameSnapshot,
      qty: item.qty,
      unitPrice: item.unitPrice,
      taxRate,
      subtotal: itemSubtotal,
      tax,
    };
  });

  return {
    invoiceNumber,
    date: order.created || new Date().toISOString(),
    orderId: order.id,
    location: {
      name: location.name,
      address: location.address,
      gstin: location.gstin,
      stateCode: location.stateCode,
    },
    customer: customer
      ? {
          name: customer.name,
          email: customer.email,
        }
      : undefined,
    items,
    subtotal: order.subtotal,
    taxCgst: order.taxCgst,
    taxSgst: order.taxSgst,
    taxIgst: order.taxIgst,
    total: order.total,
  };
}



