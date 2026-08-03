/** Shared constants + content data for the marketing / policy pages. */

export const SITE_URL = "https://campusmode.in";
export const SUPPORT_EMAIL = "support@campusmode.in";
export const SUPPORT_PHONE = "+91 90000 00000";
export const BRAND = "Campus Mode";
// NOTE for the merchant: replace with your registered legal entity, GSTIN & address before launch.
export const LEGAL_ENTITY = "Campus Mode";
export const SUPPORT_HOURS = "Mon–Sat, 10am–7pm IST";

export const FAQS: { q: string; a: string }[] = [
  {
    q: "How long does delivery take?",
    a: "Ready-to-ship styles are dispatched within 24–48 hours and reach you in 4–6 working days. Custom-printed pieces are made to order, so they take 2–3 extra days before dispatch. You'll get an email with tracking the moment your order ships.",
  },
  {
    q: "How does the custom t-shirt designer work?",
    a: "Head to the Design Studio, pick a fit and colour, then add your text, upload artwork (PNG/JPG/SVG) or drop in a graphic. You can print on the front, back and both sleeves. We print at 300 DPI so your design stays crisp. What you see on the mockup is what we print.",
  },
  {
    q: "What is your return & exchange policy?",
    a: "Ready-made items can be returned or exchanged within 7 days of delivery if unused, unwashed and with tags intact. Custom-printed items are made just for you, so they can only be returned if they arrive defective or the print is wrong — we'll replace or refund those in full.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cash on Delivery is available across India. When online payment is enabled you can also pay by card, UPI or netbanking through our secure Stripe checkout. We never store your card details.",
  },
  {
    q: "Do you offer Cash on Delivery?",
    a: "Yes — COD is available on all serviceable pincodes. Just choose Cash on Delivery at checkout and pay in cash or UPI when your order arrives.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order ships we email you the carrier and tracking number, and you can follow it live from the Orders tab in My Account.",
  },
  {
    q: "What sizes do you offer?",
    a: "Most styles run from XS to XXL. Every product page has a size chart with exact chest and length measurements in inches — measure a tee you already love and match it.",
  },
  {
    q: "Do you offer bulk / college society orders?",
    a: `Absolutely — fests, societies and hostel blocks get special pricing on bulk orders. Email us at ${SUPPORT_EMAIL} with your design and quantity and we'll sort you out.`,
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  author: string;
  readMins: number;
  tag: string;
  // paragraphs (strings) and section headings ({h: "..."})
  body: (string | { h: string })[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "design-your-own-college-fest-tshirt",
    title: "How to Design Your Own College Fest T-Shirt (That People Actually Wear)",
    excerpt: "A no-fluff guide to designing fest and society tees your whole batch will want to keep — from concept to print-ready artwork.",
    date: "2026-07-20",
    author: "Team Campus Mode",
    readMins: 5,
    tag: "Design Tips",
    body: [
      "Every fest season, thousands of tees get printed — and most end up at the bottom of a drawer. The difference between a tee people live in and one they never touch usually comes down to a few simple design calls. Here's how to get them right.",
      { h: "1. Start with one strong idea" },
      "The best fest tees say one thing loudly. An inside joke, your society's tagline, the year — pick a single hero element and let it breathe. Cramming five ideas onto the chest is the fastest way to a tee nobody wears.",
      { h: "2. Contrast is everything" },
      "Dark tee, light art. Light tee, dark art. High contrast reads from across the quad and photographs well — which matters, because half your marketing is people wearing it on Instagram.",
      { h: "3. Use the back and sleeves" },
      "The chest is prime real estate, but the back is where you put the big statement and the sleeves are perfect for the year or a small logo. In the Design Studio you can print all four surfaces, so use them.",
      { h: "4. Upload vector art when you can" },
      "SVG artwork stays razor-sharp at any size. If you've got a logo from your design team, ask for the SVG — our studio prints it at 300 DPI so the edges never pixelate.",
      "Ready to make one? Open the Design Studio, pick your fit and colour, and start dropping in your ideas. It takes about ten minutes to go from blank tee to print-ready.",
    ],
  },
  {
    slug: "oversized-vs-regular-fit-guide",
    title: "Oversized vs Regular Fit: Which Tee Is Actually For You?",
    excerpt: "The honest breakdown of oversized and regular fits — how they sit, who they suit, and how to pick your size so it lands exactly how you want.",
    date: "2026-07-10",
    author: "Team Campus Mode",
    readMins: 4,
    tag: "Style Guide",
    body: [
      "\"Oversized\" and \"regular\" aren't just sizes — they're two different vibes. Picking the right one (and the right size within it) is the whole game. Here's the quick version.",
      { h: "Regular fit" },
      "Sits close to the body with a straight cut. It's the classic, versatile choice — tuck it, layer it, wear it to class or a viva. If you like a clean silhouette, go regular and pick your usual size.",
      { h: "Oversized fit" },
      "Drops off the shoulder with a boxy, relaxed body and slightly longer length. It's the streetwear look. For a true oversized drape, take your normal size; if you want it huge, size up once.",
      { h: "How to be sure" },
      "Every product page has a size chart with real chest and length numbers. Measure a tee you already love lying flat, compare, and you'll never guess wrong. Still unsure between two sizes? The bigger one always works for oversized.",
      "Both fits are available across our printed, plain and custom ranges — so once you know your vibe, the rest is just picking a colour.",
    ],
  },
  {
    slug: "caring-for-printed-tshirts",
    title: "Make Your Printed Tees Last: A 2-Minute Care Guide",
    excerpt: "A few tiny habits keep prints bright and fabric soft for years. Here's exactly how to wash and store your Campus Mode tees.",
    date: "2026-06-28",
    author: "Team Campus Mode",
    readMins: 3,
    tag: "Care",
    body: [
      "A good print should outlast the trend that inspired it. Ours are built to — but a little care goes a long way. Follow these and your tee will look new for years.",
      { h: "Wash inside out, cold" },
      "Turning the tee inside out protects the print from friction, and cold water stops colours from bleeding. Both take zero extra effort and make the biggest difference.",
      { h: "Skip the dryer" },
      "High heat is the enemy of prints and fit. Line-dry in shade and your tee keeps its shape and its colour. Bonus: it's better for the planet and your electricity bill.",
      { h: "Iron around, not over" },
      "Never iron directly on the print. If you must iron, turn the tee inside out or press around the design.",
      "That's it. Two minutes of good habits, years of good tees.",
    ],
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
