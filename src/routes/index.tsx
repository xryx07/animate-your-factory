import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Check, ChevronDown, Clock3, Coins, Factory, Gauge, Minus, Package, Pause, Play, Plus, RotateCcw, Settings2, ShoppingCart, SkipForward, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceDay, initialSimulation, MACHINE_CONFIG, operatingCapacity, type Allocation, type MachineKind, type SimulationState } from "@/lib/muffin-simulation";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Muffin Factory — Operations Simulator" },
    { name: "description", content: "Run a live muffin production line. Manage inventory, machine capacity, orders, demand, contracts, and cash in a playable factory simulator." },
    { property: "og:title", content: "Muffin Factory — Operations Simulator" },
    { property: "og:description", content: "A playable muffin factory simulation with a live, state-driven production line." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Simulator,
});

const kinds: MachineKind[] = ["mixing", "baking", "icing", "packaging"];
const icons: Record<MachineKind, string> = { mixing: "🥣", baking: "♨", icing: "✿", packaging: "▣" };
const stages: Record<MachineKind, string> = { mixing: "MIX-01", baking: "BAKE-01", icing: "ICE-01", packaging: "PACK-01" };
const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function NumberControl({ label, value, setValue, step = 50 }: { label: string; value: number; setValue: (value: number) => void; step?: number }) {
  return <div className="number-row"><label>{label}</label><div className="number-stepper">
    <Button variant="stepper" size="icon" title={`Decrease ${label}`} onClick={() => setValue(Math.max(0, value - step))}><Minus /></Button>
    <input aria-label={label} type="number" min="0" value={value} onChange={e => setValue(Math.max(0, Number(e.target.value) || 0))} />
    <Button variant="stepper" size="icon" title={`Increase ${label}`} onClick={() => setValue(value + step)}><Plus /></Button>
  </div></div>;
}

function Muffin({ form = "baked", delay = 0 }: { form?: "batter" | "baked" | "iced" | "boxed"; delay?: number }) {
  return <div className={`muffin muffin-${form}`} style={{ animationDelay: `${delay}s` }} aria-hidden="true">
    {form === "boxed" ? <><span className="box-flap"/><span className="box-stamp">M</span></> : <><span className="muffin-top"/><span className="muffin-cup"/>{form === "iced" && <span className="muffin-icing"/>}</>}
  </div>;
}

function MachineArt({ kind, running, broken }: { kind: MachineKind; running: boolean; broken: boolean }) {
  return <div className={`machine-art machine-${kind} ${running ? "machine-running" : ""} ${broken ? "machine-broken" : ""}`} aria-hidden="true">
    {kind === "mixing" && <><div className="mixer-hopper"><span/></div><div className="mixer-neck"/><div className="mixer-body"><div className="machine-label">MIX-01</div><span className="machine-light"/><div className="mixer-window"><span className="mixer-blade"/><span className="mixer-batter"/></div><div className="machine-knob"/></div><div className="machine-feet"/></>}
    {kind === "baking" && <><div className="oven-top"><span/></div><div className="oven-body"><div className="machine-label">BAKE-01</div><span className="machine-light"/><div className="oven-window"><span className="oven-rack"/><Muffin/><Muffin/></div><div className="oven-controls"><i/><i/><i/></div></div><div className="machine-feet"/></>}
    {kind === "icing" && <><div className="icer-tank"><span className="tank-fill"/></div><div className="icer-body"><div className="machine-label">ICE-01</div><span className="machine-light"/><div className="icer-arm"/><div className="icer-nozzle"/><div className="icing-drop"/><div className="machine-knob"/></div><div className="machine-feet"/></>}
    {kind === "packaging" && <><div className="packer-top"/><div className="packer-body"><div className="machine-label">PACK-01</div><span className="machine-light"/><div className="packer-window"><span className="packer-press"/><Muffin form="boxed"/></div><div className="packer-controls"><i/><i/><i/><i/></div></div><div className="machine-feet"/></>}
    {broken && <span className="fault-symbol">!</span>}
  </div>;
}

