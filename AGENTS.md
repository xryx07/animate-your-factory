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
