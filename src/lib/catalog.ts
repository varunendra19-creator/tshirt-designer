// Master product catalog for Campus Mode (Indian college students, 18-25).
// Used by /shop, /products/[slug], /category/[slug], cart, and the home sections.
// Prices are INR (whole rupees). `image` resolves through imageLinks.json.

import { img } from "./images";

export type CategoryId =
  | "oversized"
  | "printed"
  | "plain"
  | "hoodies"
  | "sneakers"
  | "accessories"
  | "bottoms";

export type Product = {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  badge?: "NEW" | "BESTSELLER" | "SALE";
  category: CategoryId;
  sizes: string[];
  swatches: string[];
  image: string;
  tone: string;
  description: string;
  /** Optional per-colour photo: hex swatch → image URL (shown when that colour is picked). */
  colorImages?: Record<string, string>;
};

const TEE = ["S", "M", "L", "XL", "XXL"];
const WAIST = ["28", "30", "32", "34", "36"];
const SHOE = ["6", "7", "8", "9", "10", "11"];
const ONE = ["Free Size"];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  oversized: "Oversized",
  printed: "Printed Tees",
  plain: "Plain Tees",
  hoodies: "Hoodies",
  sneakers: "Sneakers",
  accessories: "Accessories",
  bottoms: "Bottoms",
};

const COLOR_NAMES: Record<string, string> = {
  "#1f2937": "Charcoal",
  "#16150f": "Black",
  "#f4f0e6": "White",
  "#eae5d7": "Off White",
  "#2b2f5e": "Navy",
  "#556b2f": "Olive",
  "#8a8f98": "Grey",
  "#7c3aed": "Violet",
  "#22d3ee": "Aqua",
  "#fb923c": "Orange",
  "#34d399": "Mint",
  "#3b82f6": "Blue",
  "#7a2f3a": "Maroon",
  "#d9c8a9": "Beige",
  "#e8b83a": "Mustard",
};

export const colorName = (hex: string): string => COLOR_NAMES[hex.toLowerCase()] || "Colour";

