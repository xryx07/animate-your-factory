import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gauge, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FactoryVisualization } from "@/components/FactoryVisualization";
import { advanceDay, initialSimulation, type SimulationState } from "@/lib/muffin-simulation";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Muffin Factory — Live Production Line" },
    { name: "description", content: "Watch a functional muffin production line respond to stock, machine capacity, breakdowns, deliveries and daily output." },
    { property: "og:title", content: "Muffin Factory — Live Production Line" },
    { property: "og:description", content: "A live muffin factory visual driven by production, inventory and machine state." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FactoryPreview,
});

function FactoryPreview() {
  const [state, setState] = useState<SimulationState>(initialSimulation);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setState(previous => advanceDay(previous)), 5000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    if (state.day >= state.maxDays || state.cash <= 0) setPlaying(false);
  }, [state.day, state.maxDays, state.cash]);

  const ended = state.day >= state.maxDays || state.cash <= 0;
  return <main className="visual-page">
    <div className="visual-wrap">
      <FactoryVisualization state={state} playing={playing} speed={speed}/>
      <div className="preview-controls" aria-label="Simulation controls">
        <span className="preview-day">DAY <strong>{state.day.toString().padStart(2, "0")}</strong> <span>/ {state.maxDays}</span></span>
        <div className="preview-actions">
          <Button variant="outline" size="icon" aria-label="Reset simulation" title="Reset simulation" onClick={() => { setPlaying(false); setState(initialSimulation()); }}><RotateCcw/></Button>
          <Button variant="default" size="icon" aria-label={playing ? "Pause simulation" : "Start simulation"} title={playing ? "Pause" : "Play"} disabled={ended} onClick={() => setPlaying(current => !current)}>{playing ? <Pause/> : <Play/>}</Button>
          <Button variant="outline" size="icon" aria-label="Advance one day" title="Advance one day" disabled={ended} onClick={() => setState(advanceDay)}><SkipForward/></Button>
          <Button variant="outline" aria-label={`Speed ${speed} times; change speed`} title="Change speed" onClick={() => setSpeed(current => current === 1 ? 2 : current === 2 ? 4 : 1)}><Gauge size={15}/>{speed}×</Button>
        </div>
      </div>
    </div>
  </main>;
}
