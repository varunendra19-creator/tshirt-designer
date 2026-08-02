import { NextResponse, type NextRequest } from "next/server";

// 301 permanent redirects for legacy URLs → new SEO-friendly paths.
// Old: /product/<slug>  and  /product?id=<slug>   New: /products/<slug>
const CATEGORY_SLUGS = new Set([
  "oversized", "printed", "plain", "hoodies", "accessories", "sneakers", "bottoms",
]);

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // /product?id=cotton-tshirt-black  (very old query style)
  if (pathname === "/product" && searchParams.get("id")) {
    const url = req.nextUrl.clone();
    url.pathname = `/products/${searchParams.get("id")}`;
    url.search = "";
    return NextResponse.redirect(url, 301);
  }

  // /product/<slug>  →  /products/<slug>
  const m = pathname.match(/^\/product\/(.+)$/);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/products/${m[1]}`;
    return NextResponse.redirect(url, 301);
  }

  // Query-string browse views → clean SEO paths (301). Keeps /shop?q=<search> as-is.
  if (pathname === "/shop") {
    const cat = searchParams.get("category");
    if (cat && CATEGORY_SLUGS.has(cat)) {
      const url = req.nextUrl.clone();
      url.pathname = `/category/${cat}`;
      url.search = "";
      return NextResponse.redirect(url, 301);
    }
    if (searchParams.get("sale") === "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/sale";
      url.search = "";
      return NextResponse.redirect(url, 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/product", "/product/:path*", "/shop"],
};
