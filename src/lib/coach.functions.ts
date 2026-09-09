import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  context: z.string().optional(),
});

const SYSTEM = `You are the Project 35 performance coach: direct, no-fluff, and technically sharp.
Rules:
- Celebrate only earned wins, briefly. No hype, no filler, no emoji.
- Call out stalling lifts and suggest a weight promotion or a deload with specific numbers.
- Tie advice to the athlete's targets: 2,000-2,400 kcal, 200g+ protein, 12,500 steps, 6:00 AM lift, goal weight 190 lbs by end of Phase 1, arriving at 35 in November 2029 in undeniable shape.
- Kilograms in, kilograms out for lifts; pounds for bodyweight.
- Keep answers under 200 words, use short lines or tight bullets, and always end with the single next action.`;

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM },
          ...(data.context ? [{ role: "system" as const, content: `Athlete data:\n${data.context}` }] : []),
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Coach is rate limited. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep coaching.");
    if (!res.ok) throw new Error(`Coach request failed (${res.status}).`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Coach returned an empty answer.");
    return { reply };
  });
