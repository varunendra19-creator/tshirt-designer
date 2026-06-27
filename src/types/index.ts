export interface TShirtStyle {
  id: string;
  name: string;
  category: string;
  svgPath: string;
}

export interface ShirtColor {
  name: string;
  value: string;
  border?: string;
}

export interface DesignLayer {
  id: string;
  name: string;
  type: "image" | "text" | "shape";
  visible: boolean;
  locked: boolean;
}

export interface TextOptions {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  fill: string;
  textAlign: "left" | "center" | "right";
  underline: boolean;
}

export interface ObjectProperties {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
}

export type SidebarTab = "products" | "upload" | "text" | "templates" | "layers";
export type ViewSide = "front" | "back";
