# 🎽 ThreadCraft — T-Shirt Designer

A live **3D** t-shirt design editor built with **Next.js 14**, **three.js**, **Fabric.js**, **NextUI**, and **Tailwind CSS**.

You design on a 2D canvas that sits directly on top of a real 3D garment model — and that same canvas is the model's texture, so the shirt updates as you type and drag. Orbit the shirt with your mouse to see the design wrap in real time.

## ✨ Features

- **17 garment models** — real `.glb` 3D models (crew, v-neck, polo, long sleeve, oversized, hoodie, women's tee, plus themed designs)
- **16 shirt colors** plus a custom color picker, applied live to the 3D material
- **Orbit controls** — drag to rotate the shirt, scroll to zoom, with auto-rotate toggle
- **Image upload** — PNG, JPG, SVG, WEBP via browse or drag-and-drop
- **Drag onto the shirt** — drag text blocks and uploaded images straight onto the print area
- **Text tool** — font, size, color, bold/italic/underline, alignment
- **Double-click to edit text** in place — the caret and your typing appear directly on the garment; click anywhere off the design to commit it
- **96 text templates** across 9 categories, with search and category filters
- **Direct manipulation** — drag, resize, and rotate designs with corner handles
- **Properties panel** — X/Y position, W/H size, rotation, opacity
- **Layer controls** — bring to front/back, forward/backward
- **Center alignment** — horizontal and vertical
- **Undo/Redo** history
- **Front/Back view** toggle
- **Export** — PNG snapshot of the 3D view
- **Buy Now** — preview modal with size/quantity selector and mock checkout

## 🚀 Quick Start

```bash
# 1. Install dependencies (Node 18+)
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

Or run `./setup.sh`, which checks your Node version, installs, and starts the dev server.

## 🛠 Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14 | Framework (App Router) |
| React | 18 | UI |
| three.js | 0.185 | 3D scene, GLB models, live texture |
| Fabric.js | 5.3 | Design canvas / texture source |
| NextUI | 2.4 | UI components |
| Tailwind CSS | 3.4 | Styling |
| TypeScript | 5 | Types |
| Lucide React | 0.400 | Icons |

## 📁 Project Structure

```
public/
└── models/                     # 17 .glb garment models (~277 MB)
src/
├── app/
│   ├── layout.tsx              # Root layout with NextUI provider
│   ├── page.tsx                # Main app page — owns shared state
│   └── globals.css             # Global styles
├── components/
│   ├── canvas/
│   │   └── Live3DCanvas.tsx    # ★ The editor: three.js scene + Fabric texture
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx     # Product / Upload / Text / Templates
│   │   └── RightSidebar.tsx    # Object properties panel
│   ├── toolbar/
│   │   └── Toolbar.tsx         # Undo/redo, view toggle, export, buy
│   └── ui/
│       ├── GarmentPickerModal.tsx  # Garment chooser grid
│       ├── GarmentThumbnail.tsx    # Offscreen GLB → cached PNG thumbnail
│       └── PreviewModal.tsx        # Preview & mock checkout
├── lib/
│   ├── garmentModels.ts        # style key → .glb path map
│   ├── templateDesigns.ts      # 96 text templates
│   ├── tshirtData.ts           # Garment list, colors, fonts
│   └── buildShirtGeometry.ts   # Procedural fallback if a GLB fails to load
└── types/
    └── index.ts                # TypeScript types
```

## 🎨 How it works

The editor is a single three.js scene. A GLB garment is loaded and normalized, and the artwork is projected onto the garment's own triangles as a decal — so it wraps the chest, catches the scene lighting, and is hidden by the body when you turn the shirt away, exactly like a real print.

A transparent Fabric.js canvas sits over the print area — that's what you actually click and drag. Fabric's internal canvas element is handed **directly** to `THREE.CanvasTexture` as the decal's texture source, so there's no copying step: whatever you draw is what the shirt shows, every frame. That canvas is hidden from view, so the design is only ever seen on the garment.

Editing is only enabled while the print is roughly facing the camera; rotate past ~35° and the editing overlay fades out, leaving just the printed artwork. Dragging anywhere except directly on a design object rotates the shirt.

## 🎛 Customization

- **Add a garment** — add an entry to `TSHIRT_STYLES` in `src/lib/tshirtData.ts` *and* a matching key in `GARMENT_MODEL_MAP` in `src/lib/garmentModels.ts`, then drop the `.glb` into `public/models/`. The `svgPath` field is the lookup key shared by both (the name is a legacy leftover — it is not a path).
- **Add colors** — `SHIRT_COLORS` in `src/lib/tshirtData.ts`
- **Add fonts** — `FONTS` in `src/lib/tshirtData.ts`
- **Add text templates** — `TEMPLATE_DESIGNS` in `src/lib/templateDesigns.ts` (add the category to `TEMPLATE_CATEGORIES` too)

## ⚠️ Known limitations

- **Front print area only.** There is one print area, on the chest. The Front/Back toggle just spins the model — there is no separate back or sleeve placement yet.
- **Switching garments clears your design.** Changing the garment rebuilds the scene, the design canvas, and the undo history.
- **No persistence.** All state is in memory; a reload starts over.
- **Desktop only.** The layout uses fixed-width sidebars and no responsive breakpoints, so below roughly 900px wide the canvas column collapses. There is no touch/mobile support yet.
- **No keyboard shortcuts.** Delete and Ctrl+D are not currently wired up — use the Delete and Duplicate buttons in the properties panel. (Typing works normally while editing text.)
- **The "Shirt Transform" controls (rotation/flip/scale) in the Product tab are not connected.** Use mouse orbit to rotate the shirt instead.
- **Export is a viewport snapshot**, not a print-ready flat design file.

## 🔌 Backend Integration

There is no backend — the buy flow is mocked. To integrate real payments:

1. Replace `handleOrder` in `src/components/ui/PreviewModal.tsx` with a real API call
2. Send the design to your backend. Note that `exportDesign()` returns a *3D viewport screenshot*; for print you'll want the flat artwork instead, via `getFabricCanvas().toDataURL({ multiplier: 2 })`
3. Fix `PRICES` in `PreviewModal.tsx` — it is keyed on outdated style names and most garments silently fall back to the default price
4. Integrate Stripe, PayPal, or your preferred payment provider

## 🤖 Working with Claude Code

See [CLAUDE.md](CLAUDE.md) for architecture notes, gotchas, and a map of unused legacy files.
