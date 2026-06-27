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
  {
    id: "classic-crew",
    name: "Classic Crew",
    category: "Basics",
    svgPath: "classic",
  },
  {
    id: "v-neck",
    name: "V-Neck",
    category: "Basics",
    svgPath: "vneck",
  },
  {
    id: "polo",
    name: "Polo",
    category: "Casual",
    svgPath: "polo",
  },
  {
    id: "long-sleeve",
    name: "Long Sleeve",
    category: "Basics",
    svgPath: "longsleeve",
  },
  {
    id: "crop-top",
    name: "Crop Top",
    category: "Casual",
    svgPath: "crop",
  },
  {
    id: "hoodie",
    name: "Hoodie",
    category: "Premium",
    svgPath: "hoodie",
  },
];

export const FONTS = [
  "Inter",
  "Arial",
  "Georgia",
  "Impact",
  "Courier New",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Bookman",
  "Tahoma",
];

export const TEMPLATE_DESIGNS = [
  { id: "t1", name: "Bold Text", emoji: "🔤" },
  { id: "t2", name: "Star Pattern", emoji: "⭐" },
  { id: "t3", name: "Wave Design", emoji: "🌊" },
  { id: "t4", name: "Geometric", emoji: "🔷" },
  { id: "t5", name: "Floral", emoji: "🌸" },
  { id: "t6", name: "Abstract", emoji: "🎨" },
];

