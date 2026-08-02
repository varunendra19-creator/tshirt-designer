"use client";

import { inr } from "@/lib/format";
import { SELLER, amountInWords } from "@/lib/invoice";
import type { Order } from "./OrdersClient";

/* GST-compliant, print-ready invoice. Prices are GST-inclusive, so:
   taxable value = subtotal − tax; intra-state split → CGST = SGST = tax/2. */
export function InvoiceModal({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const taxable = Math.max(0, (o.subtotal || 0) - (o.tax || 0));
  const halfTax = (o.tax || 0) / 2;
  const invNo = `INV-${o.order_no}`;
  const date = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="w-full max-w-3xl">
        {/* toolbar (hidden in print) */}
        <div className="no-print mb-3 flex items-center justify-between">
          <button onClick={onClose} className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold">← Close</button>
          <button onClick={() => window.print()} className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white">🖨️ Print / Save PDF</button>
        </div>

        {/* the invoice sheet */}
        <div id="invoice-print" className="rounded-xl bg-white p-8 text-[13px] text-[#1a1a1a] shadow-2xl print:rounded-none print:shadow-none">
          {/* header */}
          <div className="flex items-start justify-between border-b-2 border-[#111] pb-4">
            <div>
              <p className="text-xl font-extrabold tracking-tight">{SELLER.name}</p>
              <p className="mt-1 whitespace-pre-line text-[12px] text-[#555]">{SELLER.legal}{"\n"}{SELLER.address}</p>
              <p className="mt-1 text-[12px] text-[#555]">GSTIN: {SELLER.gstin}</p>
              <p className="text-[12px] text-[#555]">{SELLER.email} · {SELLER.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold uppercase tracking-widest text-[#111]">Tax Invoice</p>
              <p className="mt-1 text-[12px]"><b>{invNo}</b></p>
              <p className="text-[12px] text-[#555]">Date: {date}</p>
              <p className="text-[12px] text-[#555]">Order: #{o.order_no}</p>
            </div>
          </div>

          {/* bill / ship to */}
          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#888]">Bill / Ship To</p>
              <p className="mt-1 font-bold">{o.customer_name}</p>
              <p className="text-[12px] text-[#444]">{o.address}, {o.city}</p>
              <p className="text-[12px] text-[#444]">{o.state} – {o.pincode}</p>
              <p className="text-[12px] text-[#444]">{o.phone}{o.email ? ` · ${o.email}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#888]">Payment</p>
              <p className="mt-1 text-[12px]">Method: <b>{o.payment_method?.toUpperCase()}</b></p>
              <p className="text-[12px]">Status: <b className="capitalize">{o.payment_status?.replace(/_/g, " ")}</b></p>
              {o.refund_amount ? <p className="text-[12px] text-[#b91c1c]">Refunded: {inr(o.refund_amount)}</p> : null}
            </div>
          </div>

          {/* line items */}
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#f3f3f3] text-left">
                <th className="border border-[#ddd] px-2 py-1.5">#</th>
                <th className="border border-[#ddd] px-2 py-1.5">Item</th>
                <th className="border border-[#ddd] px-2 py-1.5 text-center">HSN</th>
                <th className="border border-[#ddd] px-2 py-1.5 text-center">Qty</th>
                <th className="border border-[#ddd] px-2 py-1.5 text-right">Rate</th>
                <th className="border border-[#ddd] px-2 py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {o.order_items.map((it, i) => (
                <tr key={it.id}>
                  <td className="border border-[#ddd] px-2 py-1.5">{i + 1}</td>
                  <td className="border border-[#ddd] px-2 py-1.5">
                    {it.name}
                    {(it.size || it.color) && <span className="text-[#888]"> · {[it.size, it.color].filter(Boolean).join(" / ")}</span>}
                    {it.is_custom ? <span className="ml-1 rounded bg-[#efe7ff] px-1 text-[10px] font-bold text-[var(--primary)]">CUSTOM</span> : null}
                  </td>
                  <td className="border border-[#ddd] px-2 py-1.5 text-center">{SELLER.hsn}</td>
                  <td className="border border-[#ddd] px-2 py-1.5 text-center">{it.qty}</td>
                  <td className="border border-[#ddd] px-2 py-1.5 text-right">{inr(it.unit_price ?? Math.round(it.line_total / Math.max(1, it.qty)))}</td>
                  <td className="border border-[#ddd] px-2 py-1.5 text-right">{inr(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* totals */}
          <div className="mt-4 flex justify-end">
            <table className="text-[12px]">
              <tbody>
                <Row label="Taxable value" value={inr(taxable)} />
                <Row label="CGST" value={inr(halfTax)} />
                <Row label="SGST" value={inr(halfTax)} />
                <Row label="Shipping" value={o.shipping ? inr(o.shipping) : "Free"} />
                <tr className="border-t-2 border-[#111]">
                  <td className="py-1.5 pr-8 text-right font-extrabold">Grand Total</td>
                  <td className="py-1.5 text-right font-extrabold">{inr(o.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[12px]"><b>Amount in words:</b> {amountInWords(o.total)}</p>

          {/* footer */}
          <div className="mt-6 flex items-end justify-between border-t border-[#eee] pt-4">
            <div className="text-[11px] text-[#888]">
              <p>Prices are inclusive of GST. This is a computer-generated invoice.</p>
              <p>Goods once sold with a custom print are non-returnable unless defective.</p>
            </div>
            <div className="text-center text-[11px] text-[#555]">
              <div className="mb-1 h-10 w-40 border-b border-[#bbb]" />
              For {SELLER.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 pr-8 text-right text-[#555]">{label}</td>
      <td className="py-1 text-right font-semibold">{value}</td>
    </tr>
  );
}
