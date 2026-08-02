import type { Metadata } from "next";
import { AccountClient } from "@/components/site/AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your Campus Mode orders, custom designs and delivery status.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