function FactoryFloor({ state, playing, speed }: { state: SimulationState; playing: boolean; speed: number }) {
  const capacity = Math.min(...kinds.map(kind => operatingCapacity(state, kind)));
  const flow = playing && capacity > 0 && state.mix > 0 && state.packagingMaterial > 0 && state.cash > 0 && state.day < state.maxDays;
  const throughput = Math.min(capacity, state.mix, state.packagingMaterial);
  const tempo = Math.max(1.4, 6 / speed * (80 / Math.max(30, throughput)));
  return <div className="factory-panel">
    <div className="section-heading floor-heading"><div className="heading-left"><span className={`live-dot ${flow ? "is-live" : ""}`}/><Factory size={16}/><span>FACTORY FLOOR</span><span className="heading-sub">LIVE SIMULATION</span></div><div className="floor-status">{flow ? <><Activity size={13}/> LINE RUNNING</> : <><Pause size={13}/> LINE STOPPED</>}</div></div>
    <div className="floor-scroll"><div className={`floor-scene ${flow ? "flowing" : ""}`} style={{ "--flow-duration": `${tempo}s` } as React.CSSProperties}>
      <div className="floor-wall"><div className="wall-pipe pipe-a"/><div className="wall-pipe pipe-b"/><div className="wall-pipe pipe-c"/><div className="wall-light light-a"/><div className="wall-light light-b"/><div className="wall-light light-c"/><div className="wall-light light-d"/><div className="wall-sign">FRESHLY MADE <span>✦</span> EVERY DAY</div></div>
      <div className="floor-backdrop"/>
      <div className="scene-stock stock-mix"><div className="stock-caption">MUFFIN MIX <strong>{state.mix.toLocaleString()}</strong></div><div className="stock-silo"><div className="silo-fill" style={{ height: `${Math.min(100, state.mix / 1000 * 100)}%` }}/><span>FLOUR<br/>+ MIX</span></div><div className="silo-feet"/></div>
      <div className="scene-stock stock-pack"><div className="stock-caption">BOX SUPPLY <strong>{state.packagingMaterial.toLocaleString()}</strong></div><div className="box-stack"><span/><span/><span/></div></div>
      <div className="scene-output"><span className="output-title">FINISHED GOODS</span><div className="output-crates"><span/><span/><span/></div><strong>{state.finished.toLocaleString()}</strong><small>ready to ship</small></div>
      <div className="conveyor"><div className="conveyor-belt"/><div className="conveyor-wheels">{Array.from({ length: 16 }, (_, i) => <i key={i}/>)}</div></div>
      <div className="travelers">{["batter", "baked", "iced", "boxed", "boxed"].map((form, i) => <div key={i} className={`traveler traveler-${i + 1}`}><Muffin form={form as "batter" | "baked" | "iced" | "boxed"} delay={i * -0.6}/></div>)}</div>
      <div className="machine-row">{kinds.map(kind => {
        const m = state.machines[kind];
        const cap = operatingCapacity(state, kind);
        const broken = m.broken > 0;
        const running = flow && cap > 0;
        const status = broken ? "BROKEN" : m.active === 0 ? "OFFLINE" : state.mix === 0 ? "STARVED" : state.packagingMaterial === 0 ? "BLOCKED" : playing ? "RUNNING" : "PAUSED";
        return <div className={`floor-station ${state.bottleneck === kind && cap > 0 ? "station-bottleneck" : ""} ${broken ? "station-fault" : ""}`} key={kind}>
          <div className="station-readout"><span className="station-dot"/>{status}<b>{cap}/DAY</b></div>
          <MachineArt kind={kind} running={running} broken={broken}/>
          <div className="station-name">{MACHINE_CONFIG[kind].label.toUpperCase()} <span>{m.active - m.broken}/{m.owned} ON</span></div>
        </div>;
      })}</div>
      <div className="floor-base"/><div className="floor-grid"/>
      <div className="floor-bottom"><span>01 / INPUT</span><span>02 / MIX</span><span>03 / BAKE</span><span>04 / ICE</span><span>05 / PACK</span><span>06 / DISPATCH</span></div>
    </div></div>
    <div className="floor-ticker"><span><span className="ticker-dot"/> {flow ? "IN PRODUCTION" : "PRODUCTION HALTED"}</span><span>THEORETICAL OUTPUT <strong>{throughput}/day</strong></span><span>BOTTLENECK <strong>{MACHINE_CONFIG[state.bottleneck].label}</strong></span><span>LAST BATCH <strong>{state.produced} muffins</strong></span></div>
  </div>;
}

