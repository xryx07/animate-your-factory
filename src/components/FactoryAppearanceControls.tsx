import { ImagePlus, RotateCcw, SlidersHorizontal, Sun, Thermometer, Snowflake } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_APPEARANCE, type FactoryAppearance } from "@/lib/factory-appearance";

export function FactoryAppearanceControls({ value, onChange }: { value: FactoryAppearance; onChange: (value: FactoryAppearance) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a PNG, JPG or WebP under 5 MB."); return;
    }
    setBusy(true);
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / image.width, 1200 / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image unavailable");
      context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
      onChange({ ...value, background: canvas.toDataURL("image/jpeg", .86) });
    } catch { setError("This image could not be opened. Choose another photo."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <section className="appearance-controls" aria-label="Factory appearance">
    <Button variant="outline" size="sm" aria-expanded={open} aria-controls="factory-appearance-options" onClick={() => setOpen(!open)}><SlidersHorizontal/>Appearance</Button>
    {open && <div id="factory-appearance-options" className="appearance-options">
      <div className="appearance-group"><span>Background</span><div className="appearance-background">
        <img src={value.background || DEFAULT_FLOOR} alt="Current factory background"/>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><ImagePlus/>{busy ? "Opening…" : "Factory photo"}</Button>
        {value.background && <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, background: null })}>Original</Button>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Factory background photo" onChange={event => void upload(event.target.files?.[0])}/>
      </div></div>
      <div className="appearance-group"><span>Lighting</span><div className="appearance-segments" role="group" aria-label="Lighting">
        {([{ key: "neutral", label: "Daylight", icon: Sun }, { key: "warm", label: "Warm", icon: Thermometer }, { key: "cool", label: "Cool", icon: Snowflake }] as const).map(option => <Button key={option.key} size="sm" variant={value.lighting === option.key ? "secondary" : "ghost"} aria-pressed={value.lighting === option.key} onClick={() => onChange({ ...value, lighting: option.key })}><option.icon/>{option.label}</Button>)}
      </div></div>
      <div className="appearance-group"><span>Style</span><div className="appearance-segments" role="group" aria-label="Visual style">
        {([{ key: "original", label: "Original" }, { key: "industrial", label: "Industrial" }, { key: "soft", label: "Soft" }] as const).map(option => <Button key={option.key} size="sm" variant={value.style === option.key ? "secondary" : "ghost"} aria-pressed={value.style === option.key} onClick={() => onChange({ ...value, style: option.key })}>{option.label}</Button>)}
      </div></div>
      <label className="appearance-group appearance-brightness"><span>Brightness <output>{value.brightness}%</output></span><input aria-label="Brightness" type="range" min={70} max={130} value={value.brightness} onChange={event => onChange({ ...value, brightness: Number(event.target.value) })}/></label>
      <Button variant="ghost" size="icon" aria-label="Reset appearance" title="Reset appearance" onClick={() => { onChange(DEFAULT_APPEARANCE); setError(""); }}><RotateCcw/></Button>
      {error && <p role="alert" className="appearance-error">{error}</p>}
    </div>}
  </section>;
}
import DEFAULT_FLOOR from "@/assets/factory-line.jpg";