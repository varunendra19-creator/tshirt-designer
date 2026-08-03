// Garment mockups + print-area geometry, shared by the customizer and the
// checkout "what you're paying for" popup so a design can be composited onto
// the shirt anywhere (no pre-rendered image needed).

export type Gender = "male" | "female";

export const TEE_IMG: Record<Gender, { front: string; back: string }> = {
  male: { front: "/tees/male-white-front.webp", back: "/tees/male-white-back.webp" },
  female: { front: "/tees/female-white-front.webp", back: "/tees/female-white-back.webp" },
};

// image aspect ratio as height / width (matches the source webp files)
export const TEE_ASPECT: Record<Gender, { front: number; back: number }> = {
  male: { front: 1.1795, back: 1.1523 },
  female: { front: 1.0, back: 1.0 },
};

// print rectangle as a fraction of the tee image (x, y, w, h). Sleeves print on
// the front image at the sleeve location.
export const PRINT_RECT: Record<Gender, Record<string, { x: number; y: number; w: number; h: number }>> = {
  male: {
    front: { x: 0.315, y: 0.25, w: 0.37, h: 0.40 },
    back: { x: 0.305, y: 0.20, w: 0.39, h: 0.46 },
    left: { x: 0.085, y: 0.245, w: 0.155, h: 0.135 },
    right: { x: 0.760, y: 0.245, w: 0.155, h: 0.135 },
  },
  female: {
    front: { x: 0.35, y: 0.27, w: 0.30, h: 0.34 },
    back: { x: 0.34, y: 0.22, w: 0.32, h: 0.40 },
    left: { x: 0.115, y: 0.255, w: 0.130, h: 0.110 },
    right: { x: 0.755, y: 0.255, w: 0.130, h: 0.110 },
  },
};

export const toGender = (v: any): Gender =>
  v === "female" || v === "Women" || v === "women" ? "female" : "male";

const bodySide = (surface: string) => (surface === "left" || surface === "right" ? "front" : surface === "back" ? "back" : "front");

export function teeImageFor(gender: Gender, surface: string) {
  return TEE_IMG[gender][bodySide(surface) as "front" | "back"];
}
export function teeAspectFor(gender: Gender, surface: string) {
  return TEE_ASPECT[gender][bodySide(surface) as "front" | "back"];
}
export function printRectFor(gender: Gender, surface: string) {
  return PRINT_RECT[gender][surface] || PRINT_RECT[gender].front;
}
