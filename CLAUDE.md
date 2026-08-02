# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Node 18+ required
npm run dev       # dev server on http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
npm run lint      # next lint — NOTE: no ESLint config exists yet, so this prompts for setup on first run
./setup.sh        # convenience: version-checks node, npm install, then npm run dev
```

There is no test framework in this project — no test runner, no test files, no CI config. `node_modules/` is not checked in.

## Architecture

Single-page Next.js 14 App Router client app. There is no backend, no API routes, and no persistence — all state is in-memory React state and is lost on reload.

### The core idea: Fabric.js canvas *is* the 3D texture

This is the one thing to understand before changing anything. [Live3DCanvas.tsx](src/components/canvas/Live3DCanvas.tsx) is the whole editor:

1. A GLB garment model is loaded into a three.js scene via `GLTFLoader`, normalized to 2.2 world units, and its materials are recolored in place.
2. A Fabric.js canvas (1024×1024, `TEX_SIZE`) is created on a **visible, transparent, absolutely-positioned overlay** floating above the WebGL canvas. This is what the user actually drags/resizes/rotates.
3. Fabric's internal `lowerCanvasEl` is handed **directly** to `new THREE.CanvasTexture(...)` — there is no intermediate offscreen canvas and no blitting. Syncing is just `texture.needsUpdate = true`, fired on every Fabric event *and* every rAF frame.
4. That texture is applied to a **`DecalGeometry` projected onto the garment's own triangles**, parented to the model group — so the artwork wraps the chest, is shaded by the scene lights, and is occluded by the body when turned away.

The Fabric canvas is the texture *source*, not a display layer: `initDrawSurface` sets `lowerCanvasEl.style.visibility = "hidden"`. The bitmap is untouched (so the texture still samples it) but the artwork is only ever *seen* on the garment. Leaving it visible draws a second, flat, screen-aligned copy over the scene — which reads as two overlapping editors. Only the upper canvas (selection handles) stays visible.

**Decals, not billboards.** `attachDecal` projects onto every mesh the projector box reaches — these GLBs are ~10 separate meshes (front panels, back panels, sleeves, collar), so projecting onto a single "body" mesh covers only part of the chest. Three things are easy to get wrong here:

- **World vs local units.** `printW`/`printH`/`chestY` are world-space, but the decal is parented to the model group, which `loadShirt` scales (~3x) to normalize the GLB. `DecalGeometry` emits *world* vertices, so they get `group.matrixWorld.invert()` baked in before parenting; the fallback plane divides by `groupScale` and uses `group.worldToLocal(...)`. Skip either and a 1.2-unit print becomes 3.6 units — bigger than the shirt.
- **Projector box placement.** It must be centred *on* the garment with depth spanning it (`size3.z * 2`). Sitting it just in front of the surface with shallow depth clips everything except the frontmost sliver — the decal then samples a narrow strip of the texture (UVs came out `0.86–0.94` instead of `0–1`) and the artwork looks blank.
- **`group.updateWorldMatrix(true, true)` before measuring.** Nothing has rendered at that point, so bounding boxes otherwise come back in stale local space.

Print size is taken from the **torso panel** (`pickLargestMesh`), not the whole group — a full-group box includes the outstretched sleeves and makes the print far wider than the chest.

**Keeping the overlay in register.** `syncOverlayToDecal` (end of the rAF loop) projects an invisible `decal-anchor` Object3D's four corners through the camera and writes the resulting screen rect onto the overlay div, then re-fits Fabric's CSS box. The `top: 28% / left: 50% / width: 45%` inline styles are only a pre-projection fallback — overwritten every frame. Do not hand-tune them expecting an effect.

Three rules follow:

- The Fabric coordinate space stays square (1024, `TEX_SIZE`) while the overlay box tracks the anchor's 4:3 projection. That non-uniform CSS stretch is deliberate, and Fabric maps pointer coordinates through it correctly.
- **Never call `fc.setDimensions(..., { cssOnly: true })` to resize the overlay.** It re-runs `_initRetinaScaling`, which re-assigns the canvas `width`/`height` *attributes* — and that **wipes the bitmap** — then skips the re-render because `cssOnly` is set. Since orbiting resizes the box every frame, this erases the design continuously. `fitOverlayToPrintArea` sets the styles directly and calls `calcOffset()` instead.
- Overlay visibility and `pointerEvents` are driven **imperatively** from that same loop, not React state. Facing is measured as the anchor normal vs. the camera (`dot > 0.82`, ~35°) — it must be camera-relative, because orbiting moves the camera and leaves `group.rotation.y` at 0, so the old rotation-based check reported "front facing" no matter how far the shirt had been turned.

**The decal is a Group, so name-based guards must walk up the tree.** The shirt-colour effect tints every mesh in the group that isn't the decal. When the decal was a single mesh a `name !== "decal"` test sufficed; now it's a Group of per-mesh pieces, and a shallow name test misses the children — the garment colour then gets multiplied into the artwork's material and the design takes on the shirt's tint. Use `isDecalPart(obj)` (walks `parent` looking for `name === "decal"`) for any traversal that mutates materials. Decal materials must stay `#ffffff` so the texture shows its true colours.

