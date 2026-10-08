import { useRef, useState } from "react";
import { Upload, Sparkles, Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeFactoryImage } from "@/lib/factory-layout.functions";
import { STAGE_ORDER, type FactoryLayout } from "@/lib/factory-layout";
import type { FactoryLibrary, SavedFactory } from "@/lib/factory-library";

type Props = { library: FactoryLibrary; onChange: (library: FactoryLibrary) => void; selected: string[]; onSelect: (ids: string[]) => void };
export function FactoryLibraryControls({ library, onChange, selected, onSelect }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [detected, setDetected] = useState<FactoryLayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setMessage(""); setDetected(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000) { setMessage("Choose a PNG, JPG or WebP under 5 MB."); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image unavailable");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      setImage(canvas.toDataURL("image/jpeg", .85)); setName(file.name.replace(/\.[^.]+$/, ""));
    } catch { setMessage("This photo could not be opened."); }
  }
  async function detect() {
    if (!image || busy) return;
    setBusy(true); setMessage(""); setDetected(null);
    try { const result = await analyzeFactoryImage({ data: { image } }); setDetected(result.layout); setMessage(result.note); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Factory analysis failed."); }
    finally { setBusy(false); }
  }
  function save() {
    if (!detected || !image || !name.trim()) return;
    const factory: SavedFactory = { id: crypto.randomUUID(), name: name.trim(), layout: detected, background: image };
    onChange({ ...library, factories: [...library.factories, factory] }); onSelect([factory.id]); setMessage("Factory saved on this device.");
  }
  function remove(id: string) {
    const factories = library.factories.filter(f => f.id !== id);
    if (!factories.length) return;
    const defaultId = library.defaultId === id ? factories[0].id : library.defaultId;
    onChange({ factories, defaultId }); onSelect(selected.filter(s => s !== id).length ? selected.filter(s => s !== id) : [defaultId]);
  }
  return <section className="factory-library" aria-label="Factory configurations">
    <div className="library-heading"><h2>Factory configurations</h2><span>Saved on this device</span></div>
    <div className="library-toolbar">
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="Factory reference image" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/>
      <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}><Upload/>Upload reference</Button>
      <Button onClick={() => void detect()} disabled={!image || busy}><Sparkles/>{busy ? "Detecting…" : "Detect positions"}</Button>
      {detected && <><input className="library-name" aria-label="Factory name" value={name} onChange={e => setName(e.target.value)}/><Button variant="outline" onClick={save} disabled={!name.trim()}><Save/>Save factory</Button></>}
    </div>
    {image && <div className="reference-detection"><img src={image} alt="Factory reference"/>{detected && STAGE_ORDER.map(kind => <span key={kind} className="detection-pin" style={{ left: `${detected.machines[kind]}%` }}>{kind === "mixing" ? "Mixer" : kind === "baking" ? "Oven" : kind === "icing" ? "Icing" : "Packager"}<small>{detected.machines[kind]}%</small></span>)}</div>}
    {message && <p role="status" className="editor-message">{message}</p>}
    <div className="saved-factories">{library.factories.map(f => <div className="saved-factory" key={f.id}>
      <label><input type="checkbox" checked={selected.includes(f.id)} disabled={!selected.includes(f.id) && selected.length >= 3} onChange={e => onSelect(e.target.checked ? [...selected, f.id] : selected.length > 1 ? selected.filter(id => id !== f.id) : selected)}/><span>{f.name}</span></label>
      <Button variant={library.defaultId === f.id ? "secondary" : "ghost"} size="icon" title="Set as default" aria-label={`Set ${f.name} as default`} aria-pressed={library.defaultId === f.id} onClick={() => onChange({ ...library, defaultId: f.id })}><Star/></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${f.name}`} title="Delete factory" disabled={library.factories.length <= 1} onClick={() => remove(f.id)}><Trash2/></Button>
    </div>)}</div>
  </section>;
}