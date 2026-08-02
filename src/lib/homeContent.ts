// Home-page content for Campus Mode (college students 18-25).
// Product data + utils live in catalog.ts / format.ts / images.ts; re-exported
// here for convenience.

import { inr as _inr } from "./format";
import { img as _img } from "./images";
import type { Product } from "./catalog";

export const inr = _inr;
export const img = _img;
export type { Product };

export const PROMO = {
  shipping: "FREE SHIPPING on Prepaid Orders Above ₹999",
  code: "CAMPUS10",
  codeText: "Use Code: CAMPUS10 & Get 10% OFF",
};

export const NAV = [
  { label: "Men", href: "/shop" },
  { label: "Women", href: "/shop" },
  { label: "Oversized", href: "/category/oversized" },
  { label: "Hoodies", href: "/category/hoodies" },
  { label: "Accessories", href: "/category/accessories" },
  { label: "Sneakers", href: "/category/sneakers" },
  { label: "Custom T-Shirt", href: "/customize", star: true },
  { label: "Sale", href: "/sale", hot: true },
];

export const CATEGORY_STRIP = [
  { label: "Oversized Tees", key: "cat-oversized", href: "/category/oversized", bg: "#ece7fe" },
  { label: "Cargo Pants", key: "p-relaxed-cargo", href: "/category/bottoms", bg: "#fce6de" },
  { label: "Hoodies", key: "cat-hoodies", href: "/category/hoodies", bg: "#e2f2e8" },
  { label: "Sneakers", key: "p-campus-sneakers", href: "/category/sneakers", bg: "#e2ecfb" },
  { label: "Printed Tees", key: "cat-printed", href: "/category/printed", bg: "#fdf2d4" },
  { label: "Accessories", key: "cat-accessories", href: "/category/accessories", bg: "#fbe4ef" },
];

export const HERO_TRUST = [
  { icon: "rupee", text: "Student Pricing" },
  { icon: "refresh", text: "7-Day Returns" },
  { icon: "truck", text: "Free Shipping ₹999+" },
];

export const BUILDER = {
  basePrice: 399, // Regular Fit + 180 GSM
  features: [
    "Add Your Text & Quotes",
    "Upload Your Image or Logo",
    "Choose Colors & Fonts",
    "High Quality Printing",
    "Express Yourself",
    "No limits, just creativity!",
  ],
  tools: [
    { icon: "text", label: "Text" },
    { icon: "grid", label: "Icons" },
    { icon: "image", label: "Images" },
    { icon: "upload", label: "Upload" },
    { icon: "palette", label: "Colors" },
  ],
  // add = price premium (₹) over the base — realistic custom-tee deltas
  styles: [
    { name: "Regular Fit", add: 0 },
    { name: "Oversized Fit", add: 150 },
    { name: "Drop Shoulder", add: 200 },
    { name: "Pocket Tee", add: 120 },
  ],
  fabrics: [
    { gsm: "180 GSM", note: "100% Cotton", add: 0 },
    { gsm: "200 GSM", note: "Bio Washed", add: 80 },
    { gsm: "240 GSM", note: "Premium Cotton", add: 150 },
    { gsm: "260 GSM", note: "Heavy Weight", add: 250 },
  ],
  colors: ["#1f2937", "#f4f0e6", "var(--danger)", "#f59e0b", "#10b981", "var(--aqua)", "var(--info)", "var(--primary)"],
};

export const TRUST_ICONS = [
  { icon: "shirt", title: "Premium Fabric", sub: "Comfort that lasts" },
  { icon: "refresh", title: "Easy Returns", sub: "Hassle free returns" },
  { icon: "tag", title: "Student Friendly Prices", sub: "Best style, best prices" },
  { icon: "truck", title: "Fast Delivery", sub: "Quick & reliable" },
  { icon: "shield", title: "Secure Payments", sub: "100% safe checkout" },
];

export const OUTFITS = [
  { label: "Library Look", sub: "Minimal & Smart", key: "outfit-library" },
  { label: "Cafe Fit", sub: "Chill & Stylish", key: "outfit-coffee" },
  { label: "Campus Casual", sub: "Everyday Fit", key: "outfit-campus" },
  { label: "Friday Night", sub: "Out & About", key: "p-urban-graphic" },
  { label: "Presentation Day", sub: "Smart Casual", key: "cat-plain" },
  { label: "Weekend Trip", sub: "Relaxed & Trendy", key: "outfit-weekend" },
];

// Campus Looks strip — same imagery, editable labels for the everyday-style row.
export const CAMPUS_LOOKS = [
  { label: "Library Look", sub: "Minimal, Focused. You.", key: "outfit-library" },
  { label: "Coffee Run", sub: "Comfortable & Cool.", key: "outfit-coffee" },
  { label: "Classroom Fit", sub: "Simple Yet Stylish.", key: "outfit-campus" },
  { label: "Weekend Vibes", sub: "Relaxed & Trendy.", key: "outfit-weekend" },
  { label: "Event Ready", sub: "Stand Out. Be You.", key: "p-urban-graphic" },
  { label: "Hostel Life", sub: "Easy, Breezy. Real.", key: "cat-plain" },
];

export const TESTIMONIALS = [
  { name: "Rohit Sharma", college: "DTU, Delhi", key: "testi-1", quote: "The print quality is insane! My go-to brand for college tees." },
  { name: "Ananya Singh", college: "Christ University, Bangalore", key: "testi-2", quote: "Designed my own tee and got so many compliments!" },
  { name: "Karan Mehta", college: "VIT, Vellore", key: "testi-3", quote: "Super comfy fabric and perfect for daily college fits." },
  { name: "Priya Nair", college: "NMIMS, Mumbai", key: "outfit-coffee", quote: "The oversized fit is exactly as shown — absolutely obsessed!" },
  { name: "Arjun Reddy", college: "BITS Pilani", key: "cat-men", quote: "Fast delivery and the cotton feels genuinely premium. 10/10." },
  { name: "Sneha Iyer", college: "Amity, Noida", key: "p-good-things", quote: "Designed custom hoodies for our fest — turned out amazing." },
  { name: "Rahul Verma", college: "DTU, Delhi", key: "outfit-library", quote: "Best prices for this quality, honestly unbeatable for students." },
  { name: "Ishita Gupta", college: "Christ University", key: "cat-women", quote: "Colours don't fade even after 20 washes. Total value for money." },
  { name: "Aditya Jain", college: "VIT, Vellore", key: "p-premium-hoodie", quote: "Ordered for my whole hostel squad — everyone's super happy!" },
];

export const COLLEGES = [
  { name: "DTU", logo: "/logos/dtu.png" },
  { name: "VIT", logo: "/logos/vit.png" },
  { name: "CHRIST", logo: "/logos/christ.png" },
  { name: "BITS PILANI", logo: "/logos/bits.png" },
  { name: "NMIMS", logo: "/logos/nmims.png" },
  { name: "AMITY", logo: "/logos/amity.png" },
];
