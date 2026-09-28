import { Activity, AlertTriangle, Factory, PackageCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import floorImage from "@/assets/factory-line.jpg";
import bakedImage from "@/assets/muffin-baked.png";
import icedImage from "@/assets/muffin-iced.png";
import boxImage from "@/assets/muffin-box.png";
import { MACHINE_CONFIG, operatingCapacity, type MachineKind, type SimulationState } from "@/lib/muffin-simulation";
import { DEFAULT_LAYOUT, STAGE_ORDER, type FactoryLayout } from "@/lib/factory-layout";

const labels: Record<MachineKind, string> = { mixing: "MIXER", baking: "OVEN", icing: "ICING", packaging: "PACKER" };

export type FactoryVisualizationProps = {
  state: SimulationState;
  playing: boolean;
  speed?: number;
  layout?: FactoryLayout;
  background?: string | null;
};

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Presentational production line. Pass the host game's current simulation state and clock. */
export function FactoryVisualization({
  state,
  playing,
  speed = 1,
  layout = DEFAULT_LAYOUT,
  background,
}: FactoryVisualizationProps) {
  const capacities = STAGE_ORDER.map(kind => ({ kind, capacity: operatingCapacity(state, kind) }));
  const bottleneck = capacities.reduce((min, item) => (item.capacity < min.capacity ? item : min));
  const theoretical = Math.max(0, Math.min(state.mix, state.packagingMaterial, bottleneck.capacity));
  const running = playing && theoretical > 0 && state.day < state.maxDays && state.cash > 0;
  const awaiting = state.transits.filter(order => order.arrivalDay > state.day);
  const nextDelivery = awaiting.length ? Math.min(...awaiting.map(order => order.arrivalDay - state.day)) : null;
  const issue = state.mix <= 0
    ? "Mix depleted"
    : state.packagingMaterial <= 0
      ? "Packaging depleted"
      : bottleneck.capacity === 0
        ? `${MACHINE_CONFIG[bottleneck.kind].label} offline`
        : null;

  // Belt geometry. Products are spread evenly over the path, so the gap between
  // two neighbours is constant and they can never bunch up or overlap.
  const pathStart = Math.min(layout.intakeX, layout.dispatchX - 12);
  const pathEnd = layout.dispatchX;
  const pathLength = Math.max(12, pathEnd - pathStart);
  const unitCount = Math.max(1, Math.min(10, Math.floor(pathLength / Math.max(5, layout.minGap))));
  const cycle = Math.max(2.2, Math.min(16, (900 / Math.max(25, theoretical)) / (speed * layout.speedScale)));

  const [phase, setPhase] = useState(0);
  const frame = useRef<number>(0);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!running || reduced) return;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setPhase(current => (current + delta / cycle) % 1);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [running, reduced, cycle]);

  const products = Array.from({ length: unitCount }, (_, index) => {
    const progress = ((running && !reduced ? phase : 0) + index / unitCount) % 1;
    const x = pathStart + progress * pathLength;
    const image = x < layout.machines.icing ? bakedImage : x < layout.machines.packaging ? icedImage : boxImage;
    const fade = Math.min(1, progress / 0.08, (1 - progress) / 0.08);
    return { x, image, opacity: Math.max(0, fade), key: index };
  });

  const sceneStyle = {
    "--belt-y": `${layout.beltY}%`,
    "--label-y": `${layout.labelY}%`,
    "--product-scale": layout.productScale,
  } as CSSProperties;

  return (
    <section className="factory-visual" aria-label="Live muffin factory production line">
      <div className="factory-header">
        <div className="factory-title">
          <Factory size={18} strokeWidth={1.8} />
          <span>FACTORY FLOOR</span>
          <small>LIVE PRODUCTION</small>
        </div>
        <div className={`factory-live ${running ? "active" : ""}`}>
          <i />
          {running ? "LINE RUNNING" : issue ? "LINE STOPPED" : "PAUSED"}
        </div>
      </div>

      <div className={`factory-scene ${running ? "is-running" : ""}`} style={sceneStyle}>
        <img
          className="factory-background"
          src={background || floorImage}
          alt="Muffin mixing, baking, icing and packaging machines on a continuous bakery conveyor"
        />
        <div className="factory-scene-vignette" />

        {STAGE_ORDER.map(kind => {
          const machine = state.machines[kind];
          const capacity = operatingCapacity(state, kind);
          const broken = machine.broken > 0;
          const status = broken ? "REPAIR" : machine.active === 0 ? "OFF" : issue ? "WAITING" : running ? "RUNNING" : "READY";
          return (
            <div
              className={`stage-pin ${broken ? "stage-broken" : ""} ${running && !issue && capacity > 0 ? "stage-running" : ""} ${kind === bottleneck.kind && capacity > 0 && !issue ? "stage-bottleneck" : ""}`}
              key={kind}
              style={{ left: `${layout.machines[kind]}%` }}
              title={`${MACHINE_CONFIG[kind].label}: ${capacity} muffins per day; ${status.toLowerCase()}`}
            >
              <div className="stage-pin-top"><i /><span>{labels[kind]}</span></div>
              <div className="stage-pin-bottom">{broken ? `${machine.repairDays}d repair` : `${capacity}/day`}</div>
            </div>
          );
        })}

        {running && (
          <div className="machine-effects" aria-hidden="true">
            <i className="oven-warmth" style={{ left: `${layout.machines.baking}%` }} />
            <i className="icing-action" style={{ left: `${layout.machines.icing}%`, bottom: `calc(${layout.beltY}% + 1.5%)` }} />
            <i className="packer-action" style={{ left: `${layout.machines.packaging}%` }} />
          </div>
        )}

        <div className="belt-products" aria-hidden="true">
          {products.map(product => (
            <img
              key={product.key}
              src={product.image}
              alt=""
              style={{ left: `${product.x}%`, opacity: running ? product.opacity : 0.85 }}
            />
          ))}
        </div>

        <div className="scene-left-label">
          <span>RAW MATERIAL</span>
          <strong>{state.mix.toLocaleString()}</strong>
          <small>mix units</small>
        </div>
        <div className="scene-right-label">
          <PackageCheck size={16} />
          <span>READY TO SHIP</span>
          <strong>{state.finished.toLocaleString()}</strong>
        </div>
        {issue && <div className="scene-issue"><AlertTriangle size={15} />{issue}</div>}
      </div>

      <div className="factory-rail" aria-label="Production status">
        <div className="rail-cell"><span>01 / SUPPLY</span><strong>{state.mix.toLocaleString()} <small>mix</small></strong></div>
        <div className="rail-cell"><span>02 / PACKAGING</span><strong>{state.packagingMaterial.toLocaleString()} <small>boxes</small></strong></div>
        <div className="rail-cell"><span>03 / OUTPUT</span><strong>{theoretical} <small>/ day</small></strong></div>
        <div className="rail-cell"><span>04 / CONSTRAINT</span><strong className="constraint-value">{issue || MACHINE_CONFIG[bottleneck.kind].label}</strong></div>
        <div className="rail-cell"><span>05 / DISPATCH</span><strong>{state.finished.toLocaleString()} <small>ready</small></strong></div>
      </div>
      <div className="factory-footer">
        <span><Activity size={14} />{running ? `Producing up to ${theoretical} muffins/day` : issue || "Production paused"}</span>
        <span><Truck size={15} />{nextDelivery === null ? "No delivery scheduled" : `Supply arrives in ${nextDelivery} day${nextDelivery === 1 ? "" : "s"}`}</span>
        <span>DAY {state.day} / {state.maxDays}</span>
      </div>
    </section>
  );
}