function Simulator() {
  const [state, setState] = useState<SimulationState>(initialSimulation);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<"mix" | "packaging">("mix");
  const [expanded, setExpanded] = useState<"operations" | "contracts" | null>("operations");
  const [draftQty, setDraftQty] = useState(1000);
  const [draftReorder, setDraftReorder] = useState(300);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setState(prev => {
      const next = advanceDay(prev);
      if (next === prev) setPlaying(false);
      return next;
    }), 5000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    if (state.day >= state.maxDays || state.cash <= 0) setPlaying(false);
  }, [state.day, state.cash, state.maxDays]);

  const transit = useMemo(() => ({
    mix: state.transits.filter(x => x.material === "mix"),
    packaging: state.transits.filter(x => x.material === "packaging"),
  }), [state.transits]);
  const activeMachines = kinds.filter(kind => operatingCapacity(state, kind) > 0).length;
  const demandFilled = state.demand > 0 ? Math.round(state.sold / (state.demand + (state.contractActive ? 25 : 0)) * 100) : 0;

  const setDraftTab = (next: "mix" | "packaging") => {
    setTab(next);
    setDraftQty(next === "mix" ? state.mixOrderQty : state.packOrderQty);
    setDraftReorder(next === "mix" ? state.mixReorder : state.packReorder);
  };
  const applyOrder = () => {
    setState(prev => tab === "mix" ? { ...prev, mixOrderQty: draftQty, mixReorder: draftReorder } : { ...prev, packOrderQty: draftQty, packReorder: draftReorder });
    setNotice(`${tab === "mix" ? "Muffin mix" : "Packaging"} reorder settings saved.`);
  };
  const toggleMachine = (kind: MachineKind, delta: number) => {
    setState(prev => {
      const machine = prev.machines[kind];
      const active = Math.max(0, Math.min(machine.owned, machine.active + delta));
      return { ...prev, machines: { ...prev.machines, [kind]: { ...machine, active } } };
    });
  };
  const buyMachine = (kind: MachineKind) => {
    setState(prev => {
      const cost = MACHINE_CONFIG[kind].buy;
      if (prev.cash < cost) return prev;
      const machine = prev.machines[kind];
      return { ...prev, cash: prev.cash - cost, machines: { ...prev.machines, [kind]: { ...machine, owned: machine.owned + 1, active: machine.active + 1 } }, alert: `New ${MACHINE_CONFIG[kind].label.toLowerCase()} installed and ready to run.` };
    });
  };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon">🧁</div><div><h1>MUFFIN FACTORY</h1><div className="brand-meta"><b>CONTROLLER</b><span>OPERATIONS LAB</span></div></div></div>
      <div className="top-stat-grid">
        <div className="top-stat"><Coins/><span><small>TOTAL CASH</small><strong className="positive">{money(state.cash)}</strong></span></div>
        <div className="top-stat"><Clock3/><span><small>LIVE DAY</small><strong>Day {state.day} <em>/ {state.maxDays}</em></strong></span></div>
        <div className="top-stat"><Truck/><span><small>RAW MATERIAL ETA</small><strong>{transit.mix.length ? `${Math.max(0, transit.mix[0].arrivalDay - state.day)} days` : "—"}</strong></span></div>
        <div className="top-stat"><Package/><span><small>PACKAGING ETA</small><strong>{transit.packaging.length ? `${Math.max(0, transit.packaging[0].arrivalDay - state.day)} days` : "—"}</strong></span></div>
        <div className="top-stat"><Factory/><span><small>MACHINES</small><strong>{activeMachines} / 4 <em>running</em></strong></span></div>
        <div className="top-stat"><ShoppingCart/><span><small>CONTRACT</small><strong>{state.contractActive ? "25 / day" : "Inactive"}</strong></span></div>
      </div>
      <div className="header-badge" title="Team Muffin">✦ <span>TEAM MUFFIN</span></div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <section className="control-section inventory-section"><div className="section-heading green-heading"><Boxes size={16}/><span>RAW MATERIAL MANAGEMENT</span></div>
          <div className="inventory-inner"><div className="inventory-title">INVENTORY ON HAND</div><div className="inventory-grid">
            <div className="inventory-item"><small>MUFFIN MIX</small><strong>{state.mix.toLocaleString()}</strong><span>Transit: {transit.mix.reduce((n, t) => n + t.quantity, 0)}</span></div>
            <div className="inventory-item"><small>PACKAGING</small><strong>{state.packagingMaterial.toLocaleString()}</strong><span>Transit: {transit.packaging.reduce((n, t) => n + t.quantity, 0)}</span></div>
            <div className="inventory-item"><small>FINISHED</small><strong>{state.finished.toLocaleString()}</strong><span>Muffins</span></div>
          </div></div>
          <div className="inventory-tabs"><Button variant={tab === "mix" ? "tabActive" : "tab"} onClick={() => setDraftTab("mix")}>MUFFIN MIX</Button><Button variant={tab === "packaging" ? "tabActive" : "tab"} onClick={() => setDraftTab("packaging")}>PACKAGING</Button></div>
          <div className="inventory-fields"><NumberControl label="ORDER QUANTITY" value={draftQty} setValue={setDraftQty}/><NumberControl label="REORDER POINT" value={draftReorder} setValue={setDraftReorder}/><Button variant="success" className="w-full" onClick={applyOrder}><Check size={15}/> APPLY ORDER CHANGES</Button>{notice && <div role="status" className="inline-notice">{notice}</div>}</div>
        </section>

        <section className="control-section advisor-section"><div className="section-heading advisor-heading"><Zap size={16}/><span>OPERATIONS ADVISOR</span></div><div className="advisor-body"><AlertTriangle size={18}/><p>{state.alert}</p></div></section>

        <section className="control-section machines-section"><Button variant="panelHeader" className="section-heading purple-heading" onClick={() => setExpanded(expanded === "operations" ? null : "operations")}><Settings2 size={16}/><span>FACTORY OPERATIONS</span><span className="heading-count">{activeMachines} / 4 ACTIVE</span><ChevronDown className={expanded === "operations" ? "chevron-open" : ""}/></Button>
          {expanded === "operations" && <div className="machine-controls">
            {kinds.map(kind => { const m = state.machines[kind]; const cap = operatingCapacity(state, kind); const util = cap ? Math.min(100, Math.round(Math.min(state.produced || Math.min(state.mix, state.packagingMaterial, 80), cap) / cap * 100)) : 0; return <div className={`machine-control ${m.broken ? "control-broken" : ""}`} key={kind}>
              <div className="machine-control-head"><div className="machine-control-title"><span className="machine-emoji">{icons[kind]}</span><div><strong>{MACHINE_CONFIG[kind].label}</strong><small>{stages[kind]} · {m.broken ? `Repair ${m.repairDays}d` : `${m.owned} owned`}</small></div></div><div className="machine-stepper"><Button variant="stepper" size="icon" title={`Deactivate ${MACHINE_CONFIG[kind].label}`} disabled={m.active === 0} onClick={() => toggleMachine(kind, -1)}><Minus/></Button><strong>{m.active}/{m.owned}</strong><Button variant="stepper" size="icon" title={`Activate ${MACHINE_CONFIG[kind].label}`} disabled={m.active >= m.owned} onClick={() => toggleMachine(kind, 1)}><Plus/></Button></div></div>
              <div className="machine-control-bottom"><div className="capacity-info"><small>CAPACITY</small><strong>{cap}<span> / DAY</span></strong></div><div className="utilization"><small>UTILIZATION</small><div className="util-bar"><span style={{ width: `${util}%` }}/></div></div><Button variant="buy" title={`Buy ${MACHINE_CONFIG[kind].label} for ${money(MACHINE_CONFIG[kind].buy)}`} disabled={state.cash < MACHINE_CONFIG[kind].buy} onClick={() => buyMachine(kind)}><Plus size={12}/> BUY</Button></div>
            </div>; })}
          </div>}
        </section>
      </aside>

      <div className="main-column">
        <FactoryFloor state={state} playing={playing} speed={speed}/>
        <div className="simulation-bar"><div className="simulation-bar-title"><span className={`pulse-dot ${playing ? "is-live" : ""}`}/><div><strong>{state.cash <= 0 ? "FACTORY BANKRUPT" : state.day >= state.maxDays ? "SIMULATION COMPLETE" : playing ? "SIMULATION IN PROGRESS" : "SIMULATION PAUSED"}</strong><small>DAY {state.day} OF {state.maxDays} · {playing ? "PRODUCTION ACTIVE" : "WAITING FOR NEXT DAY"}</small></div></div><div className="progress-wrap"><div className="progress-track"><span style={{ width: `${state.day / state.maxDays * 100}%` }}/></div><small>{Math.round(state.day / state.maxDays * 100)}%</small></div><div className="sim-actions"><Button variant="iconTool" size="icon" title="Reset simulation" onClick={() => { setPlaying(false); setState(initialSimulation()); setDraftTab("mix"); setNotice(""); }}><RotateCcw/></Button><Button variant="iconTool" size="icon" title={playing ? "Pause simulation" : "Start simulation"} disabled={state.day >= state.maxDays || state.cash <= 0} onClick={() => setPlaying(v => !v)}>{playing ? <Pause/> : <Play/>}</Button><Button variant="iconTool" size="icon" title="Advance one day" disabled={state.day >= state.maxDays || state.cash <= 0} onClick={() => setState(advanceDay)}><SkipForward/></Button><Button variant="speed" onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)} title="Change simulation speed">{speed}× <Gauge size={15}/></Button></div></div>

        <div className="lower-grid"><section className="metrics-section"><div className="section-heading compact-heading"><Activity size={16}/><span>DAILY PERFORMANCE</span><small>DAY {state.day}</small></div><div className="metric-grid">
          <div className="metric"><small>MUFFINS PRODUCED</small><strong>{state.produced}</strong><span>Capacity: {Math.min(...kinds.map(k => operatingCapacity(state, k)))}/day</span></div>
          <div className="metric"><small>DEMAND / SALES</small><strong>{state.demand} <em>/ {state.sold}</em></strong><span>{state.lostSales} missed orders</span></div>
          <div className="metric"><small>REVENUE</small><strong>{money(state.revenue)}</strong><span>{state.contractFulfilled}/25 contract units</span></div>
          <div className="metric"><small>DAILY PROFIT</small><strong className={state.dailyProfit < 0 ? "negative" : "positive"}>{state.dailyProfit < 0 ? <ArrowDownRight/> : <ArrowUpRight/>}{money(Math.abs(state.dailyProfit))}</strong><span>Fill rate: {demandFilled}%</span></div>
        </div></section>
        <section className="allocation-section"><div className="section-heading compact-heading"><ShoppingCart size={16}/><span>OUTPUT ALLOCATION</span></div><div className="allocation-options">{([ ["contracts_first", "CONTRACT FIRST"], ["market_first", "MARKET FIRST"], ["split", "SPLIT EQUALLY"] ] as [Allocation, string][]).map(([value, label]) => <Button key={value} variant={state.allocation === value ? "selectActive" : "select"} onClick={() => setState(prev => ({ ...prev, allocation: value }))}>{label}</Button>)}</div><div className="contract-line"><span>Wholesale contract</span><label className="switch"><input type="checkbox" checked={state.contractActive} onChange={e => setState(prev => ({ ...prev, contractActive: e.target.checked }))} aria-label="Enable wholesale contract"/><span/></label></div><p>25 muffins/day · ₹25 per muffin · ₹8 missed-unit penalty</p></section></div>
        <section className="history-section"><div className="section-heading compact-heading"><Activity size={16}/><span>PRODUCTION HISTORY</span><small>LAST 14 DAYS</small></div><div className="history-chart">{state.history.length ? state.history.map(row => <div className="history-column" key={row.day} title={`Day ${row.day}: ${row.produced} made · ${row.sold} sold · ${money(row.cash)} cash`}><div className="history-bars"><i style={{ height: `${Math.max(2, row.produced / 160 * 100)}%` }}/><i style={{ height: `${Math.max(2, row.sold / 160 * 100)}%` }}/></div><small>{row.day}</small></div>) : <div className="empty-chart">Advance a day to see production and sales history.</div>}</div><div className="chart-legend"><span><i/> Production</span><span><i/> Sales</span></div></section>
      </div>
    </div>
  </main>;
}