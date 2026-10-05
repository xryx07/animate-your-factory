<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the factory illustration in `FactoryVisualization` as a state-fed component; the preview route supplies local simulation data, so the scene can be integrated without importing page controls.
- Use the shared muffin simulation model for the preview's day transitions; this keeps machine capacities, stock, deliveries, and displayed throughput coherent.
- Render products from a shared clock and a piecewise transfer/dwell schedule; reserve processing duration plus safe travel distance between arrivals to prevent overlap while machines process sequentially.
- Keep the image-analysis editor separate from the state-fed factory illustration; this lets the host game embed the scene without editor or preview controls.
- Derive displayed machine health from the active fleet's working-unit ratio and repair progress from remaining repair days; this avoids inventing wear or changing the host game's failure rules.
