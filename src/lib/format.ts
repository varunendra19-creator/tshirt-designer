// Shared formatting + storefront constants.

// Indian rupee formatter: ₹799, ₹1,299 (en-IN grouping), no paise.
export const inr = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Free-shipping threshold (INR), referenced in copy and checkout.
export const FREE_SHIP_OVER = 999;

// Flat shipping fee below the threshold.
export const SHIPPING_FEE = 79;
