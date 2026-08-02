// GST for apparel in India. Listed prices are treated as GST-inclusive (MRP),
// so this returns the tax portion already contained in the subtotal — shown for
// transparency and stored on the order for invoices (task 3).
//
// Rate: 5% for a garment ≤ ₹1000, 12% above ₹1000 (per piece).

export function gstRate(unitPrice: number): number {
  return unitPrice > 1000 ? 0.12 : 0.05;
}

export function computeGST(lines: { price: number; qty: number }[]): number {
  let gst = 0;
  for (const l of lines) {
    const rate = gstRate(l.price);
    const lineTotal = l.price * l.qty;
    gst += lineTotal - lineTotal / (1 + rate);
  }
  return Math.round(gst);
}
