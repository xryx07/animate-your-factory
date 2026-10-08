import type { MachineKind } from "./muffin-simulation";
export type RepairTiming = { startedAt: number; completesAt: number };
export type FactoryClock = { elapsedSeconds: number; productionSeconds: number; running: boolean; repairs?: Partial<Record<MachineKind, RepairTiming>> };
export function repairTimingAt(timing: RepairTiming, seconds: number) {
  const duration = timing.completesAt - timing.startedAt;
  return { progress: duration > 0 ? Math.max(0, Math.min(100, (seconds - timing.startedAt) / duration * 100)) : 100, remaining: Math.max(0, timing.completesAt - seconds) };
}