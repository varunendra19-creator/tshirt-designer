import type { TShirtStyle, ShirtColor } from "@/types";

export const SHIRT_COLORS: ShirtColor[] = [
  { name: "White", value: "#FFFFFF", border: "#e0e0e0" },
  { name: "Black", value: "#111111" },
  { name: "Charcoal", value: "#36454F" },
  { name: "Navy", value: "#1B2A4A" },
  { name: "Royal Blue", value: "#2C5EA8" },
  { name: "Sky Blue", value: "#87CEEB", border: "#bbb" },
  { name: "Forest Green", value: "#228B22" },
  { name: "Mint", value: "#98D8C8", border: "#bbb" },
  { name: "Crimson", value: "#C41E3A" },
  { name: "Coral", value: "#FF6B6B" },
  { name: "Purple", value: "#6B21A8" },
  { name: "Lavender", value: "#C3B1E1", border: "#bbb" },
  { name: "Orange", value: "#E8620A" },
  { name: "Mustard", value: "#D4A017" },
  { name: "Pink", value: "#E75480" },
  { name: "Sand", value: "#C2A97A" },
];

export const TSHIRT_STYLES: TShirtStyle[] = [
  { id: "classic-crew", name: "Classic Crew",     category: "Basics",   svgPath: "classic" },
  { id: "v-neck",       name: "V-Neck",           category: "Basics",   svgPath: "vneck" },
  { id: "polo",         name: "Polo",             category: "Casual",   svgPath: "polo" },
  { id: "long-sleeve",  name: "Long Sleeve",      category: "Basics",   svgPath: "longsleeve" },
  { id: "oversized",    name: "Oversized",        category: "Casual",   svgPath: "oversized" },
  { id: "hoodie",       name: "Hoodie",           category: "Premium",  svgPath: "hoodie" },
  { id: "female",       name: "Women's Tee",      category: "Casual",   svgPath: "female" },
  { id: "amazigh1",     name: "Amazigh Vol.1",    category: "Special",  svgPath: "amazigh1" },
  { id: "amazigh2",     name: "Amazigh Vol.2",    category: "Special",  svgPath: "amazigh2" },
  { id: "dragon",       name: "Dragon Tee",       category: "Special",  svgPath: "dragon" },
  { id: "purple",       name: "Apex Tee",         category: "Special",  svgPath: "purple" },
  { id: "holidays",     name: "Holidays Cap",     category: "Special",  svgPath: "holidays" },
  { id: "jotaro",       name: "Jotaro Edition",   category: "Special",  svgPath: "jotaro" },
  { id: "design",       name: "Design Tee",       category: "Special",  svgPath: "design" },
  { id: "polo2",        name: "Polo Lengan",      category: "Casual",   svgPath: "polo2" },
  { id: "trenobike",    name: "Trenobike",        category: "Special",  svgPath: "trenobike" },
  { id: "mockup",       name: "Brock Mockup",     category: "Special",  svgPath: "mockup" },
];

export const FONTS = [
  "Inter", "Arial", "Georgia", "Impact", "Courier New", "Times New Roman",
  "Verdana", "Trebuchet MS", "Comic Sans MS", "Palatino", "Garamond", "Bookman", "Tahoma",
];

export const TEMPLATE_DESIGNS = [
  { id: "t1", name: "Bold Text", emoji: "🔤" },
  { id: "t2", name: "Star Pattern", emoji: "⭐" },
  { id: "t3", name: "Wave Design", emoji: "🌊" },
  { id: "t4", name: "Geometric", emoji: "🔷" },
  { id: "t5", name: "Floral", emoji: "🌸" },
  { id: "t6", name: "Abstract", emoji: "🎨" },
];

function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  return { r: parseInt(c.substr(0,2),16), g: parseInt(c.substr(2,2),16), b: parseInt(c.substr(4,2),16) };
}
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  const cl = (n: number) => Math.min(255, Math.max(0, n + amt));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}
function isLightColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299*r + 0.587*g + 0.114*b) > 140;
}

