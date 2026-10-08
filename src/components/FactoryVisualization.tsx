import { Activity, AlertTriangle, Check, Factory, PackageCheck, Truck, Wrench } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import floorImage from "@/assets/factory-line.jpg";
import batterImage from "@/assets/muffin-batter.png";
import bakedImage from "@/assets/muffin-baked.png";
import icedImage from "@/assets/muffin-iced.png";
import boxImage from "@/assets/muffin-box.png";
import { MACHINE_CONFIG, operatingCapacity, type MachineKind, type SimulationState } from "@/lib/muffin-simulation";
import { DEFAULT_LAYOUT, sanitizeLayout, STAGE_ORDER, type FactoryLayout } from "@/lib/factory-layout";
import { createFactoryMotion } from "@/lib/factory-motion";
import { DEFAULT_APPEARANCE, type FactoryAppearance } from "@/lib/factory-appearance";
import { repairTimingAt, type FactoryClock, type RepairTiming } from "@/lib/factory-clock";

const labels: Record<MachineKind, string> = { mixing: "MIXER", baking: "OVEN", icing: "ICING", packaging: "PACKAGER" };
const operations: Record<MachineKind, string> = { mixing: "MIXING", baking: "BAKING", icing: "ICING", packaging: "SEALING" };

function MachineCondition({ kind, machine, capacity, running, waiting, constrained, x, width, progress = 0, timing, seconds = 0 }: {
  kind: MachineKind; machine: SimulationState["machines"][MachineKind]; capacity: number;
   running: boolean; waiting: boolean; constrained: boolean; x: number; width: number; progress?: number; timing?: RepairTiming | undefined; seconds?: number | undefined;
}) {
  const broken = machine.broken > 0;
  const repairing = broken && machine.repairDays > 0;
  const health = machine.active > 0 ? Math.round(Math.max(0, machine.active - machine.broken) / machine.active * 100) : 0;
  const previousBroken = useRef(broken);
  const [recovered, setRecovered] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (previousBroken.current && !broken) {
      setRecovered(true);
      timer = setTimeout(() => setRecovered(false), 2400);
    } else if (broken) setRecovered(false);
    previousBroken.current = broken;
    return () => { if (timer) clearTimeout(timer); };
  }, [broken]);
  const duration = kind === "mixing" || kind === "baking" ? 2 : 1;
  const liveRepair = timing ? repairTimingAt(timing, seconds) : null;
  const repairProgress = Math.round(liveRepair?.progress ?? Math.max(0, Math.min(1, 1 - machine.repairDays / duration)) * 100);
  const remainingLabel = liveRepair ? `${Math.ceil(liveRepair.remaining)}s` : `${machine.repairDays}d`;
  const status = repairing ? "REPAIRING" : broken ? "FAILED" : machine.active === 0 ? "OFF" : recovered ? "RESTORED" : waiting ? "WAITING" : running ? "RUNNING" : "READY";
  const description = `${MACHINE_CONFIG[kind].label}: ${status.toLowerCase()}, health ${health}% (${Math.max(0, machine.active - machine.broken)} of ${machine.active} active units working)${repairing ? `, ${machine.repairDays} days remaining` : ""}`;
  return <>
    <div className={`stage-pin ${broken ? "stage-broken" : ""} ${repairing ? "stage-repairing" : ""} ${recovered ? "stage-restored" : ""} ${running && capacity > 0 ? "stage-running" : ""} ${constrained ? "stage-bottleneck" : ""}`}
      style={{ left: `${x}%`, "--pin-width": `${width}%`, "--health": `${health}%`, "--repair-progress": `${repairProgress}%` } as CSSProperties}
      title={description} aria-label={description}>
      <div className="stage-pin-top"><i /><span>{labels[kind]}</span></div>
      <div className="machine-health" role="progressbar" aria-label={`${MACHINE_CONFIG[kind].label} health`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={health}><span /></div>
      <div className="machine-health-value"><span>HP</span><strong>{health}%</strong></div>
      <div className="stage-pin-bottom">{repairing ? <><Wrench size={9}/>{remainingLabel}</> : broken ? "FAILED" : recovered ? <><Check size={9}/>OK</> : running ? operations[kind] : `${capacity}/day`}</div>
      {running && <div className="machine-operation-progress"><span style={{ width: `${progress * 100}%` }}/></div>}
      {repairing && <div className="machine-repair-progress" role="progressbar" aria-label={`${MACHINE_CONFIG[kind].label} repair`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={repairProgress} aria-valuetext={`${remainingLabel} remaining`}><span /></div>}
    </div>
    {(broken || recovered) && <div className={`machine-condition-effect ${broken ? "condition-failed" : "condition-restored"} ${repairing ? "condition-repairing" : ""}`} style={{ left: `${x}%` }} aria-hidden="true">
      {broken && <div className="machine-smoke"><i/><i/><i/></div>}
      <div className="machine-condition-icon">{repairing ? <Wrench size={18}/> : broken ? <AlertTriangle size={18}/> : <Check size={18}/>}</div>
    </div>}
  </>;
}

export type FactoryVisualizationProps = {
  state: SimulationState;
  playing: boolean;
  speed?: number;
  layout?: FactoryLayout;
  background?: string | null;
  appearance?: FactoryAppearance;
  clock?: FactoryClock;
  title?: string;
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
  appearance = DEFAULT_APPEARANCE,
  clock,
  title = "FACTORY FLOOR",
}: FactoryVisualizationProps) {
  const safeLayout = sanitizeLayout(layout);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneWidth, setSceneWidth] = useState(640);
  useEffect(() => {
    const element = sceneRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setSceneWidth(entries[0]?.contentRect.width ?? 640));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const capacities = STAGE_ORDER.map(kind => ({ kind, capacity: operatingCapacity(state, kind) }));
  const bottleneck = capacities.reduce((min, item) => (item.capacity < min.capacity ? item : min));
  const theoretical = Math.max(0, Math.min(state.mix, state.packagingMaterial, bottleneck.capacity));
  const running = playing && (clock?.running ?? true) && theoretical > 0 && state.day < state.maxDays && state.cash > 0;
  const awaiting = state.transits.filter(order => order.arrivalDay > state.day);
  const nextDelivery = awaiting.length ? Math.min(...awaiting.map(order => order.arrivalDay - state.day)) : null;
  const issue = state.mix <= 0
    ? "Mix depleted"
    : state.packagingMaterial <= 0
      ? "Packaging depleted"
      : bottleneck.capacity === 0
        ? `${MACHINE_CONFIG[bottleneck.kind].label} offline`
        : null;

  // Reserve a full processing stop plus safe travel spacing between arrivals.
  const spriteWidth = Math.max(16, Math.min(51, sceneWidth * 0.034)) * safeLayout.productScale;
  const safeGap = Math.max(safeLayout.minGap, (spriteWidth + 8) / sceneWidth * 100);
  const motion = createFactoryMotion(safeLayout, safeGap);
  const cycle = Math.max(8, Math.min(28, (1500 / Math.max(25, theoretical)) / (Math.max(.25, speed) * safeLayout.speedScale)));

  const [phase, setPhase] = useState(0);
  const frame = useRef<number>(0);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!running || reduced || clock) return;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(.05, (now - previous) / 1000);
      previous = now;
      setPhase(current => current + delta / cycle);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [running, reduced, cycle, clock]);

  const products = Array.from({ length: motion.count }, (_, index) => {
    const sample = motion.sample(reduced ? 1 : clock ? clock.productionSeconds / 18.75 * safeLayout.speedScale : phase, index);
    const image = sample.completed < 2 ? batterImage : sample.completed < 3 ? bakedImage : sample.completed < 4 ? icedImage : boxImage;
    const p = sample.processing;
    // A lift carries each product from the front conveyor to the actual chamber,
    // holds it there during processing, then lowers the finished product back.
    const lift = sample.stage ? Math.min(1, p / .18, (1 - p) / .18) : 0;
    const chamberBottom = sample.stage === "mixing" ? 40 : sample.stage === "baking" ? 44 : sample.stage === "icing" ? 31 : 39;
    return { ...sample, image, lift, bottom: safeLayout.beltY + lift * Math.max(0, chamberBottom - safeLayout.beltY), opacity: sample.visible ? sample.fade : 0, key: index };
  });
  const processing = (kind: MachineKind) => products.find(product => product.visible && product.stage === kind);

  const sceneStyle = {
    "--belt-y": `${safeLayout.beltY}%`,
    "--label-y": `${safeLayout.labelY}%`,
    "--product-scale": safeLayout.productScale,
    "--scene-brightness": Math.max(70, Math.min(130, appearance.brightness)) / 100,
  } as CSSProperties;

  return (
    <section className="factory-visual" aria-label="Live muffin factory production line">
      <div className="factory-header">
        <div className="factory-title">
          <Factory size={18} strokeWidth={1.8} />
          <span>{title}</span>
          <small>LIVE PRODUCTION</small>
        </div>
        <div className={`factory-live ${running ? "active" : ""}`}>
          <i />
          {running ? "LINE RUNNING" : issue ? "LINE STOPPED" : "PAUSED"}
        </div>
      </div>

      <div ref={sceneRef} className={`factory-scene lighting-${appearance.lighting} visual-style-${appearance.style} ${running ? "is-running" : ""}`} style={sceneStyle}>
        <img
          className="factory-background"
          src={background || appearance.background || floorImage}
          alt="Muffin mixing, baking, icing and packaging machines on a continuous bakery conveyor"
        />
        <div className="factory-scene-vignette" />
        <div className="factory-lighting" aria-hidden="true" />

        {STAGE_ORDER.map(kind => {
          const machine = state.machines[kind];
          const capacity = operatingCapacity(state, kind);
          const index = STAGE_ORDER.indexOf(kind);
          const x = safeLayout.machines[kind];
          const previous = STAGE_ORDER[index - 1];
          const next = STAGE_ORDER[index + 1];
          const width = Math.min(15, previous ? x - safeLayout.machines[previous] - 1 : x * 2 - 1, next ? safeLayout.machines[next] - x - 1 : (100 - x) * 2 - 1);
          return (
            <MachineCondition key={kind} kind={kind} machine={machine} capacity={capacity} running={running && Boolean(processing(kind))} progress={processing(kind)?.processing ?? 0} waiting={Boolean(issue)} constrained={kind === bottleneck.kind && capacity > 0 && !issue} x={x} width={width} timing={clock?.repairs?.[kind]} seconds={clock?.elapsedSeconds}/>
          );
        })}

        <div className="machine-effects" aria-hidden="true">
          {STAGE_ORDER.map(kind => {
            const product = processing(kind);
            if (!product || !running) return null;
            const working = product.processing > .18 && product.processing < .82;
            const stroke = Math.sin(Math.PI * product.processing);
            return <div key={kind} className={`machine-processing processing-${kind} ${working ? "chamber-working" : "chamber-transfer"}`} data-machine={kind} style={{ left: `${safeLayout.machines[kind]}%`, "--process": product.processing, "--stroke": stroke, "--turn": `${product.processing * 2160}deg` } as CSSProperties}>
              <i className="machine-lift" style={{ bottom: `${product.bottom - 1}%` }}/>
              {kind === "mixing" && <><i className="mixer-spindle"/><i className="mixer-batter"/><i className="mixer-paddle"/><i className="mixer-paddle paddle-second"/></>}
              {kind === "baking" && <><i className="oven-heat"/><i className="oven-fan"/><i className="oven-rack"/><i className="oven-steam"/></>}
              {kind === "icing" && <><i className="icing-nozzle"/>{working && <i className="icing-stream"/>}</>}
              {kind === "packaging" && <><i className="packing-jaw jaw-left"/><i className="packing-jaw jaw-right"/><i className="packing-seal"/></>}
            </div>;
          })}
        </div>

        <div className="belt-products" aria-hidden="true">
          {products.map(product => (
            <div className={`factory-product ${product.stage ? `product-processing product-${product.stage}` : ""}`}
              key={product.key}
              data-product={product.key} data-stage={product.stage || "travel"} data-completed={product.completed}
              style={{ left: `${product.x}%`, bottom: `${product.bottom}%`, opacity: product.opacity, "--conversion": Math.max(0, Math.min(1, (product.processing - .45) / .3)), "--rise": 1 + product.processing * .12 } as CSSProperties}>
              <img src={product.image} alt=""/>
              {product.stage && product.stage !== "mixing" && <img className="product-result" src={product.stage === "baking" ? bakedImage : product.stage === "icing" ? icedImage : boxImage} alt=""/>}
            </div>
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
