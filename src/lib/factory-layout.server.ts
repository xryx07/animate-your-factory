import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./gateway-run-id.server";

const prompt = `Identify the mixer, oven, icing machine and packager on this complete factory reference. Return their actual horizontal centers as percentages from the left. The conveyor beltY is its top surface measured from the bottom. intakeX must be BEFORE the mixer, dispatchX after the packager. Set automatic safe flow: minGap at least 7%, small products (productScale .75-1), speedScale 1. labelY measured from the top. Require at least 9% horizontal spacing in mixer->oven->icing->packaging order. If these four machines or a horizontal conveyor cannot be confidently identified, return valid=false and explain briefly; do NOT invent missing positions. Otherwise valid=true. Coordinates machine x 4-96, beltY 10-55, labelY 1-40. note under 160 characters. No extra text.`;
const schema = z.object({ valid: z.boolean(), note: z.string(), layout: z.object({ machines: z.object({ mixing: z.number(), baking: z.number(), icing: z.number(), packaging: z.number() }).strict(), beltY: z.number(), intakeX: z.number(), dispatchX: z.number(), productScale: z.number(), minGap: z.number(), speedScale: z.number(), labelY: z.number() }).strict() }).strict();

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
      output: Output.object({ schema }),
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image", image: new URL(image) }] }],
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      maxRetries: 0,
    });
    const parsed = await result.output;
    if (!parsed.valid) throw new Error(parsed.note || "Four machines and a conveyor could not be identified.");
    return { layout: parsed.layout, note: parsed.note.slice(0, 240) };
  } catch (error) { throw safeError(error); }
}