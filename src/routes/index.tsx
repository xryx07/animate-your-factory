import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FactoryVisualization } from "@/components/FactoryVisualization";
import { FactoryLibraryControls } from "@/components/FactoryLibraryControls";
import { initialLibrary, loadLibrary, saveLibrary, type FactoryLibrary } from "@/lib/factory-library";
import { STAGE_ORDER } from "@/lib/factory-layout";
import { operatingCapacity, advanceDay, initialSimulation, type SimulationState } from "@/lib/muffin-simulation";
import type { FactoryClock } from "@/lib/factory-clock";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Muffin Factory — Live Factory Floor" },
    { name: "description", content: "Watch the muffin factory production line with machine health, breakdown and repair visuals." },
    { property: "og:title", content: "Muffin Factory — Live Factory Floor" },
    { property: "og:description", content: "Live muffin production with collision-safe conveyor animation and state-linked machine health and repairs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FactoryPreview,
});

function FactoryPreview() {
  const [state, setState] = useState<SimulationState>(initialSimulation);
  const [library, setLibrary] = useState<FactoryLibrary>(initialLibrary);
  const [selected, setSelected] = useState<string[]>(["original"]);
  const [storageError, setStorageError] = useState(false);
  const [clock, setClock] = useState<FactoryClock>({ elapsedSeconds: 0, productionSeconds: 0, running: true });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadLibrary();
    setLibrary(saved); setSelected([saved.defaultId]);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) setStorageError(!saveLibrary(library)); }, [ready, library]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(previous => ({ ...previous, elapsedSeconds: previous.elapsedSeconds + .1, productionSeconds: previous.productionSeconds + (previous.running ? .1 : 0) }));
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setState(previous => previous.day >= previous.maxDays || previous.cash <= 0 ? initialSimulation() : advanceDay(previous)), 5000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setClock(previous => {
      const repairs = { ...previous.repairs };
      for (const kind of STAGE_ORDER) {
        const machine = state.machines[kind];
        if (!machine.broken) delete repairs[kind];
        else if (!repairs[kind]) repairs[kind] = { startedAt: previous.elapsedSeconds, completesAt: previous.elapsedSeconds + machine.repairDays * 5 };
      }
      return { ...previous, repairs, running: state.mix > 0 && state.packagingMaterial > 0 && STAGE_ORDER.every(kind => operatingCapacity(state, kind) > 0) };
    });
  }, [state]);

  return <main className="visual-page">
    <div className="visual-wrap">
      <div className={`factory-comparison ${selected.length > 1 ? "is-comparing" : ""}`}>
        {selected.map(id => {
          const factory = library.factories.find(f => f.id === id);
          return factory ? <FactoryVisualization key={id} title={factory.name} state={state} playing layout={factory.layout} background={factory.background} clock={clock}/> : null;
        })}
      </div>
      <FactoryLibraryControls library={library} onChange={setLibrary} selected={selected} onSelect={setSelected}/>
      {storageError && <p role="alert" className="appearance-error">Could not save factories on this device. Free some storage before saving another photo.</p>}
    </div>
  </main>;
}
