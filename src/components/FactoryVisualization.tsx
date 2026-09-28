import { Activity, AlertTriangle, Factory, PackageCheck, Truck } from "lucide-react";
import type { CSSProperties } from "react";
import floorImage from "@/assets/factory-line.jpg";
import bakedImage from "@/assets/muffin-baked.png";
import icedImage from "@/assets/muffin-iced.png";
import boxImage from "@/assets/muffin-box.png";
import { MACHINE_CONFIG, operatingCapacity, type MachineKind, type SimulationState } from "@/lib/muffin-simulation";

const stages: MachineKind[] = ["mixing", "baking", "icing", "packaging"];
const labels: Record<MachineKind, string> = { mixing: "MIXER", baking: "OVEN", icing: "ICING", packaging: "PACKER" };
const positions: Record<MachineKind, number> = { mixing: 19, baking: 43, icing: 66, packaging: 84 };
const units = [
  { image: bakedImage, from: 29, to: 44, delay: -0.4 },
  { image: bakedImage, from: 45, to: 63, delay: -1.4 },
  { image: icedImage, from: 70, to: 82, delay: -2.1 },
  { image: boxImage, from: 86, to: 98, delay: -3.1 },
];

export type FactoryVisualizationProps = {
  state: SimulationState;
  playing: boolean;
  speed?: number;
};

/** Presentational production line. Pass the host game's current simulation state and clock. */
export function FactoryVisualization({ state, playing, speed = 1 }: FactoryVisualizationProps) {
  const capacities = stages.map(kind => ({ kind, capacity: operatingCapacity(state, kind) }));
  const bottleneck = capacities.reduce((min, item) => item.capacity < min.capacity ? item : min);
  const theoretical = Math.max(0, Math.min(state.mix, state.packagingMaterial, bottleneck.capacity));
  const running = playing && theoretical > 0 && state.day < state.maxDays && state.cash > 0;
  const duration = Math.max(1.3, (5 / speed) * 80 / Math.max(30, theoretical));
  const awaiting = state.transits.filter(order => order.arrivalDay > state.day);
  const nextDelivery = awaiting.length ? Math.min(...awaiting.map(order => order.arrivalDay - state.day)) : null;
  const issue = state.mix <= 0 ? "Mix depleted" : state.packagingMaterial <= 0 ? "Packaging depleted" : bottleneck.capacity === 0 ? `${MACHINE_CONFIG[bottleneck.kind].label} offline` : null;

  return <section className="factory-visual" aria-label="Live muffin factory production line">
    <div className="factory-header">
      <div className="factory-title"><Factory size={18} strokeWidth={1.8}/><span>FACTORY FLOOR</span><small>LIVE PRODUCTION</small></div>
      <div className={`factory-live ${running ? "active" : ""}`}><i/>{running ? "LINE RUNNING" : issue ? "LINE STOPPED" : "PAUSED"}</div>
    </div>

    <div className={`factory-scene ${running ? "is-running" : ""}`} style={{ "--cycle": `${duration}s` } as CSSProperties}>
      <img className="factory-background" src={floorImage} width={1536} height={640} alt="Muffin mixing, baking, icing and packaging machines on a continuous bakery conveyor"/>
      <div className="factory-scene-vignette"/>
      {stages.map(kind => {
        const machine = state.machines[kind];
        const capacity = operatingCapacity(state, kind);
        const broken = machine.broken > 0;
        const status = broken ? "REPAIR" : machine.active === 0 ? "OFF" : issue ? "WAITING" : running ? "RUNNING" : "READY";
        return <div className={`stage-pin ${broken ? "stage-broken" : ""} ${running && !issue && capacity > 0 ? "stage-running" : ""} ${kind === bottleneck.kind && capacity > 0 && !issue ? "stage-bottleneck" : ""}`} key={kind} style={{ left: `${positions[kind]}%` }} title={`${MACHINE_CONFIG[kind].label}: ${capacity} muffins per day; ${status.toLowerCase()}`}>
          <div className="stage-pin-top"><i/><span>{labels[kind]}</span></div>
          <div className="stage-pin-bottom">{broken ? `${machine.repairDays}d repair` : `${capacity}/day`}</div>
        </div>;
      })}
      {running && <div className="machine-effects" aria-hidden="true"><i className="oven-warmth"/><i className="icing-action"/><i className="packer-action"/></div>}
      <div className="belt-products" aria-hidden="true">
        {running && units.map((unit, index) => <img key={index} src={unit.image} width={816} height={816} alt="" style={{ "--from": `${unit.from}%`, "--to": `${unit.to}%`, "--delay": `${unit.delay}s` } as CSSProperties} />)}
      </div>
      <div className="scene-left-label"><span>RAW MATERIAL</span><strong>{state.mix.toLocaleString()}</strong><small>mix units</small></div>
      <div className="scene-right-label"><PackageCheck size={16}/><span>READY TO SHIP</span><strong>{state.finished.toLocaleString()}</strong></div>
      {issue && <div className="scene-issue"><AlertTriangle size={15}/>{issue}</div>}
    </div>

    <div className="factory-rail" aria-label="Production status">
      <div className="rail-cell"><span>01 / SUPPLY</span><strong>{state.mix.toLocaleString()} <small>mix</small></strong></div>
      <div className="rail-cell"><span>02 / PACKAGING</span><strong>{state.packagingMaterial.toLocaleString()} <small>boxes</small></strong></div>
      <div className="rail-cell"><span>03 / OUTPUT</span><strong>{theoretical} <small>/ day</small></strong></div>
      <div className="rail-cell"><span>04 / CONSTRAINT</span><strong className="constraint-value">{issue || MACHINE_CONFIG[bottleneck.kind].label}</strong></div>
      <div className="rail-cell"><span>05 / DISPATCH</span><strong>{state.finished.toLocaleString()} <small>ready</small></strong></div>
    </div>
    <div className="factory-footer">
      <span><Activity size={14}/>{running ? `Producing up to ${theoretical} muffins/day` : issue || "Production paused"}</span>
      <span><Truck size={15}/>{nextDelivery === null ? "No delivery scheduled" : `Supply arrives in ${nextDelivery} day${nextDelivery === 1 ? "" : "s"}`}</span>
      <span>DAY {state.day} / {state.maxDays}</span>
    </div>
  </section>;
}
