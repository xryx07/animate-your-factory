import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./gateway-run-id.server";

const prompt = `Study the supplied factory-floor reference image. Return ONLY a JSON object with keys "layout" and "note". layout has machines {mixing,baking,icing,packaging}, beltY, intakeX, dispatchX, productScale, minGap, speedScale, labelY. All coordinates are percentages of the full image; x is from left, y is from bottom for beltY and from top for labelY. Identify four machine centers in production order; if not visible, estimate from the closest production units. Put beltY at the top surface of the front conveyor, where muffins should sit, NOT near the bottom floor. intakeX starts immediately after mixer, dispatchX is near right image edge. Keep products visually small and spaced (minGap >= 7). Avoid collision with machines and labels; animation transforms baked to iced at icing and iced to boxed at packaging. Valid ranges: machine x 4-96, beltY 10-55, intakeX 0-80, dispatchX 60-100, productScale 0.4-2.2, minGap 4-25, speedScale 0.25-3, labelY 1-40. note: one short sentence about detected placement. Output no markdown and no commentary.`;

function safeError(error: unknown) {
  const failure = error as { statusCode?: number; status?: number; responseBody?: string; message?: string };
  let message = failure.message ?? "Factory image analysis failed.";
  try {
    const body = JSON.parse(failure.responseBody ?? "{}");
    message = body.error?.message ?? body.message ?? message;
  } catch { /* preserve the available message */ }
  const status = failure.statusCode ?? failure.status;
  if (status === 401) return new Error("AI analysis is not configured yet.");
  if (status === 402) return new Error(message);
  if (status === 403 || status === 404 || status === 400 || status === 429 || (status && status >= 500)) return new Error(message);
  return new Error(message);
}

export async function analyzeFactoryReference(image: string, key: string) {
  const run = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: run.fetch,
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image", image: new URL(image) }] }],
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      maxRetries: 0,
    });
    const text = await result.text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return a layout. Try a clearer factory image.");
    const parsed = JSON.parse(match[0]) as { layout?: unknown; note?: unknown };
    if (!parsed.layout || typeof parsed.layout !== "object") throw new Error("AI did not return a layout. Try a clearer factory image.");
    return { layout: parsed.layout, note: typeof parsed.note === "string" ? parsed.note.slice(0, 240) : "Layout ready to edit." };
  } catch (error) { throw safeError(error); }
}