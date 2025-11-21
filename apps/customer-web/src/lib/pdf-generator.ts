import jsPDF from 'jspdf';

interface OrderItem {
  id: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: number;
  optionsSnapshot?: any;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  taxCgst: number;
  taxSgst: number;
  taxIgst: number;
  channel: string;
  created: string;
  timestamps: Record<string, string>;
  expand?: {
    locationId?: { name: string };
    orderItem?: OrderItem[];
  };
}

export function generateOrderSummaryPDF(order: Order): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Summary', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Order Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 40);
  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', margin + 5, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Order ID: ${order.id}`, margin + 5, yPosition);
  yPosition += 6;

  const orderDate = new Date(order.created).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Order Date: ${orderDate}`, margin + 5, yPosition);
  yPosition += 6;

  doc.text(`Status: ${order.status.replace('_', ' ').toUpperCase()}`, margin + 5, yPosition);
  yPosition += 6;

  doc.text(`Channel: ${order.channel}`, margin + 5, yPosition);
  yPosition += 15;

  // Order Items
  const orderItems = order.expand?.orderItem || [];
  
  if (orderItems.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Order Items', margin, yPosition);
    yPosition += 10;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    yPosition += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Item', margin + 5, yPosition);
    doc.text('Qty', margin + 100, yPosition);
    doc.text('Price', margin + 130, yPosition);
    doc.text('Total', pageWidth - margin - 30, yPosition, { align: 'right' });
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    orderItems.forEach((item) => {
      checkPageBreak(15);
      
      const itemName = item.nameSnapshot.length > 30 
        ? item.nameSnapshot.substring(0, 27) + '...' 
        : item.nameSnapshot;
      const unitPrice = (item.unitPrice / 100).toFixed(2);
      const itemTotal = ((item.unitPrice * item.qty) / 100).toFixed(2);

      doc.text(itemName, margin + 5, yPosition);
      doc.text(item.qty.toString(), margin + 100, yPosition);
      doc.text(`₹${unitPrice}`, margin + 130, yPosition);
      doc.text(`₹${itemTotal}`, pageWidth - margin - 5, yPosition, { align: 'right' });
      yPosition += 7;

      // Add options if any
      if (item.optionsSnapshot && Array.isArray(item.optionsSnapshot) && item.optionsSnapshot.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        item.optionsSnapshot.forEach((opt: any) => {
          const optText = `  • ${opt.groupId || 'Option'}: ${Array.isArray(opt.valueIds) ? opt.valueIds.join(', ') : opt.valueIds}`;
          if (optText.length > 50) {
            const lines = doc.splitTextToSize(optText, pageWidth - 2 * margin - 10);
            lines.forEach((line: string) => {
              checkPageBreak(6);
              doc.text(line, margin + 10, yPosition);
              yPosition += 5;
            });
          } else {
            checkPageBreak(6);
            doc.text(optText, margin + 10, yPosition);
            yPosition += 5;
          }
        });
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        yPosition += 2;
      }
    });

    yPosition += 5;
  }

  // Totals
  checkPageBreak(40);
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 35);
  yPosition += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', pageWidth - margin - 60, yPosition, { align: 'right' });
  doc.text(`₹${(order.subtotal / 100).toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
  yPosition += 7;

  if (order.taxCgst > 0 || order.taxSgst > 0) {
    if (order.taxCgst > 0) {
      doc.text('CGST:', pageWidth - margin - 60, yPosition, { align: 'right' });
      doc.text(`₹${(order.taxCgst / 100).toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
      yPosition += 7;
    }
    if (order.taxSgst > 0) {
      doc.text('SGST:', pageWidth - margin - 60, yPosition, { align: 'right' });
      doc.text(`₹${(order.taxSgst / 100).toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
      yPosition += 7;
    }
  }

  if (order.taxIgst > 0) {
    doc.text('IGST:', pageWidth - margin - 60, yPosition, { align: 'right' });
    doc.text(`₹${(order.taxIgst / 100).toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
    yPosition += 7;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', pageWidth - margin - 60, yPosition, { align: 'right' });
  doc.text(`₹${(order.total / 100).toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
  yPosition += 10;

  // Footer
  checkPageBreak(15);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your order!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('This is an order summary. For invoice, please contact the restaurant.', pageWidth / 2, yPosition, { align: 'center' });

  // Generate filename
  const orderDateStr = new Date(order.created).toISOString().split('T')[0];
  const filename = `Order_${order.id.slice(0, 8)}_${orderDateStr}.pdf`;

  // Save PDF
  doc.save(filename);
}