// SVG string builders for each shirt style
export function getTshirtSVG(
  style: string,
  fillColor: string,
  isBack: boolean = false
): string {
  const isLight =
    parseInt(fillColor.slice(1, 3), 16) * 0.299 +
      parseInt(fillColor.slice(3, 5), 16) * 0.587 +
      parseInt(fillColor.slice(5, 7), 16) * 0.114 >
    140;
  const stroke = isLight ? "#c8c8c8" : "rgba(255,255,255,0.15)";
  const shading = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const seam = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const svgs: Record<string, string> = {
    classic: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <!-- Left sleeve shading -->
        <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="${shading}"/>
        <!-- Right sleeve shading -->
        <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="${shading}"/>
        <!-- Collar -->
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2"/>
        <!-- Side seams -->
        <line x1="75" y1="108" x2="75" y2="292" stroke="${seam}" stroke-width="0.8"/>
        <line x1="205" y1="108" x2="205" y2="292" stroke="${seam}" stroke-width="0.8"/>
        <!-- Bottom hem -->
        <line x1="75" y1="288" x2="205" y2="288" stroke="${seam}" stroke-width="1"/>
        <!-- Armhole seam -->
        <path d="M75 108 Q90 114 140 116 Q190 114 205 108" fill="none" stroke="${seam}" stroke-width="0.8"/>
        ${isBack ? `<text x="140" y="200" text-anchor="middle" fill="${isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}" font-size="11" font-family="Inter,Arial">BACK</text>` : ""}
      </svg>
    `,
    vneck: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="${shading}"/>
        <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="${shading}"/>
        <!-- V-neck collar -->
        <path d="M80 28 L140 72 L200 28" fill="none" stroke="${seam}" stroke-width="2"/>
        <line x1="75" y1="108" x2="75" y2="292" stroke="${seam}" stroke-width="0.8"/>
        <line x1="205" y1="108" x2="205" y2="292" stroke="${seam}" stroke-width="0.8"/>
        <line x1="75" y1="288" x2="205" y2="288" stroke="${seam}" stroke-width="1"/>
        <path d="M75 108 Q90 114 140 116 Q190 114 205 108" fill="none" stroke="${seam}" stroke-width="0.8"/>
      </svg>
    `,
    polo: `
      <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 292 L75 292 L75 108 L30 90 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="${shading}"/>
        <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="${shading}"/>
        <!-- Polo collar -->
        <path d="M110 28 L110 60 Q140 70 170 60 L170 28" fill="${fillColor}" stroke="${seam}" stroke-width="1.5"/>
        <line x1="140" y1="60" x2="140" y2="90" stroke="${seam}" stroke-width="1.2"/>
        <!-- Buttons -->
        <circle cx="140" cy="65" r="2" fill="${seam}"/>
        <circle cx="140" cy="75" r="2" fill="${seam}"/>
        <circle cx="140" cy="85" r="2" fill="${seam}"/>
        <line x1="75" y1="288" x2="205" y2="288" stroke="${seam}" stroke-width="1"/>
        <path d="M75 108 Q90 114 140 116 Q190 114 205 108" fill="none" stroke="${seam}" stroke-width="0.8"/>
      </svg>
    `,
    longsleeve: `
      <svg viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 28 Q140 8 200 28 L258 100 L230 240 L215 240 L210 112 L210 300 L70 300 L70 112 L65 240 L50 240 L22 100 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2"/>
        <line x1="70" y1="112" x2="70" y2="300" stroke="${seam}" stroke-width="0.8"/>
        <line x1="210" y1="112" x2="210" y2="300" stroke="${seam}" stroke-width="0.8"/>
        <line x1="70" y1="296" x2="210" y2="296" stroke="${seam}" stroke-width="1"/>
        <!-- Sleeve cuffs -->
        <line x1="50" y1="235" x2="230" y2="235" stroke="${seam}" stroke-width="1" stroke-dasharray="200,0"/>
        <line x1="50" y1="232" x2="65" y2="232" stroke="${seam}" stroke-width="1"/>
        <line x1="215" y1="232" x2="230" y2="232" stroke="${seam}" stroke-width="1"/>
      </svg>
    `,
    crop: `
      <svg viewBox="0 0 280 250" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 28 Q140 8 200 28 L250 90 L205 108 L205 220 L75 220 L75 108 L30 90 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <path d="M80 28 L30 90 L55 99 L76 55 Z" fill="${shading}"/>
        <path d="M200 28 L250 90 L225 99 L204 55 Z" fill="${shading}"/>
        <path d="M80 28 Q140 48 200 28" fill="none" stroke="${seam}" stroke-width="2"/>
        <line x1="75" y1="108" x2="75" y2="220" stroke="${seam}" stroke-width="0.8"/>
        <line x1="205" y1="108" x2="205" y2="220" stroke="${seam}" stroke-width="0.8"/>
        <!-- Crop hem -->
        <line x1="75" y1="216" x2="205" y2="216" stroke="${seam}" stroke-width="1.5"/>
        <path d="M75 108 Q90 114 140 116 Q190 114 205 108" fill="none" stroke="${seam}" stroke-width="0.8"/>
      </svg>
    `,
    hoodie: `
      <svg viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 28 Q140 8 200 28 L250 95 L205 112 L205 305 L75 305 L75 112 L30 95 Z" 
              fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <!-- Hood -->
        <path d="M80 28 Q100 0 140 0 Q180 0 200 28" fill="${fillColor}" stroke="${stroke}" stroke-width="1.5"/>
        <path d="M100 10 Q140 18 180 10" fill="none" stroke="${seam}" stroke-width="1"/>
        <!-- Kangaroo pocket -->
        <rect x="100" y="195" width="80" height="50" rx="4" fill="none" stroke="${seam}" stroke-width="1.2"/>
        <line x1="140" y1="195" x2="140" y2="245" stroke="${seam}" stroke-width="0.8"/>
        <!-- Drawstrings -->
        <line x1="125" y1="0" x2="118" y2="40" stroke="${seam}" stroke-width="1"/>
        <line x1="155" y1="0" x2="162" y2="40" stroke="${seam}" stroke-width="1"/>
        <circle cx="118" cy="42" r="3" fill="${seam}"/>
        <circle cx="162" cy="42" r="3" fill="${seam}"/>
        <line x1="75" y1="112" x2="75" y2="305" stroke="${seam}" stroke-width="0.8"/>
        <line x1="205" y1="112" x2="205" y2="305" stroke="${seam}" stroke-width="0.8"/>
        <line x1="75" y1="301" x2="205" y2="301" stroke="${seam}" stroke-width="1"/>
        <path d="M75 112 Q90 118 140 120 Q190 118 205 112" fill="none" stroke="${seam}" stroke-width="0.8"/>
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
