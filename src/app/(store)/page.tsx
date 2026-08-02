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
    <>
      <Hero />
      <CategoryStrip />
      <FlashSale />
      <ShowcaseRow />
      <TrustIcons />
      <CustomBuilder />
      <Colleges />
      <Trending />
      <CampusLooks />
      <Testimonials />
      <Newsletter />
    </>
  );
}
