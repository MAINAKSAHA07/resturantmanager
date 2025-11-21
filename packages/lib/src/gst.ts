import { multiply, divide, round } from './money';

export interface GSTCalculation {
  cgst: number; // paise
  sgst: number; // paise
  igst: number; // paise
  totalTax: number; // paise
}

/**
 * Calculate GST based on location state and customer state
 * If same state: CGST + SGST (split equally)
 * If different state: IGST (full amount)
 */
export function calculateGST(
  subtotal: number, // paise
  taxRate: number, // percentage (e.g., 5, 12, 18)
  locationStateCode: string,
  customerStateCode?: string
): GSTCalculation {
  const taxMultiplier = taxRate / 100;
  const totalTax = round(multiply(subtotal, taxMultiplier));

  if (customerStateCode && locationStateCode === customerStateCode) {
    // Same state: CGST + SGST (split equally)
    const halfTax = divide(totalTax, 2);
    return {
      cgst: halfTax,
      sgst: halfTax,
      igst: 0,
      totalTax,
    };
  } else {
    // Different state or no customer state: IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
    };
  }
}

/**
 * Calculate GST for multiple line items with different rates
 */
export function calculateGSTForItems(
  items: Array<{ subtotal: number; taxRate: number }>,
  locationStateCode: string,
  customerStateCode?: string
): GSTCalculation {
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  for (const item of items) {
    const gst = calculateGST(
      item.subtotal,
      item.taxRate,
      locationStateCode,
      customerStateCode
    );
    totalCgst += gst.cgst;
    totalSgst += gst.sgst;
    totalIgst += gst.igst;
    totalTax += gst.totalTax;
  }

  return {
    cgst: round(totalCgst),
    sgst: round(totalSgst),
    igst: round(totalIgst),
    totalTax: round(totalTax),
  };
}



