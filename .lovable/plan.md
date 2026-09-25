# Functional Muffin Factory Simulator

## Goal
Replace the blank page with a playable, SodaPop-style muffin factory simulator. The factory visual will be a real state-driven production line—not a video—and every visible change will follow the formulas and concepts from the referenced repository.

## Experience
- Build a compact operations dashboard matching the supplied pink/green control-room screenshots.
- Make the factory the main focus: raw-material dock → mixer → oven → icing → packaging → finished-goods warehouse → market/contracts.
- Show muffins and materials physically moving between stages while the simulation runs.
- Make each machine visibly switch between running, idle, starved, blocked, and broken states.
- Show buffers, live throughput, bottleneck highlighting, delivery trucks, order arrivals, demand, cash, and day progress directly around the line.
- Keep inventory and machine controls alongside the visual, with clear warnings and readable mobile behavior.

## Simulation Rules
- Recreate the repository’s core daily model in the browser for the playable demo:
  - Mixer 100/day, oven 80/day, icing 120/day, packaging 150/day per active machine.
  - Production is limited by raw mix, packaging stock, and the lowest operating machine capacity.
  - One finished muffin consumes one mix unit and one packaging unit.
  - Automatic purchase orders trigger when inventory position reaches the reorder point and arrive after lead time.
  - Machine operating costs, holding cost, ordering cost, lost-sale penalties, revenue, and cash update each day.
  - Machine breakdowns visibly stop the affected station and show repair time.
  - Finished output follows the selected contract-first, market-first, or split allocation strategy.
- Provide pause/play, next-day, speed, reset, order settings, machine activation, and machine purchase controls.

## Visual Behavior
- Use layered HTML/CSS illustration and small vector-like shapes so the scene remains crisp and fully controllable.
- Animate belts, mixer rotation, oven glow, icing dispenser, packer press, trucks, and muffin movement only when their corresponding state permits it.
- Scale animation speed from actual line throughput and simulation speed—not inventory alone.
- Visually distinguish bottlenecks, starved stages, breakdowns, and stopped machines without obscuring the factory.
- Respect reduced-motion settings while preserving clear state changes.

## Verification
- Check the complete day cycle: materials consumed, production constrained, finished goods sold, cash updated, and orders delivered.
- Verify pause, speed, machine toggles, purchases, reorder settings, allocation strategies, breakdown/repair, and reset.
- Inspect desktop and mobile screenshots for clipping, overlap, legibility, and correct animation/state indicators.
- Confirm the preview builds cleanly and includes app-specific page metadata.

## Scope Note
This build recreates the simulator as a self-contained playable demo in the current project. It will not copy the referenced repository’s separate login, instructor, multiplayer, or hosted-server system.
