import { DEFAULT_LAYOUT, sanitizeLayout, type FactoryLayout } from "./factory-layout";

export type SavedFactory = { id: string; name: string; layout: FactoryLayout; background: string | null };
export type FactoryLibrary = { factories: SavedFactory[]; defaultId: string };
const KEY = "muffin-factory-library-v1";
export const initialLibrary = (): FactoryLibrary => ({ factories: [{ id: "original", name: "Original factory", layout: DEFAULT_LAYOUT, background: null }], defaultId: "original" });
export function loadLibrary(): FactoryLibrary {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null") as FactoryLibrary | null;
    if (!data?.factories?.length) return initialLibrary();
    const factories = data.factories.filter(f => typeof f.id === "string" && typeof f.name === "string").map(f => ({ ...f, layout: sanitizeLayout(f.layout), background: typeof f.background === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(f.background) ? f.background : null }));
    const first = factories[0];
    if (!first) return initialLibrary();
    return { factories, defaultId: factories.some(f => f.id === data.defaultId) ? data.defaultId : first.id };
  } catch { return initialLibrary(); }
}
export function saveLibrary(library: FactoryLibrary) {
  try { localStorage.setItem(KEY, JSON.stringify(library)); return true; } catch { return false; }
}