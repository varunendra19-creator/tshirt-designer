# 🎽 ThreadCraft — T-Shirt Designer

A modern, Canva-like t-shirt design editor built with **Next.js 14**, **Fabric.js**, **NextUI**, and **Tailwind CSS**.

## ✨ Features

- **6 shirt styles** — Classic Crew, V-Neck, Polo, Long Sleeve, Crop Top, Hoodie
- **16 shirt colors** with instant preview
- **Image upload** — PNG, JPG, SVG, WEBP with drag-and-drop
- **Text tool** — font, size, color, bold/italic/underline, alignment
- **Text templates** — pre-made styles to add instantly
- **Full canvas controls** — drag, resize, rotate with corner handles
- **Right panel properties** — X/Y position, W/H size, rotation, opacity
- **Layer controls** — bring to front/back, forward/backward
- **Center alignment** — horizontal and vertical
- **Undo/Redo** history
- **Zoom** in/out/fit
- **Front/Back view** toggle
- **Export** — 2× high-res PNG download
- **Buy Now** — preview modal with size/quantity selector and mock checkout

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

## 🛠 Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14 | Framework |
| React | 18 | UI |
| Fabric.js | 5.3 | Canvas engine |
| NextUI | 2.4 | UI components |
| Tailwind CSS | 3.4 | Styling |
| TypeScript | 5 | Types |
| Lucide React | 0.400 | Icons |

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with NextUI provider
│   ├── page.tsx            # Main app page
│   └── globals.css         # Global styles
├── components/
│   ├── canvas/
│   │   └── DesignCanvas.tsx    # Fabric.js canvas component
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx     # Products / Upload / Text / Templates
│   │   └── RightSidebar.tsx    # Object properties panel
│   ├── toolbar/
│   │   └── Toolbar.tsx         # Top toolbar with undo/redo/zoom/buy
│   └── ui/
│       └── PreviewModal.tsx    # Preview & checkout modal
├── hooks/
│   └── useDesignCanvas.ts  # Fabric.js canvas management hook
├── lib/
│   └── tshirtData.ts       # SVG shirt definitions & color data
└── types/
    └── index.ts            # TypeScript types
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected object |
| `Ctrl+D` | Duplicate selected object |
| `Ctrl+Z` | Undo (via toolbar) |

## 🎨 Customization

- **Add shirt styles** — Edit `TSHIRT_STYLES` and `getTshirtSVG()` in `src/lib/tshirtData.ts`
- **Add colors** — Edit `SHIRT_COLORS` in `src/lib/tshirtData.ts`
- **Add fonts** — Edit `FONTS` array in `src/lib/tshirtData.ts`
- **Add text templates** — Edit `TEMPLATE_TEXTS` in `LeftSidebar.tsx`

## 🔌 Backend Integration

The buy flow is currently mocked. To integrate real payments:

1. Replace `onProceed` in `PreviewModal.tsx` with a real API call
2. Send `designDataUrl` (base64 PNG) to your backend
3. Integrate Stripe, PayPal, or your preferred payment provider
