import { STAGE_ORDER, type FactoryLayout } from "./factory-layout";
import type { MachineKind } from "./muffin-simulation";

/** One shared clock, constant transfer velocity and reserved dwell space. */
export function createFactoryMotion(layout: FactoryLayout, safeGap: number) {
  const dwell = 6;
  const start = layout.intakeX;
  const length = layout.dispatchX - start;
  const duration = length + STAGE_ORDER.length * dwell;
  const count = Math.max(1, Math.min(10, Math.floor(duration / (dwell + safeGap))));
  const stops = STAGE_ORDER.map((kind, index) => ({ kind, x: layout.machines[kind], time: layout.machines[kind] - start + index * dwell }));
  function sample(clock: number, index: number) {
    const age = clock - index / count;
    const visible = age >= 0;
    const time = ((age % 1 + 1) % 1) * duration;
    let completed = 0;
    for (const stop of stops) {
      if (time < stop.time) break;
      if (time < stop.time + dwell) return { x: stop.x, stage: stop.kind as MachineKind | null, processing: (time - stop.time) / dwell, completed, visible, fade: 1 };
      completed++;
    }
    const x = start + time - completed * dwell;
    const fade = Math.max(0, Math.min(1, (x - start) / 2, (layout.dispatchX - x) / 2));
    return { x, stage: null as MachineKind | null, processing: 0, completed, visible, fade };
  }
  return { count, duration, sample };
}