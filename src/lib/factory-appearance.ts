export type FactoryAppearance = {
  background: string | null;
  lighting: "neutral" | "warm" | "cool";
  style: "original" | "industrial" | "soft";
  brightness: number;
};
export const DEFAULT_APPEARANCE: FactoryAppearance = { background: null, lighting: "warm", style: "original", brightness: 110 };
const KEY = "muffin-factory-appearance-v1";
export function normalizeAppearance(value: Partial<FactoryAppearance>): FactoryAppearance {
  return {
    background: typeof value.background === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(value.background) ? value.background : null,
    lighting: value.lighting === "warm" || value.lighting === "cool" ? value.lighting : "neutral",
    style: value.style === "industrial" || value.style === "soft" ? value.style : "original",
    brightness: typeof value.brightness === "number" && Number.isFinite(value.brightness) ? Math.max(70, Math.min(130, value.brightness)) : 100,
  };
}
export function loadAppearance(): FactoryAppearance {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { return DEFAULT_APPEARANCE; }
}
export function saveAppearance(value: FactoryAppearance): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}