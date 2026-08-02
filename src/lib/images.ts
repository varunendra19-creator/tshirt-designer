// Image URL resolver. Reads src/lib/imageLinks.json — real Pexels stock photos
// today (people wearing tees, product shots). Swap a value for a local
// /generated/*.jpg path (or run `npm run gen:images`) once AI images exist.

import imageLinks from "./imageLinks.json";

export const img = (key: string): string =>
  (imageLinks as Record<string, string>)[key] || "";

// Build a Pexels CDN URL from a photo id (helper for manifests/authoring).
export const px = (id: number | string, w = 900): string =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// A gallery from a single image URL. Pexels URLs get width variants; local
// paths return the single image.
export const galleryFrom = (url: string, count = 3): string[] => {
  if (!url) return [];
  return [url];
};
