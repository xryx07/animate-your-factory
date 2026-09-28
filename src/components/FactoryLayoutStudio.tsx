import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { analyzeFactoryImage } from "@/lib/factory-layout.functions";
import {
  DEFAULT_LAYOUT,
  STAGE_ORDER,
  clearStoredLayout,
  sanitizeLayout,
  saveStoredLayout,
  type FactoryLayout,
} from "@/lib/factory-layout";
import type { MachineKind } from "@/lib/muffin-simulation";

const machineLabels: Record<MachineKind, string> = {
  mixing: "Mixer",
  baking: "Oven",
  icing: "Icing station",
  packaging: "Packing machine",
};

const MAX_BYTES = 5 * 1024 * 1024;

export type FactoryLayoutStudioProps = {
  layout: FactoryLayout;
  background: string | null;
  onChange: (layout: FactoryLayout) => void;
  onBackgroundChange: (background: string | null) => void;
};

export function FactoryLayoutStudio({ layout, background, onChange, onBackgroundChange }: FactoryLayoutStudioProps) {
  const analyze = useServerFn(analyzeFactoryImage);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<FactoryLayout>) => {
    setSaved(false);
    onChange(sanitizeLayout({ ...layout, ...patch }));
  };

  const setMachine = (kind: MachineKind, value: number) =>
    update({ machines: { ...layout.machines, [kind]: value } });

  async function handleFile(file: File) {
    setError(null);
    setNotes(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > MAX_BYTES) return setError("That picture is larger than 5 MB — please pick a smaller one.");

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The picture could not be read."));
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) return setError("The picture could not be read.");

    onBackgroundChange(dataUrl);
    setSaved(false);
    setBusy(true);
    try {
      const result = await analyze({ data: { imageDataUrl: dataUrl } });
      onChange(result.layout);
      setNotes(result.notes || "Layout detected from your picture.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The picture could not be analysed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="layout-studio" aria-label="Factory layout settings">
      <header className="studio-head">
        <div>
          <h2>Factory layout</h2>
          <p>Upload a reference picture and let the assistant place the machines, then fine-tune anything by hand.</p>
        </div>
        <div className="studio-head-actions">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <Button variant="default" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? <Loader2 className="spin" size={15} /> : <ImageUp size={15} />}
            {busy ? "Reading picture…" : "Upload reference"}
          </Button>
          {background && (
            <Button variant="outline" disabled={busy} onClick={() => { onBackgroundChange(null); setNotes(null); }}>
              <Trash2 size={15} />Use default scene
            </Button>
          )}
        </div>
      </header>

      {error && <p className="studio-error" role="alert">{error}</p>}
      {notes && !error && <p className="studio-note"><Sparkles size={14} />{notes}</p>}

      <div className="studio-grid">
        {STAGE_ORDER.map(kind => (
          <label className="studio-field" key={kind}>
            <span>{machineLabels[kind]} position<b>{layout.machines[kind].toFixed(0)}%</b></span>
            <Slider
              value={[layout.machines[kind]]}
              min={4}
              max={96}
              step={0.5}
              onValueChange={([value]) => setMachine(kind, value ?? layout.machines[kind])}
            />
          </label>
        ))}
        <label className="studio-field">
          <span>Conveyor height<b>{layout.beltY.toFixed(0)}%</b></span>
          <Slider value={[layout.beltY]} min={2} max={70} step={1} onValueChange={([value]) => update({ beltY: value })} />
        </label>
        <label className="studio-field">
          <span>Label height<b>{layout.labelY.toFixed(0)}%</b></span>
          <Slider value={[layout.labelY]} min={1} max={60} step={1} onValueChange={([value]) => update({ labelY: value })} />
        </label>
        <label className="studio-field">
          <span>Muffins enter at<b>{layout.intakeX.toFixed(0)}%</b></span>
          <Slider value={[layout.intakeX]} min={0} max={90} step={1} onValueChange={([value]) => update({ intakeX: value })} />
        </label>
        <label className="studio-field">
          <span>Muffins leave at<b>{layout.dispatchX.toFixed(0)}%</b></span>
          <Slider value={[layout.dispatchX]} min={20} max={100} step={1} onValueChange={([value]) => update({ dispatchX: value })} />
        </label>
        <label className="studio-field">
          <span>Spacing between muffins<b>{layout.minGap.toFixed(0)}%</b></span>
          <Slider value={[layout.minGap]} min={4} max={25} step={1} onValueChange={([value]) => update({ minGap: value })} />
        </label>
        <label className="studio-field">
          <span>Muffin size<b>{layout.productScale.toFixed(2)}×</b></span>
          <Slider value={[layout.productScale]} min={0.4} max={2.2} step={0.05} onValueChange={([value]) => update({ productScale: value })} />
        </label>
        <label className="studio-field">
          <span>Belt speed<b>{layout.speedScale.toFixed(2)}×</b></span>
          <Slider value={[layout.speedScale]} min={0.25} max={3} step={0.05} onValueChange={([value]) => update({ speedScale: value })} />
        </label>
      </div>

      <footer className="studio-foot">
        <Button
          variant="outline"
          onClick={() => { onChange(DEFAULT_LAYOUT); onBackgroundChange(null); clearStoredLayout(); setSaved(false); setNotes(null); setError(null); }}
        >
          <RotateCcw size={15} />Reset
        </Button>
        <Button
          variant="default"
          onClick={() => { saveStoredLayout({ layout, background }); setSaved(true); }}
        >
          <Save size={15} />{saved ? "Saved" : "Save layout"}
        </Button>
      </footer>
    </section>
  );
}
