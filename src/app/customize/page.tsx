import type { Metadata } from "next";
import { Customizer } from "@/components/customizer/Customizer";

export const metadata: Metadata = {
  title: "Design Your Own Tee — Custom T-Shirt Designer",
  description:
    "Design your own custom t-shirt online. Add text, upload your logo or artwork, print on the front, back and sleeves — student pricing, made in India.",
  alternates: { canonical: "/customize" },
};

export default function CustomizePage() {
  return <Customizer />;
}
