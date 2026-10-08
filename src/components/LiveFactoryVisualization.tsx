import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FactoryVisualization, type FactoryVisualizationProps } from "./FactoryVisualization";
import { adaptHostGame, type HostSnapshot, type HostStore } from "@/lib/host-game-adapter";
import { STAGE_ORDER } from "@/lib/factory-layout";
import { operatingCapacity } from "@/lib/muffin-simulation";
import type { FactoryClock } from "@/lib/factory-clock";

const EMPTY: HostSnapshot = { room: null, teamState: null };
/** Embed with the existing useGameStore. Its own authenticated socket remains the only source of state. */
export function LiveFactoryVisualization({ store, ...visual }: { store: HostStore } & Omit<FactoryVisualizationProps, "state" | "playing" | "clock">) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getState, () => EMPTY);
  const [clock, setClock] = useState<FactoryClock>({ elapsedSeconds: 0, productionSeconds: 0, running: false });
  const latest = useRef(snapshot);
  const dayAnchor = useRef({ day: -1, id: "", elapsed: 0 });
  useEffect(() => { latest.current = snapshot; }, [snapshot]);
  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); const delta = Math.max(0, (now - previous) / 1000); previous = now;
      const { room, teamState } = latest.current;
      if (!room || !teamState) return;
      const state = adaptHostGame(room, teamState);
      setClock(old => {
        const identity = `${room.id}:${teamState.id}`;
        if (dayAnchor.current.id !== identity) { dayAnchor.current = { day: room.currentDay, id: identity, elapsed: 0 }; old = { elapsedSeconds: 0, productionSeconds: 0, running: false }; }
        const active = room.status === "active" && teamState.status === "active";
        const elapsedSeconds = old.elapsedSeconds + (active ? delta : 0);
        if (dayAnchor.current.day !== room.currentDay) dayAnchor.current = { ...dayAnchor.current, day: room.currentDay, elapsed: elapsedSeconds };
        const withinDay = Math.min(Math.max(0, room.tickRate), elapsedSeconds - dayAnchor.current.elapsed);
        const repairs: NonNullable<FactoryClock["repairs"]> = {};
        for (const kind of STAGE_ORDER) {
          const remaining = state.machines[kind].repairDays;
          if (remaining <= 0) continue;
          const completesAt = elapsedSeconds + Math.max(0, remaining * room.tickRate - withinDay);
          repairs[kind] = { startedAt: old.repairs?.[kind]?.startedAt ?? elapsedSeconds, completesAt };
        }
        const running = active && state.mix > 0 && state.packagingMaterial > 0 && STAGE_ORDER.every(k => operatingCapacity(state, k) > 0);
        return { elapsedSeconds, productionSeconds: old.productionSeconds + (running ? delta : 0), running, repairs };
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);
  const { room, teamState } = snapshot;
  if (!room || !teamState) return <p className="editor-message" role="status">Waiting for game room and team state.</p>;
  return <FactoryVisualization {...visual} state={adaptHostGame(room, teamState)} playing={room.status === "active"} clock={clock}/>;
}