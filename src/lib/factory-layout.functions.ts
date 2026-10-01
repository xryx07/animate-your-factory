import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sanitizeLayout } from "./factory-layout";

const inputSchema = z.object({ image: z.string().max(7_500_000) });
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export const analyzeFactoryImage = createServerFn({ method: "POST" })
  .inputValidator((value) => inputSchema.parse(value))
  .handler(async ({ data }) => {
    const match = IMAGE_PATTERN.exec(data.image);
    const encoded = match?.[2];
    if (!encoded || encoded.length > 7_000_000 || encoded.length < 64) {
      throw new Error("Upload a PNG, JPG or WebP image under 5 MB.");
    }
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI analysis is not configured yet.");
    const { analyzeFactoryReference } = await import("./factory-layout.server");
    const result = await analyzeFactoryReference(data.image, key);
    return { layout: sanitizeLayout(result.layout), note: result.note };
  });