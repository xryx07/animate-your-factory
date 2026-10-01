import type { MachineKind } from "@/lib/muffin-simulation";

export type FactoryLayout = {
  /** Horizontal centre of each machine, in percent of the scene width. */
  machines: Record<MachineKind, number>;
  /** Vertical position of the conveyor surface, in percent from the bottom. */
  beltY: number;
  /** Where products enter and leave the belt, in percent of the scene width. */
  intakeX: number;
  dispatchX: number;
  /** Product sprite size multiplier. */
  productScale: number;
  /** Minimum gap between two products on the belt, in percent of the scene width. */
  minGap: number;
  /** Belt speed multiplier. */
  speedScale: number;
  /** Vertical position of the machine labels, in percent from the top. */
  labelY: number;
};

export const STAGE_ORDER: MachineKind[] = ["mixing", "baking", "icing", "packaging"];

export const DEFAULT_LAYOUT: FactoryLayout = {
  machines: { mixing: 19, baking: 43, icing: 66, packaging: 84 },
  beltY: 25,
  intakeX: 24,
  dispatchX: 98,
  productScale: 1,
  minGap: 7,
  speedScale: 1,
  labelY: 5,
};

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/**
 * Keeps a layout physically playable: machines stay on screen, stay in process
 * order, and never sit so close that their labels or products overlap.
 */
export function sanitizeLayout(input: Partial<FactoryLayout> | null | undefined): FactoryLayout {
  const source = { ...DEFAULT_LAYOUT, ...(input ?? {}) };
  const machines = { ...DEFAULT_LAYOUT.machines, ...(input?.machines ?? {}) };
  const minStageGap = 9;
  const ordered: Record<MachineKind, number> = { ...machines };
  let previous = 4;
  STAGE_ORDER.forEach((kind, index) => {
    const remaining = STAGE_ORDER.length - index - 1;
    const ceiling = 96 - remaining * minStageGap;
    const value = clamp(Number(ordered[kind]), previous, ceiling);
    ordered[kind] = Math.round(value * 10) / 10;
    previous = ordered[kind] + minStageGap;
  });

  const intakeX = clamp(Number(source.intakeX), ordered.mixing + 2, ordered.baking - 3);
  const dispatchX = clamp(Number(source.dispatchX), intakeX + 12, 100);

  return {
    machines: ordered,
    beltY: clamp(Number(source.beltY), 10, 55),
    intakeX,
    dispatchX,
    productScale: clamp(Number(source.productScale), 0.4, 2.2),
    minGap: clamp(Number(source.minGap), 4, 25),
    speedScale: clamp(Number(source.speedScale), 0.25, 3),
    labelY: clamp(Number(source.labelY), 1, 40),
  };
}

const STORAGE_KEY = "muffin-factory-layout-v1";

export type StoredLayout = { layout: FactoryLayout; background: string | null };

export function loadStoredLayout(): StoredLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLayout;
    return { layout: sanitizeLayout(parsed.layout), background: null };
  } catch {
    return null;
  }
}

export function saveStoredLayout(value: StoredLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — the layout simply won't persist */
  }
}

export function clearStoredLayout() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
