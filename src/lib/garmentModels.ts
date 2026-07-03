export const GARMENT_MODEL_MAP: Record<string, string> = {
  "classic":      "/models/t_shirt.glb",
  "vneck":        "/models/t-shirt.glb",
  "polo":         "/models/polo_tshirt.glb",
  "longsleeve":   "/models/long_sleeve_t-_shirt.glb",
  "oversized":    "/models/oversized_t-shirt.glb",
  "hoodie":       "/models/a__hoddie.glb",
  "female":       "/models/female_tshirt.glb",
  "amazigh1":     "/models/amazigh_tshirt.glb",
  "amazigh2":     "/models/amazigh_t-shirt.glb",
  "dragon":       "/models/green_tshirt_dragon.glb",
  "purple":       "/models/purple_tshirt_apex.glb",
  "holidays":     "/models/ride_holidays_19_tshirt_cap_round_tdf.glb",
  "jotaro":       "/models/t_shirt_-jotaro_edition-.glb",
  "design":       "/models/t-shirt_design.glb",
  "polo2":        "/models/t-shirt_polo_lengan_pendek.glb",
  "trenobike":    "/models/trenobike_tshirt.glb",
  "mockup":       "/models/tshirt_mockup_brock_creative_final.glb",
};

export function getModelPath(style: string): string {
  return GARMENT_MODEL_MAP[style] ?? "/models/t_shirt.glb";
}