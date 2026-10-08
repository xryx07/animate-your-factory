import { describe, expect, test } from "bun:test";
import { repairTimingAt } from "./factory-clock";
import { initialLibrary, loadLibrary, saveLibrary } from "./factory-library";
import { adaptHostGame, type HostTeam } from "./host-game-adapter";

describe("requested factory rules", () => {
  test("repair progress follows supplied game seconds", () => {
    expect(repairTimingAt({ startedAt: 10, completesAt: 20 }, 15)).toEqual({ progress: 50, remaining: 5 });
    expect(repairTimingAt({ startedAt: 10, completesAt: 20 }, 22)).toEqual({ progress: 100, remaining: 0 });
  });
  test("multiple factories and chosen default survive storage", () => {
    const values = new Map<string, string>();
    globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } } as Storage;
    const library = initialLibrary();
    library.factories.push({ ...library.factories[0], id: "two", name: "Second", layout: library.factories[0]?.layout ?? { machines: { mixing: 19, baking: 43, icing: 66, packaging: 84 }, beltY: 25, intakeX: 7, dispatchX: 98, productScale: 1, minGap: 7, speedScale: 1, labelY: 5 }, background: null });
    library.defaultId = "two";
    expect(saveLibrary(library)).toBe(true);
    expect(loadLibrary().factories.length).toBe(2);
    expect(loadLibrary().defaultId).toBe("two");
  });
  test("host machine failures and inventory map without local simulation", () => {
    const machine = { count: 2, active: 2, inTransit: 0 };
    const inventory = { onHand: 300, orderQty: 10, reorderPoint: 5 };
    const team: HostTeam = { id: "t", name: "Test", status: "active", cash: 1234, machines: { mixing: machine, baking: machine, icing: machine, packaging: machine }, inventory: { base_mix: inventory, packaging_material: { ...inventory, onHand: 80 }, finished_muffin: { ...inventory, onHand: 42 } }, breakdownStates: [{ machineType: "baking", brokenCount: 1, daysRemaining: [2] }], purchaseOrders: [], history: { production: [80] } };
    const state = adaptHostGame({ id: "r", currentDay: 7, maxDays: 60, status: "active", tickRate: 5 }, team);
    expect(state.machines.baking).toEqual({ owned: 2, active: 2, arriving: 0, broken: 1, repairDays: 2 });
    expect([state.day, state.cash, state.mix, state.packagingMaterial, state.finished, state.produced]).toEqual([7, 1234, 300, 80, 42, 80]);
  });
});