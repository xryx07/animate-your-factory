# Existing Muffin Factory Game integration

Target: https://github.com/111shivamrai/muffin-factory-game

`LiveFactoryVisualization` subscribes directly to that game's Zustand store. It uses the existing authenticated socket; it does not request credentials, connect another socket, run a simulation, or mutate game state.

In the host game's production view, import its existing `useGameStore` and the visual package, then render:

```tsx
<LiveFactoryVisualization store={useGameStore} layout={savedFactory.layout} background={savedFactory.background} />
```

Include `LiveFactoryVisualization`, `FactoryVisualization`, their browser-safe `src/lib` dependencies, sprite images and the factory styles in the host source. Resolve the `@/` aliases to the host's import convention. Do not copy the preview page, AI server functions, authentication files or simulation interval into the host. Reference analysis remains in this TanStack application; use saved layout/background data in the host visual.

The adapter maps `room.currentDay`, `room.status`, `room.tickRate` (seconds per simulation day), machine count/active/inTransit, `breakdownStates[].brokenCount/daysRemaining`, inventory and deliveries. Recovery always waits for the host's state update. Countdown interpolation freezes on pause; exact sub-day server timing is not available from the current host store, so the displayed countdown is interpolated from received ticks, not an authoritative server deadline.

This checkout cannot change or deploy the separate GitHub/Vercel game. The wrapper is ready for installation there, but the actual external live connection is not installed or verified yet.