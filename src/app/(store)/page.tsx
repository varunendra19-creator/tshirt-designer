import { Hero } from "@/components/home/Hero";
import {
  CategoryStrip,
  FlashSale,
  ShowcaseRow,
  Trending,
  CampusLooks,
  CustomBuilder,
  TrustIcons,
  Testimonials,
  Colleges,
  Newsletter,
} from "@/components/home/Sections";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* On mobile, show the categories slider first; on desktop keep the hero first. */}
      <div className="order-2 md:order-1"><Hero /></div>
      <div className="order-1 md:order-2"><CategoryStrip /></div>
      <div className="order-3 flex flex-col">
        <FlashSale />
        <ShowcaseRow />
        <TrustIcons />
        <CustomBuilder />
        <Colleges />
        <Trending />
        <CampusLooks />
        <Testimonials />
        <Newsletter />
      </div>
    </div>
  );
}