### Multi-placement (front / back / sleeves) — half built

Only the **front** print area is wired up. The 3D half of multi-placement is done and generic; the 2D half is not started.

**Done:**
- `PLACEMENTS` — the table of four areas (front, back, left sleeve, right sleeve), each with its outward axis/direction and the projector yaw that aligns its local +Z to that normal.
- `meshesForPlacement()` — splits the garment's ~10 meshes into torso vs. each sleeve by how far a mesh's centre sits from the mid-line (±42% of half-width). Deliberately not name-based; mesh names differ per GLB.
- `placementFrame()` — derives print position, size and outward normal per area. Sleeves are measured side-on, so their print width runs along world Z and height along world Y.
- `buildDecalFor(THREE, group, spec, tex)` — fully generic: projects, culls back-faces against *that placement's* normal, returns `{decal, anchor, hw, hh}`.
- `cullBackFacingTriangles()` now takes the outward vector rather than assuming +Z.

`attachDecal()` is a thin wrapper that calls `buildDecalFor` with the `front` spec — that is the only thing keeping this single-placement.

**Still needed:**
1. One Fabric canvas + `CanvasTexture` per placement (currently one, in `initDrawSurface`). Four `<canvas>` elements inside the overlay box, only the active one `display:block` — hidden canvases still feed their textures, since neither `display:none` nor `visibility:hidden` clears a canvas bitmap.
2. A `placementsRef` map, with `fabricCanvasRef.current` and `decalAnchorRef.current` repointed on switch. Keeping those two ref names is what lets `addText` / `addImage` / `deleteSelected` / the properties panel keep working untouched.
3. Per-placement undo stacks — `historyStackRef` is currently global and would mix areas together.
4. A placement switcher in the UI, and `faceFront()` generalised to `faceTo(placementId)` using each spec's camera angle (it already eases the camera; it just needs a target per area).
5. `decideGesture` must hit-test against the *active* placement's overlay rect.

**Front faces only.** A box projector has no notion of "front" — it also paints the back panels and sleeve undersides, where the art shows through mirrored. `cullBackFacingTriangles` keeps only triangles whose world normal turns towards the projector (`normal.z >= 0.15`). Without it, turning the shirt round reveals a mirrored copy of the design on the back.

**Rotation vs editing — decided in the capture phase, and it has to be.** The overlay covers the chest, exactly where you grab to rotate. A capture-phase `pointerdown` listener on the container (`decideGesture`) hit-tests the press point once and sets `controls.enabled`: on a design → Fabric drags it, camera holds; on blank fabric → the shirt turns.

Two earlier approaches both failed, so don't revert to them:

- *Hover-gating `pointerEvents`* needed a `mousemove` over the glyphs before the press. On thin text that misses constantly — this is what made dragging work only sometimes.
- *Deciding inside Fabric's `mouse:down`* is too late. **OrbitControls binds `pointerdown` on the container while Fabric binds `mousedown` on the overlay, and `pointerdown` fires first** — OrbitControls claimed the gesture and captured the pointer before Fabric ever saw the press, so clicks stopped selecting at all.

`decideGesture` also bails out for UI floating over the canvas (`closest("button, input, …")` → `controls.enabled = false`), or pressing the "Face front to edit" button starts an orbit and the click never registers.

