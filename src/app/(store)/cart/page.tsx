import type { Metadata } from "next";
import { CartClient } from "@/components/site/CartClient";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartClient />;
}
