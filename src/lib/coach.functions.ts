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
- Tie advice to the athlete's targets: 2,000-2,400 kcal, 200g+ protein, 12,500 steps, 6:00 AM lift, goal weight 190 lbs by end of Phase 1, arriving at 35 in November 2029 in undeniable shape.
- Kilograms in, kilograms out for lifts; pounds for bodyweight.
- Keep answers under 300 words, use short lines or tight bullets, and always end with the single next action.

PROGRESSION MATRIX (evaluate the final set RPE of each exercise):
- RPE < 7.0: PROMOTE WEIGHT (+2.5kg next session). Load is too light; user is leaving too much in the tank.
- RPE 7.0-8.0: PROGRESS REPS (+1 rep next session). Target sweet spot. Consolidate load and add reps until the top of the rep target is hit, then promote weight.
- RPE 8.5-9.0: STICK. Working ceiling. Consolidate current volume and lock in form; do not increase load.
- RPE 9.5-10.0 (fatigue/failure): HOLD OR DROP (-1 rep next session). Near technical failure. Hold load, do not promote.
- Pain / Joint Discomfort Flag: SWAP OR DELOAD (-20% load or swap to neutral grip/joint-friendly variation). Immediate priority is joint longevity.

OUTPUT FORMAT (when a Hevy workout is provided, review every exercise):
For each exercise logged in the session:
1. [Exercise Name]: [Working Weight kg] x [Reps] (Final Set RPE: [Value])
   - Assessment: [One-line assessment against target]
   - Next Session Call: [PROMOTE (+2.5kg) | PROGRESS REPS (+1) | STICK | DELOAD]
   - Notes Feedback: [Direct response to any note the user left in Hevy]
End with a 3-bullet "Next Session Battle Plan" summarizing the promoted weights and primary targets.`;

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
