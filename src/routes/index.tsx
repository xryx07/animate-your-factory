import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FactoryVisualization } from "@/components/FactoryVisualization";
import { FactoryLayoutEditor } from "@/components/FactoryLayoutEditor";
import { DEFAULT_LAYOUT, loadStoredLayout, saveStoredLayout, type FactoryLayout } from "@/lib/factory-layout";
import { advanceDay, initialSimulation, type SimulationState } from "@/lib/muffin-simulation";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Muffin Factory — Factory Floor Designer" },
    { name: "description", content: "Upload a factory reference image and edit a collision-safe muffin production line layout." },
    { property: "og:title", content: "Muffin Factory — Factory Floor Designer" },
    { property: "og:description", content: "Design a live muffin factory floor from a reference image, then refine its machines and animation." },
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
      <FactoryLayoutEditor layout={layout} onChange={setLayout}/>
    </div>
  </main>;
}
