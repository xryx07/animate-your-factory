import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FactoryVisualization } from "@/components/FactoryVisualization";
import { DEFAULT_LAYOUT, loadStoredLayout, saveStoredLayout, type FactoryLayout } from "@/lib/factory-layout";
import { advanceDay, initialSimulation, type SimulationState } from "@/lib/muffin-simulation";

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
  const [layout, setLayout] = useState<FactoryLayout>(DEFAULT_LAYOUT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadStoredLayout();
    if (saved) setLayout(saved.layout);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) saveStoredLayout({ layout }); }, [ready, layout]);

  useEffect(() => {
    const timer = window.setInterval(() => setState(previous => previous.day >= previous.maxDays || previous.cash <= 0 ? initialSimulation() : advanceDay(previous)), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return <main className="visual-page">
    <div className="visual-wrap">
      <FactoryVisualization state={state} playing layout={layout}/>
    </div>
  </main>;
}
