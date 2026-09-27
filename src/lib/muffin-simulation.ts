export type MachineKind = "mixing" | "baking" | "icing" | "packaging";
export type Allocation = "contracts_first" | "market_first" | "split";

export const MACHINE_CONFIG: Record<MachineKind, { label: string; capacity: number; buy: number; operating: number; repair: number }> = {
  mixing: { label: "Mixer", capacity: 100, buy: 2000, operating: 50, repair: 300 },
  baking: { label: "Oven", capacity: 80, buy: 3000, operating: 80, repair: 500 },
  icing: { label: "Icing", capacity: 120, buy: 1500, operating: 40, repair: 200 },
  packaging: { label: "Packer", capacity: 150, buy: 1000, operating: 30, repair: 150 },
};

export type MachineState = { owned: number; active: number; broken: number; repairDays: number; arriving: number };
export type Transit = { material: "mix" | "packaging"; quantity: number; arrivalDay: number };
export type DayRecord = { day: number; cash: number; demand: number; produced: number; sold: number };

export type SimulationState = {
  day: number;
  maxDays: number;
  cash: number;
  mix: number;
  packagingMaterial: number;
  finished: number;
  mixOrderQty: number;
  mixReorder: number;
  packOrderQty: number;
  packReorder: number;
  machines: Record<MachineKind, MachineState>;
  transits: Transit[];
  allocation: Allocation;
  demand: number;
  produced: number;
  sold: number;
  lostSales: number;
  revenue: number;
  dailyProfit: number;
  bottleneck: MachineKind;
  alert: string;
  contractActive: boolean;
  contractFulfilled: number;
  history: DayRecord[];
};

export const initialSimulation = (): SimulationState => ({
  day: 1,
  maxDays: 60,
  cash: 50_000,
  mix: 1000,
  packagingMaterial: 800,
  finished: 100,
  mixOrderQty: 1000,
  mixReorder: 300,
  packOrderQty: 800,
  packReorder: 250,
  machines: {
    mixing: { owned: 1, active: 1, broken: 0, repairDays: 0, arriving: 0 },
    baking: { owned: 1, active: 1, broken: 0, repairDays: 0, arriving: 0 },
    icing: { owned: 1, active: 1, broken: 0, repairDays: 0, arriving: 0 },
    packaging: { owned: 1, active: 1, broken: 0, repairDays: 0, arriving: 0 },
  },
  transits: [],
  allocation: "contracts_first",
  demand: 112,
  produced: 0,
  sold: 0,
  lostSales: 0,
  revenue: 0,
  dailyProfit: 0,
  bottleneck: "baking",
  alert: "Oven is limiting output to 80 muffins per day.",
  contractActive: true,
  contractFulfilled: 0,
  history: [],
});

const kinds: MachineKind[] = ["mixing", "baking", "icing", "packaging"];

export function operatingCapacity(state: SimulationState, kind: MachineKind) {
  const machine = state.machines[kind];
  return Math.max(0, machine.active - machine.broken) * MACHINE_CONFIG[kind].capacity;
}

