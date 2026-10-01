import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, RotateCcw, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeFactoryImage } from "@/lib/factory-layout.functions";
import { DEFAULT_LAYOUT, sanitizeLayout, STAGE_ORDER, type FactoryLayout } from "@/lib/factory-layout";

type Props = {
  layout: FactoryLayout;
  onChange: (layout: FactoryLayout) => void;
};

const label: Record<string, string> = { mixing: "Mixer", baking: "Oven", icing: "Icing", packaging: "Packer", beltY: "Belt height", intakeX: "Muffins enter", dispatchX: "Muffins exit", productScale: "Muffin size", minGap: "Minimum gap", speedScale: "Belt speed", labelY: "Label height" };
const ranges: Record<string, [number, number, number]> = { mixing: [5, 68, 1], baking: [14, 77, 1], icing: [23, 86, 1], packaging: [32, 96, 1], beltY: [10, 55, 1], intakeX: [0, 75, 1], dispatchX: [60, 100, 1], productScale: [0.75, 2.2, 0.05], minGap: [4, 25, 0.5], speedScale: [0.25, 3, 0.05], labelY: [1, 40, 1] };

export function FactoryLayoutEditor({ layout, onChange }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000) {
      setMessage("Choose a PNG, JPG or WebP image under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value === "string") { setImage(value); setFileName(file.name); setMessage(""); }
    };
    reader.onerror = () => setMessage("This image could not be opened.");
    reader.readAsDataURL(file);
  }

  async function detect() {
    if (!image || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await analyzeFactoryImage({ data: { image } });
      onChange(sanitizeLayout(result.layout));
      // A crop may describe only the conveyor; use it for coordinates without
      // stretching it into a full factory backdrop.
      setMessage(result.note || "Layout generated. Adjust the positions below.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image analysis failed.");
    } finally { setBusy(false); }
  }

  function update(field: string, value: number) {
    if (STAGE_ORDER.some(kind => kind === field)) {
      onChange(sanitizeLayout({ ...layout, machines: { ...layout.machines, [field]: value } }));
    } else onChange(sanitizeLayout({ ...layout, [field]: value }));
  }

  const fields = [...STAGE_ORDER, "beltY", "intakeX", "dispatchX", "productScale", "minGap", "speedScale", "labelY"];
  return <section className="layout-editor" aria-label="Factory layout editor">
    <div className="editor-heading"><div><span className="editor-kicker">FACTORY VISUAL</span><h2>Layout editor</h2></div><Button variant="ghost" size="sm" onClick={() => { onChange(DEFAULT_LAYOUT); setImage(null); setFileName(""); setMessage("Default layout restored."); }}><RotateCcw size={14}/> Reset</Button></div>
    <div className="editor-import">
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Factory reference image" onChange={handleFile}/>
      <Button variant="outline" onClick={() => picker.current?.click()}><Upload size={15}/> {fileName ? "Change image" : "Upload reference"}</Button>
      <span className="editor-filename">{fileName || "PNG, JPG or WebP · up to 5 MB"}</span>
      <Button disabled={!image || busy} onClick={detect}><Sparkles size={15}/>{busy ? "Analyzing…" : "Generate layout"}</Button>
    </div>
    {image && <div className="editor-reference"><ImagePlus size={14}/><span>{fileName}</span><span>Ready for analysis</span></div>}
    {message && <p className="editor-message" role="status">{message}</p>}
    <div className="editor-fields">
      {fields.map(field => {
        const value = STAGE_ORDER.some(kind => kind === field) ? layout.machines[field as keyof FactoryLayout["machines"]] : layout[field as keyof Omit<FactoryLayout, "machines">];
        const [min, max, step] = ranges[field];
        return <label className="editor-field" key={field}><span>{label[field]} <output>{typeof value === "number" ? (step < 1 ? value.toFixed(step < .1 ? 2 : 1) : value.toFixed(0)) : value}{field === "productScale" || field === "speedScale" ? "×" : "%"}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={event => update(field, Number(event.target.value))}/></label>;
      })}
    </div>
  </section>;
}