**Getting back to an editable view.** Editing only works while the print faces you, so a single drag can leave the design unreachable with nothing on screen explaining why — this reads as "editing randomly stopped working". `faceFront()` eases the camera back to dead-front (and resets `group.rotation.y`), and a button appears over the canvas whenever a design exists but is turned away. Its visibility is driven imperatively from `syncOverlayToDecal`, like the overlay itself.

OrbitControls is attached to the **container**, not `renderer.domElement`: the overlay is a sibling of the renderer canvas, so events on it never reach the renderer but do bubble to the container. The Fabric canvas also sets `selection: false` so a drag on blank print area can't rubber-band a marquee instead of orbiting.

**`handleCanvasClick` must not touch clicks that land on the overlay.** It early-returns when `wrapperEl.contains(e.target)`. It previously ran `discardActiveObject()` for *every* click, which fired right after Fabric entered text editing on a double-click and exited it again — so double-click-to-edit never appeared to work. Its only job now is the click-outside case: commit the edit, clear the selection.

**Text editing is Fabric's native `Textbox` behaviour** — double-click enters editing, click-outside commits. Because the Fabric canvas is hidden and only feeds the texture, the caret and live glyphs render *on the garment*, which is the intended feel. Do not add a separate HTML text editor.

**Left-sidebar text controls act on the live selection.** Font / colour / bold / italic / underline / align call `onStyleText`, which reaches through the canvas ref to `styleActiveObject(patch)`. They previously only baked their values into the *next* drag payload, so changing them appeared to do nothing to text already on the shirt. They still double as defaults for the next design when nothing is selected. Text-only keys are skipped when the selection is an image.

**Templates are auto-fitted to the print area.** The library is authored at wildly different font sizes (20pt–72pt), so laying lines out at their natural size made half of them land as unreadably small text. `addTemplate` measures the assembled block and scales it to ~86% of the print width / 55% of its height — the factor is allowed to exceed 1 so small templates grow, not just shrink.

**The properties panel needs a forced re-render.** Fabric mutates the same object in place, so `setActiveObject(obj)` is a no-op to React (`Object.is` passes) and X/Y/W/H would freeze at their selection-time values. `page.tsx` bumps a counter alongside it, and `object:moving/scaling/rotating` all report the active object so the panel tracks the drag.

### Component wiring

`page.tsx` owns all shared state and talks to the canvas through an imperative `useImperativeHandle` ref (`addImage`, `addText`, `addTemplate`, `deleteSelected`, `undo`, `redo`, `pushHistory`, `updateTexture`, `getFabricCanvas`, …). The right-panel property handlers in `page.tsx` reach *through* that ref to mutate the raw Fabric object directly, then manually call `updateTexture()` + `pushHistory()`. If you add a property control, you must call both or the 3D view and the undo stack silently desync.

Undo/redo lives in `Live3DCanvas` as JSON snapshots in a ref-held stack. `page.tsx` separately tracks `historyLength`/`historyPos` **only** to enable/disable the toolbar buttons — those two counters are incremented optimistically and are not the real history.

### Garment style keys

`TSHIRT_STYLES[].svgPath` is a leftover name from a previous 2D-SVG implementation. It is **not** a path — it is the lookup key into `GARMENT_MODEL_MAP` in [garmentModels.ts](src/lib/garmentModels.ts), which maps to a `.glb` under `public/models/`. The `shirtStyle` state string flowing through the whole app is this `svgPath` value (e.g. `"classic"`), never the `id` (`"classic-crew"`); `id` is used only as a React key. Adding a garment means adding entries to *both* `TSHIRT_STYLES` and `GARMENT_MODEL_MAP` with matching keys.

`GarmentThumbnail` renders each GLB once in a throwaway offscreen WebGL context, caches the resulting PNG data URL in a module-level object, and disposes the context. `public/models/` is ~277 MB across 17 models, so the picker is deliberately render-once-and-cache.

## Traps

**Dead code that looks alive.** The README describes an older 2D Fabric-only editor that no longer runs. These files are unreferenced — verify with grep before editing something that seems relevant:

