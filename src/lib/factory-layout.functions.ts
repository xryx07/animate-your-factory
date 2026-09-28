import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_LAYOUT, sanitizeLayout, type FactoryLayout } from "@/lib/factory-layout";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const INSTRUCTIONS = `You analyse a reference image of a 2D muffin-factory production line and return its layout as coordinates.

Coordinates are percentages of the image: x = 0 at the left edge, 100 at the right edge. beltY = 0 at the bottom edge, 100 at the top edge.

Identify, from left to right, four machines: the dough mixer, the baking oven, the icing/frosting station, and the packaging machine. Give the horizontal centre of each one.
Also give:
- beltY: the height of the conveyor belt surface where products sit, measured from the bottom.
- intakeX: where finished product first appears on the belt (just after the mixer).
- dispatchX: where product leaves the image on the right.
- labelY: a clear empty band near the top where machine labels can be drawn, measured from the top.
- productScale: 1 if muffins should be drawn at normal size, smaller (0.6) for a wide/zoomed-out scene, larger (1.4) for a close-up scene.
- minGap: the horizontal gap to keep between two muffins on the belt, big enough that they never touch or overlap the machines. Usually 6 to 12.
- notes: one short sentence describing the scene.

Rules: the four machine values must be strictly increasing and at least 9 apart. Keep every x between 4 and 96. If the image does not show a clear production line, return your best sensible left-to-right arrangement anyway.

Reply with JSON only, no prose and no code fences, in exactly this shape:
{"mixing":number,"baking":number,"icing":number,"packaging":number,"beltY":number,"intakeX":number,"dispatchX":number,"labelY":number,"productScale":number,"minGap":number,"notes":string}`;

export type LayoutAnalysis = { layout: FactoryLayout; notes: string };

type RawLayout = Record<string, unknown>;

function extractJson(text: string): RawLayout | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as RawLayout;
  } catch {
    return null;
  }
}

function toLayout(raw: RawLayout): FactoryLayout {
  const num = (key: string, fallback: number) => {
    const value = Number(raw[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  return sanitizeLayout({
    machines: {
      mixing: num("mixing", DEFAULT_LAYOUT.machines.mixing),
      baking: num("baking", DEFAULT_LAYOUT.machines.baking),
      icing: num("icing", DEFAULT_LAYOUT.machines.icing),
      packaging: num("packaging", DEFAULT_LAYOUT.machines.packaging),
    },
    beltY: num("beltY", DEFAULT_LAYOUT.beltY),
    intakeX: num("intakeX", DEFAULT_LAYOUT.intakeX),
    dispatchX: num("dispatchX", DEFAULT_LAYOUT.dispatchX),
    labelY: num("labelY", DEFAULT_LAYOUT.labelY),
    productScale: num("productScale", DEFAULT_LAYOUT.productScale),
    minGap: num("minGap", DEFAULT_LAYOUT.minGap),
    speedScale: DEFAULT_LAYOUT.speedScale,
  });
}

/** Reads the streamed Responses SSE body and returns the accumulated output text. */
async function readResponseText(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
          else if (event.type === "response.output_text.done" && typeof event.text === "string" && !text) text = event.text;
        } catch {
          /* partial or non-JSON frame */
        }
      }
    }
  }
  return text;
}

export const analyzeFactoryImage = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) => {
    const value = input?.imageDataUrl;
    if (typeof value !== "string" || !value.startsWith("data:image/")) throw new Error("Please upload an image file.");
    if (value.length > 8_000_000) throw new Error("That image is too large — please use one under 5 MB.");
    return { imageDataUrl: value };
  })
  .handler(async ({ data }): Promise<LayoutAnalysis> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The image assistant is not configured yet.");

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: [{ type: "input_text", text: INSTRUCTIONS }] },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Read this factory reference image and return the layout JSON." },
              { type: "input_image", image_url: data.imageDataUrl },
            ],
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) throw new Error("The image assistant is busy right now. Please try again in a moment.");
      if (response.status === 402) throw new Error("This workspace is out of AI credits, so the image can't be analysed.");
      if (response.status === 403) throw new Error("The image assistant isn't available for this workspace.");
      throw new Error(detail.slice(0, 200) || "The image could not be analysed.");
    }

    const text = await readResponseText(response.body);
    const raw = extractJson(text);
    if (!raw) throw new Error("The assistant couldn't read a layout from that image. Try a clearer side-on picture.");

    const notes = typeof raw["notes"] === "string" ? (raw["notes"] as string).slice(0, 160) : "";
    return { layout: toLayout(raw), notes };
  });

export { RUN_ID_HEADER };