export const PRODUCTS: Product[] = [
  {
    id: "urban-graphic-tee",
    name: "Urban Graphic Tee",
    price: 999,
    compareAt: 1399,
    rating: 4.7,
    reviews: 128,
    badge: "BESTSELLER",
    category: "printed",
    sizes: TEE,
    swatches: ["#1f2937", "#556b2f", "#2b2f5e", "#f4f0e6"],
    image: img("p-urban-graphic"),
    tone: "linear-gradient(160deg,#2a2d34,#0e0f13)",
    description:
      "Bold street-style graphic on 100% combed cotton. A relaxed everyday fit that survives back-to-back lectures and late nights.",
  },
  {
    id: "relaxed-cargo",
    name: "Relaxed Cargo Pants",
    price: 1499,
    compareAt: 2199,
    rating: 4.8,
    reviews: 96,
    badge: "BESTSELLER",
    category: "bottoms",
    sizes: WAIST,
    swatches: ["#d9c8a9", "#1f2937", "#556b2f"],
    image: img("p-relaxed-cargo"),
    tone: "linear-gradient(160deg,#c8b990,#7a6c45)",
    description:
      "Utility cargos with a relaxed drop and plenty of pockets. Campus-to-cafe comfort in a durable cotton blend.",
  },
  {
    id: "premium-hoodie",
    name: "Premium Hoodie",
    price: 1799,
    compareAt: 2599,
    rating: 4.6,
    reviews: 78,
    category: "hoodies",
    sizes: TEE,
    swatches: ["#1f2937", "#7c3aed", "#8a8f98"],
    image: img("p-premium-hoodie"),
    tone: "linear-gradient(160deg,#2b2d3a,#12131a)",
    description:
      "Heavyweight 320 GSM fleece hoodie with a brushed inner. Warm, cosy and made for hostel winters.",
  },
  {
    id: "campus-sneakers",
    name: "Campus Sneakers",
    price: 2299,
    compareAt: 3399,
    rating: 4.9,
    reviews: 210,
    badge: "BESTSELLER",
    category: "sneakers",
    sizes: SHOE,
    swatches: ["#f4f0e6", "#1f2937", "#556b2f"],
    image: img("p-campus-sneakers"),
    tone: "linear-gradient(160deg,#e7e3d8,#b4b0a4)",
    description:
      "Clean low-top sneakers with a cushioned sole. Goes with every fit, all day, every day.",
  },
  {
    id: "focus-graphic-tee",
    name: "Focus Graphic Tee",
    price: 799,
    compareAt: 1099,
    rating: 4.8,
    reviews: 111,
    category: "printed",
    sizes: TEE,
    swatches: ["#eae5d7", "#1f2937", "#22d3ee"],
    image: img("p-focus-graphic"),
    tone: "linear-gradient(160deg,#eae5d7,#b4a98c)",
    description:
      "Minimal ‘FOCUS’ print on a soft breathable tee. Quietly motivational, endlessly wearable.",
  },
  {
    id: "good-things-tee",
    name: "Good Things Tee",
    price: 699,
    compareAt: 999,
    rating: 4.7,
    reviews: 110,
    badge: "SALE",
    category: "printed",
    sizes: TEE,
    swatches: ["#1f2937", "#fb923c", "#f4f0e6"],
    image: img("p-good-things"),
    tone: "linear-gradient(160deg,#2a2530,#131017)",
    description:
      "‘Good Things Take Time’ — a feel-good graphic tee in premium cotton. Your new go-to.",
  },
  {
    id: "minimal-tee",
    name: "Minimal Tee",
    price: 899,
    rating: 4.7,
    reviews: 64,
    badge: "NEW",
    category: "plain",
    sizes: TEE,
    swatches: ["#f4f0e6", "#1f2937", "#8a8f98", "#22d3ee"],
    image: img("p-minimal-tee"),
    tone: "linear-gradient(160deg,#eef0f2,#c7ccd2)",
    description:
      "The perfect blank canvas. Mid-weight combed cotton with a clean, structured fit.",
  },
  {
    id: "washed-hoodie",
    name: "Washed Hoodie",
    price: 1699,
    rating: 4.8,
    reviews: 52,
    badge: "NEW",
    category: "hoodies",
    sizes: TEE,
    swatches: ["#1f2937", "#556b2f", "#8a8f98"],
    image: img("p-washed-hoodie"),
    tone: "linear-gradient(160deg,#23252e,#0f1014)",
    description:
      "Vintage acid-washed hoodie with a lived-in feel. Soft, slouchy and effortlessly cool.",
  },
  {
    id: "oversized-shirt",
    name: "Oversized Shirt",
    price: 1199,
    rating: 4.6,
    reviews: 40,
    badge: "NEW",
    category: "oversized",
    sizes: TEE,
    swatches: ["#f4f0e6", "#3b82f6", "#1f2937"],
    image: img("p-oversized-shirt"),
    tone: "linear-gradient(160deg,#eae7de,#b7b2a4)",
    description:
      "Boxy oversized shirt with a dropped shoulder. Layer it, knot it, own it.",
  },
  {
    id: "back-print-tee",
    name: "Back Print Tee",
    price: 849,
    rating: 4.7,
    reviews: 38,
    badge: "NEW",
    category: "printed",
    sizes: TEE,
    swatches: ["#7a2f3a", "#1f2937", "#22d3ee"],
    image: img("p-back-print"),
    tone: "linear-gradient(160deg,#3a2530,#16121a)",
    description:
      "Statement back graphic that turns heads. Front-clean, back-loud — the best of both.",
  },
  {
    id: "classic-white-tee",
    name: "Classic White Tee",
    price: 599,
    rating: 4.6,
    reviews: 300,
    category: "plain",
    sizes: TEE,
    swatches: ["#f4f0e6", "#eae5d7"],
    image: img("p-classic-white"),
    tone: "linear-gradient(160deg,#f2f0ea,#cfccc2)",
    description:
      "A wardrobe essential done right. Pre-shrunk, bio-washed and built to last wash after wash.",
  },
  {
    id: "campus-cap",
    name: "Campus Cap",
    price: 499,
    rating: 4.5,
    reviews: 90,
    category: "accessories",
    sizes: ONE,
    swatches: ["#1f2937", "#556b2f", "#7c3aed"],
    image: img("p-campus-cap"),
    tone: "linear-gradient(160deg,#2a2d34,#101114)",
    description:
      "Adjustable 6-panel cap to finish any fit. One size, all vibes.",
  },
  {
    id: "campus-crop-tee",
    name: "Campus Crop Tee",
    price: 749,
    rating: 4.8,
    reviews: 120,
    category: "printed",
    sizes: TEE,
    swatches: ["#fb923c", "#f4f0e6", "#7c3aed"],
    image: img("p-women-tee"),
    tone: "linear-gradient(160deg,#f6cda0,#c98a4f)",
    description:
      "A cropped relaxed fit with a fresh print. Made to pair with high-waist everything.",
  },
  {
    id: "street-combo",
    name: "Street Combo (2 Tees)",
    price: 1299,
    compareAt: 1798,
    rating: 4.7,
    reviews: 85,
    badge: "SALE",
    category: "printed",
    sizes: TEE,
    swatches: ["#1f2937", "#22d3ee", "#fb923c"],
    image: img("p-street-combo"),
    tone: "linear-gradient(160deg,#7c3aed,#22d3ee)",
    description:
      "Two premium graphic tees, one student-friendly price. Mix, match and save.",
  },
];

export const getProduct = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const productsByCategory = (cat: CategoryId): Product[] =>
  PRODUCTS.filter((p) => p.category === cat);

export const relatedProducts = (p: Product, n = 4): Product[] =>
  PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category)
    .concat(PRODUCTS.filter((x) => x.id !== p.id && x.category !== p.category))
    .slice(0, n);

const byId = (id: string) => getProduct(id)!;

// Spec-defined curated rows.
export const TRENDING = [
  "urban-graphic-tee",
  "relaxed-cargo",
  "premium-hoodie",
  "campus-sneakers",
  "focus-graphic-tee",
  "good-things-tee",
].map(byId);

export const NEW_ARRIVALS = [
  "minimal-tee",
  "washed-hoodie",
  "oversized-shirt",
  "back-print-tee",
].map(byId);

export const FEATURED_PRODUCTS = TRENDING;