export function advanceDay(current: SimulationState): SimulationState {
  if (current.day >= current.maxDays || current.cash <= 0) return current;
  const next: SimulationState = structuredClone(current);
  const day = current.day + 1;
  next.day = day;

  next.machines = { ...next.machines };
  for (const kind of kinds) {
    const machine = { ...next.machines[kind] };
    if (machine.broken > 0) {
      machine.repairDays -= 1;
      if (machine.repairDays <= 0) {
        machine.broken = 0;
        machine.repairDays = 0;
      }
    } else if (machine.active > 0 && Math.random() < ({ mixing: 0.02, baking: 0.02, icing: 0.015, packaging: 0.01 }[kind])) {
      machine.broken = 1;
      machine.repairDays = kind === "mixing" || kind === "baking" ? 2 : 1;
    }
    next.machines[kind] = machine;
  }

  const arriving = next.transits.filter((order) => order.arrivalDay <= day);
  for (const order of arriving) {
    if (order.material === "mix") next.mix += order.quantity;
    else next.packagingMaterial += order.quantity;
  }
  next.transits = next.transits.filter((order) => order.arrivalDay > day);

  const capacities = kinds.map((kind) => ({ kind, value: operatingCapacity(next, kind) }));
  const bottleneck = capacities.reduce((smallest, item) => item.value < smallest.value ? item : smallest);
  next.bottleneck = bottleneck.kind;
  const production = Math.max(0, Math.min(next.mix, next.packagingMaterial, bottleneck.value));
  next.mix -= production;
  next.packagingMaterial -= production;
  next.finished += production;
  next.produced = production;

  let orderCosts = 0;
  const mixTransit = next.transits.filter((o) => o.material === "mix").reduce((sum, o) => sum + o.quantity, 0);
  if (next.mix + mixTransit <= next.mixReorder && next.mixOrderQty > 0) {
    next.transits.push({ material: "mix", quantity: next.mixOrderQty, arrivalDay: day + 3 });
    orderCosts += next.mixOrderQty * 5 + 150;
  }
  const packTransit = next.transits.filter((o) => o.material === "packaging").reduce((sum, o) => sum + o.quantity, 0);
  if (next.packagingMaterial + packTransit <= next.packReorder && next.packOrderQty > 0) {
    next.transits.push({ material: "packaging", quantity: next.packOrderQty, arrivalDay: day + 3 });
    orderCosts += next.packOrderQty + 150;
  }

  const demand = Math.max(50, Math.round(105 + 28 * Math.sin((2 * Math.PI * day) / 14) + (Math.random() * 18 - 9)));
  next.demand = demand;
  const contractTarget = next.contractActive ? 25 : 0;
  let contractSales = 0;
  let marketSales = 0;
  let available = next.finished;

  if (next.allocation === "contracts_first") {
    contractSales = Math.min(available, contractTarget);
    available -= contractSales;
    marketSales = Math.min(available, demand);
  } else if (next.allocation === "market_first") {
    marketSales = Math.min(available, demand);
    available -= marketSales;
    contractSales = Math.min(available, contractTarget);
  } else {
    marketSales = Math.min(Math.floor(available / 2), demand);
    available -= marketSales;
    contractSales = Math.min(available, contractTarget);
    available -= contractSales;
    marketSales += Math.min(available, demand - marketSales);
  }

  const sold = marketSales + contractSales;
  next.finished -= sold;
  next.sold = sold;
  next.contractFulfilled = contractSales;
  next.lostSales = Math.max(0, demand - marketSales) + Math.max(0, contractTarget - contractSales);
  next.revenue = marketSales * 20 + contractSales * 25;
  const operatingCosts = kinds.reduce((sum, kind) => sum + next.machines[kind].active * MACHINE_CONFIG[kind].operating, 0);
  const repairCosts = kinds.reduce((sum, kind) => sum + (next.machines[kind].broken > current.machines[kind].broken ? MACHINE_CONFIG[kind].repair : 0), 0);
  const holding = (next.mix * 5 + next.packagingMaterial + next.finished * 6) * 0.02;
  const penalties = Math.max(0, demand - marketSales) * 2.5 + Math.max(0, contractTarget - contractSales) * 8;
  next.dailyProfit = Number((next.revenue - orderCosts - operatingCosts - repairCosts - holding - penalties).toFixed(2));
  next.cash = Math.max(0, Number((next.cash + next.dailyProfit).toFixed(2)));

  const broken = kinds.find((kind) => next.machines[kind].broken > 0);
  if (broken) next.alert = `${MACHINE_CONFIG[broken].label} is under repair for ${next.machines[broken].repairDays} more day(s).`;
  else if (production === 0) next.alert = next.mix <= 0 ? "Production starved: waiting for muffin mix." : next.packagingMaterial <= 0 ? "Production blocked: no packaging material." : "Production stopped: activate every stage.";
  else next.alert = `${MACHINE_CONFIG[next.bottleneck].label} is the bottleneck at ${bottleneck.value} units/day.`;

  next.history = [...next.history, { day, cash: next.cash, demand, produced: production, sold }].slice(-14);
  return next;
}