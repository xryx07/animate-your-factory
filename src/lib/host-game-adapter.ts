import { initialSimulation, type MachineKind, type SimulationState } from "./muffin-simulation";
import { STAGE_ORDER } from "./factory-layout";

/** Structural subset of 111shivamrai/muffin-factory-game's store. No tokens or user data are needed. */
export type HostRoom = { id: string; currentDay: number; maxDays: number; tickRate: number; status: "configuring" | "active" | "paused" | "finished" };
export type HostTeam = {
  id: string; name: string; cash: number; status: "active" | "bankrupt";
  machines: Record<MachineKind, { count: number; active: number; inTransit: number }>;
  inventory: Record<"base_mix" | "packaging_material" | "finished_muffin", { onHand: number; orderQty: number; reorderPoint: number }>;
  breakdownStates: { machineType: MachineKind; brokenCount: number; daysRemaining: number[] }[];
  purchaseOrders: { materialType: "base_mix" | "packaging_material" | "finished_muffin"; quantity: number; arrivalDay: number; status: string }[];
  history: { production: number[] };
};
export type HostSnapshot = { room: HostRoom | null; teamState: HostTeam | null };
export type HostStore = { getState: () => HostSnapshot; subscribe: (listener: () => void) => () => void };
export function adaptHostGame(room: HostRoom, team: HostTeam): SimulationState {
  const state = initialSimulation();
  state.day = room.currentDay; state.maxDays = room.maxDays; state.cash = team.cash;
  state.mix = team.inventory.base_mix.onHand;
  state.packagingMaterial = team.inventory.packaging_material.onHand;
  state.finished = team.inventory.finished_muffin.onHand;
  state.produced = team.history.production.at(-1) ?? 0;
  for (const kind of STAGE_ORDER) {
    const machine = team.machines[kind];
    const failures = team.breakdownStates.filter(b => b.machineType === kind);
    state.machines[kind] = { owned: machine.count, active: machine.active, arriving: machine.inTransit, broken: failures.reduce((sum, b) => sum + b.brokenCount, 0), repairDays: Math.max(0, ...failures.flatMap(b => b.daysRemaining)) };
  }
  state.transits = team.purchaseOrders.filter(o => o.status !== "delivered" && o.materialType !== "finished_muffin").map(o => ({ material: o.materialType === "base_mix" ? "mix" : "packaging", quantity: o.quantity, arrivalDay: o.arrivalDay }));
  return state;
}