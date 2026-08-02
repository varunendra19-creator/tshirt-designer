import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Anton } from "next/font/google";
import "./theme.css"; // <-- theme config (colours, fonts, sizes): edit this to re-theme
import "./globals.css";
import { Providers } from "./providers";
import { safeJsonLd } from "@/lib/jsonld";
import { RouteProgress } from "@/components/site/RouteProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Body: Inter. Headings: Bricolage Grotesque — distinctive, premium-editorial.
const interBody = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});
// Bold poster font for the custom-tee print.
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-print" });

const SITE_URL = "https://campusmode.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Campus Mode — Custom & Premium T-Shirts for College Students",
    template: "%s | Campus Mode",
  },
  description:
    "Level up your campus style. Premium T-shirts, hoodies, oversized fits & custom designs made for college students in India. Design your own tee — student pricing, COD, UPI & free shipping over ₹999.",
  keywords: [
    "custom t-shirt design India",
    "college t-shirts",
    "oversized t-shirts",
    "hoodies for students",
    "printed tshirts online",
    "campus fashion",
    "student clothing brand",
    "Campus Mode",
  ],
  applicationName: "Campus Mode",
  authors: [{ name: "Campus Mode" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Campus Mode",
    title: "Campus Mode — Custom & Premium T-Shirts for College Students",
    description:
      "Level up your campus style. Premium tees, hoodies & custom designs made for college life. Student pricing, COD & UPI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus Mode — Custom & Premium T-Shirts for College Students",
    description: "Level up your campus style. Premium tees, hoodies & custom designs made for college life.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Campus Mode",
    url: SITE_URL,
    slogan: "Level Up Your Campus Style",
    description: "Custom & premium t-shirts, hoodies and campus fashion for college students in India.",
  };
  return (
    <html lang="en-IN" className="dark">
      <body className={`${inter.className} ${inter.variable} ${interBody.variable} ${bricolage.variable} ${anton.variable}`}>
        <RouteProgress />
        <Providers>{children}</Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgLd) }}
        />
      </body>
    </html>
  );
}