- `src/hooks/useDesignCanvas.ts` — exported, never imported
- `src/components/canvas/DesignCanvas.tsx` — the old 2D editor
- `src/components/ui/TShirt3DViewer.tsx` — never imported
- `*.tsx.bak` files next to their live counterparts
- `getTshirtSVG()` / `PRINTABLE_AREA` in `tshirtData.ts` — only consumed by the dead `DesignCanvas` (plus a stale unused import in `LeftSidebar`)

**Two different `TEMPLATE_DESIGNS` exports.** `tshirtData.ts` has a dead 6-item emoji stub list; [templateDesigns.ts](src/lib/templateDesigns.ts) has the real 96-item list with a `lines[]` field. `LeftSidebar` imports the latter. Importing the wrong one crashes on `tmpl.lines.map`.

**The "Shirt Transform" sliders in the left sidebar do nothing.** `page.tsx` still holds `shirtRotation`/`shirtFlipX`/`shirtFlipY`/`shirtScale` state and passes it to `LeftSidebar`, but never forwards it to `Live3DCanvas` — the 3D shirt is orbited with the mouse via `OrbitControls` instead. The state is kept only to satisfy the prop types.

**There is no back-side design surface.** The Front/Back toggle just sets `group.rotation.y` to `0` or `π`. There is exactly one decal, on the front. The editing overlay fades out ~35° off head-on, so editing becomes impossible once the shirt is turned away — the artwork itself stays on the garment and is occluded by the body, as a real print would be.

**Changing garment style tears down everything.** The scene-init `useEffect` depends on `[shirtStyle]` (with `exhaustive-deps` disabled), so switching garments rebuilds the renderer, the Fabric canvas, and the history stack — the user's design is discarded. Color is handled by a separate cheap effect that only retints materials.

**Export is a WebGL screenshot, not a flat design PNG.** `exportDesign()` returns `renderer.domElement.toDataURL()` — the 3D viewport as-composed. The renderer is created *without* `preserveDrawingBuffer`, so this only works because `render()` is called on the line immediately before `toDataURL()` in the same tick. Don't separate those two calls. (`GarmentThumbnail` sets `preserveDrawingBuffer: true` for its own offscreen renderer.)

**Font sizes carry a x2 texture-space convention.** The texture is 1024px while the sidebar thinks in smaller units, so `addText`, `addTemplate` and `handleCanvasDrop` all multiply incoming `fontSize` by 2. Keep any new text-creation path consistent with that — `handleCanvasDrop` used to divide by 2 instead, which made dragged text land 4x smaller than the identical preset added by clicking.

**`PRICES` in [PreviewModal.tsx](src/components/ui/PreviewModal.tsx) is keyed on old style names.** It covers 6 keys including a `crop` that no longer exists, and is missing 11 of the 17 real garment keys — those silently fall back to `$24.99`. The checkout is entirely mocked (a `setTimeout`, then a PNG download).

**Drag-and-drop payload contract.** Sidebar chips serialize JSON into `dataTransfer` `text/plain`; `handleCanvasDrop` parses it and switches on `data.type` (`"text"` or `"image"`). Both ends must be edited together. Dropped images use the `blob:` URL from `URL.createObjectURL`, which will not survive a reload.

## Conventions

- Styling is Tailwind + NextUI, but most component styling is written as **inline `style` objects** with literal rgba values, not utility classes. Match the surrounding file rather than converting.
- `tsconfig` has `strict: false`, and the three.js/Fabric interop is deliberately typed `any` throughout (including dynamic `import(... as any)` for `three/examples/jsm/*`). The canvas ref API is untyped.
- `reactStrictMode: false` in `next.config.mjs` — this is load-bearing. Strict Mode's double-mount breaks the imperative WebGL/Fabric init and would leak GL contexts.
- three.js and fabric are always loaded via dynamic `import()` inside effects/callbacks, never top-level — they are browser-only.
- `Live3DCanvas` intentionally exposes debug handles on `window`: `__fabricCanvas`, `__fabricSyncFn`, `__decalMesh`, `__threeGroup`, `__threeScene`, `__threeRenderer`, `__threeCamera`. Useful for poking at state in DevTools; also means these are live references, not copies.
- `layout.tsx` is marked `"use client"` and imports `Metadata` without using it — a `metadata` export would not work there as-is.