// Realistic SVG t-shirt with gradient fabric shading, fold lines, soft shadows
export function getTshirtSVG(
  style: string,
  fillColor: string,
  isBack: boolean = false
): string {
  const light = isLightColor(fillColor);
  // Deterministic id derived from inputs so server and client render identically (avoids hydration mismatch)
  const id = `${style}-${fillColor.replace("#", "")}-${isBack ? "b" : "f"}`;

  const lit    = shade(fillColor, light ? 10 : 38);
  const litSoft= shade(fillColor, light ? 4 : 18);
  const mid    = fillColor;
  const dark   = shade(fillColor, light ? -34 : -16);
  const vdark  = shade(fillColor, light ? -55 : -28);
  const sleeveL= shade(fillColor, light ? -22 : -8);
  const sleeveD= shade(fillColor, light ? -48 : -22);

  const stroke = light ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.16)";
  const seam   = light ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.13)";
  const foldL  = light ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.08)";

  const defs = `
    <defs>
      <linearGradient id="bodyGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${lit}"/>
        <stop offset="28%" stop-color="${litSoft}"/>
        <stop offset="55%" stop-color="${mid}"/>
        <stop offset="85%" stop-color="${dark}"/>
        <stop offset="100%" stop-color="${vdark}"/>
      </linearGradient>
      <linearGradient id="leftSleeveGrad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${vdark}"/>
        <stop offset="100%" stop-color="${sleeveL}"/>
      </linearGradient>
      <linearGradient id="rightSleeveGrad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${sleeveL}"/>
        <stop offset="100%" stop-color="${vdark}"/>
      </linearGradient>
      <radialGradient id="vignette-${id}" cx="50%" cy="32%" r="70%">
        <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
        <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
        <stop offset="100%" stop-color="${light ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.26)"}"/>
      </radialGradient>
      <filter id="softShadow-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="rgba(0,0,0,0.35)" flood-opacity="0.5"/>
      </filter>
      <linearGradient id="highlightGrad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${light ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"}"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
    </defs>
  `;

  const foldLines = (bx0: number, bx1: number, by0: number, by1: number) => `
    <path d="M${bx0 + (bx1-bx0)*0.30} ${by0 + (by1-by0)*0.30} Q${bx0 + (bx1-bx0)*0.36} ${by0 + (by1-by0)*0.55} ${bx0 + (bx1-bx0)*0.32} ${by1 - (by1-by0)*0.08}"
          fill="none" stroke="${foldL}" stroke-width="2" opacity="0.7"/>
    <path d="M${bx0 + (bx1-bx0)*0.62} ${by0 + (by1-by0)*0.28} Q${bx0 + (bx1-bx0)*0.68} ${by0 + (by1-by0)*0.5} ${bx0 + (bx1-bx0)*0.64} ${by1 - (by1-by0)*0.1}"
          fill="none" stroke="${foldL}" stroke-width="1.5" opacity="0.55"/>
  `;

  const svgs: Record<string, string> = {
    classic: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(75, 205, 108, 292)}
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2.2"/>
        <path d="M82 30 Q140 49 198 30" fill="none" stroke="${light ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}" stroke-width="0.8"/>
        <line x1="75" y1="108" x2="75" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="205" y1="108" x2="205" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="75" y1="285" x2="205" y2="285" stroke="${seam}" stroke-width="1.4"/>
        <line x1="75" y1="289" x2="205" y2="289" stroke="${seam}" stroke-width="0.8"/>
        <path d="M75 108 Q90 116 140 118 Q190 116 205 108" fill="none" stroke="${seam}" stroke-width="0.9"/>
        <path d="M80 30 L60 80" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="75" y="28" width="130" height="264" fill="url(#vignette-${id})"/>
        ${isBack ? `<text x="140" y="200" text-anchor="middle" fill="${seam}" font-size="11" font-family="Inter,Arial">BACK</text>` : ""}
      </svg>
    `,
    vneck: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(75, 205, 108, 292)}
        <path d="M80 28 L140 72 L200 28" fill="none" stroke="${seam}" stroke-width="2.2"/>
        <path d="M82 29 L140 70 L198 29" fill="none" stroke="${light ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}" stroke-width="0.8"/>
        <line x1="75" y1="108" x2="75" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="205" y1="108" x2="205" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="75" y1="285" x2="205" y2="285" stroke="${seam}" stroke-width="1.4"/>
        <path d="M75 108 Q90 116 140 118 Q190 116 205 108" fill="none" stroke="${seam}" stroke-width="0.9"/>
        <path d="M80 30 L60 80" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="75" y="28" width="130" height="264" fill="url(#vignette-${id})"/>
      </svg>
    `,
    polo: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(75, 205, 108, 292)}
        <path d="M110 28 L110 60 Q140 70 170 60 L170 28" fill="${mid}" stroke="${seam}" stroke-width="1.5"/>
        <line x1="140" y1="60" x2="140" y2="92" stroke="${seam}" stroke-width="1"/>
        <circle cx="140" cy="68" r="2" fill="${seam}"/>
        <circle cx="140" cy="78" r="2" fill="${seam}"/>
        <circle cx="140" cy="88" r="2" fill="${seam}"/>
        <line x1="75" y1="108" x2="75" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="205" y1="108" x2="205" y2="292" stroke="${seam}" stroke-width="0.9"/>
        <line x1="75" y1="285" x2="205" y2="285" stroke="${seam}" stroke-width="1.4"/>
        <path d="M75 108 Q90 116 140 118 Q190 116 205 108" fill="none" stroke="${seam}" stroke-width="0.9"/>
        <path d="M80 30 L60 80" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="75" y="28" width="130" height="264" fill="url(#vignette-${id})"/>
      </svg>
    `,
    longsleeve: `
      <svg viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L22 100 L50 235 L65 240 L70 112 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L258 100 L230 235 L215 240 L210 112 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q140 8 200 28 L210 112 L210 300 L70 300 L70 112 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(70, 210, 112, 300)}
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2.2"/>
        <line x1="70" y1="112" x2="70" y2="300" stroke="${seam}" stroke-width="0.9"/>
        <line x1="210" y1="112" x2="210" y2="300" stroke="${seam}" stroke-width="0.9"/>
        <line x1="70" y1="293" x2="210" y2="293" stroke="${seam}" stroke-width="1.4"/>
        <line x1="50" y1="232" x2="65" y2="232" stroke="${seam}" stroke-width="1.2"/>
        <line x1="215" y1="232" x2="230" y2="232" stroke="${seam}" stroke-width="1.2"/>
        <path d="M80 30 L65 90" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="70" y="28" width="140" height="272" fill="url(#vignette-${id})"/>
      </svg>
    `,
    crop: `
      <svg viewBox="0 0 280 250" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 220 L75 220 L75 108 L30 90 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(75, 205, 108, 220)}
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2.2"/>
        <line x1="75" y1="108" x2="75" y2="220" stroke="${seam}" stroke-width="0.9"/>
        <line x1="205" y1="108" x2="205" y2="220" stroke="${seam}" stroke-width="0.9"/>
        <line x1="75" y1="214" x2="205" y2="214" stroke="${seam}" stroke-width="1.6"/>
        <path d="M75 108 Q90 116 140 118 Q190 116 205 108" fill="none" stroke="${seam}" stroke-width="0.9"/>
        <path d="M80 30 L60 80" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="75" y="28" width="130" height="192" fill="url(#vignette-${id})"/>
      </svg>
    `,
    hoodie: `
      <svg viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <g filter="url(#softShadow-${id})">
          <path d="M80 28 L30 95 L55 104 L76 60 Z" fill="url(#leftSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M200 28 L250 95 L225 104 L204 60 Z" fill="url(#rightSleeveGrad-${id})" stroke="${stroke}" stroke-width="1.2"/>
          <path d="M80 28 Q100 0 140 0 Q180 0 200 28 L250 95 L205 112 L205 305 L75 305 L75 112 L30 95 Z"
                fill="url(#bodyGrad-${id})" stroke="${stroke}" stroke-width="1.5"/>
        </g>
        ${foldLines(75, 205, 112, 305)}
        <path d="M100 10 Q140 18 180 10" fill="none" stroke="${seam}" stroke-width="1"/>
        <rect x="100" y="195" width="80" height="50" rx="4" fill="none" stroke="${seam}" stroke-width="1.3"/>
        <line x1="140" y1="195" x2="140" y2="245" stroke="${seam}" stroke-width="0.9"/>
        <line x1="125" y1="0" x2="118" y2="40" stroke="${seam}" stroke-width="1.2"/>
        <line x1="155" y1="0" x2="162" y2="40" stroke="${seam}" stroke-width="1.2"/>
        <circle cx="118" cy="42" r="3" fill="${seam}"/>
        <circle cx="162" cy="42" r="3" fill="${seam}"/>
        <line x1="75" y1="112" x2="75" y2="305" stroke="${seam}" stroke-width="0.9"/>
        <line x1="205" y1="112" x2="205" y2="305" stroke="${seam}" stroke-width="0.9"/>
        <line x1="75" y1="298" x2="205" y2="298" stroke="${seam}" stroke-width="1.4"/>
        <path d="M75 112 Q90 120 140 122 Q190 120 205 112" fill="none" stroke="${seam}" stroke-width="0.9"/>
        <path d="M80 32 L65 92" fill="none" stroke="url(#highlightGrad-${id})" stroke-width="14" opacity="0.5"/>
        <rect x="75" y="0" width="130" height="305" fill="url(#vignette-${id})"/>
      </svg>
    `,
  };

  return svgs[style] || svgs["classic"];
}

export const PRINTABLE_AREA = {
  classic:     { x: 0.29, y: 0.24, w: 0.42, h: 0.44 },
  vneck:       { x: 0.29, y: 0.26, w: 0.42, h: 0.42 },
  polo:        { x: 0.29, y: 0.28, w: 0.42, h: 0.40 },
  longsleeve:  { x: 0.29, y: 0.22, w: 0.42, h: 0.44 },
  crop:        { x: 0.29, y: 0.25, w: 0.42, h: 0.38 },
  hoodie:      { x: 0.29, y: 0.25, w: 0.42, h: 0.34 },
};