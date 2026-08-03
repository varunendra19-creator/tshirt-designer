// Invoice helpers — seller identity + amount-in-words (Indian numbering).

export const SELLER = {
  name: process.env.NEXT_PUBLIC_SELLER_NAME || "Campus Mode",
  legal: process.env.NEXT_PUBLIC_SELLER_LEGAL || "Campus Mode Apparel",
  address: process.env.NEXT_PUBLIC_SELLER_ADDRESS || "Bengaluru, Karnataka 560001, India",
  gstin: process.env.NEXT_PUBLIC_SELLER_GSTIN || "29ABCDE1234F1Z5",
  email: process.env.NEXT_PUBLIC_SELLER_EMAIL || "support@campusmode.in",
  phone: process.env.NEXT_PUBLIC_SELLER_PHONE || "+91 00000 00000",
  hsn: process.env.NEXT_PUBLIC_SELLER_HSN || "6109", // T-shirts, singlets & vests, knitted
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

/** 123456 → "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees Only" */
export function amountInWords(rupees: number): string {
  let n = Math.round(Math.abs(rupees));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(twoDigits(n));
  return `${parts.join(" ")} Rupees Only`;
}
