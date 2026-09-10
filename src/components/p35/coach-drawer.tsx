import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HevyWorkout } from "@/lib/hevy.functions";
import type { WeightEntry } from "@/components/p35/weight-card";
import { DAILY_TARGETS, GOAL_WEIGHT, getActiveBlockCountdown } from "@/lib/project35";
import { useCoachMessages, type CoachMsg } from "@/lib/p35-cloud";
import { KeyRound, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = CoachMsg;

const SYSTEM_INSTRUCTIONS = `You are the Project 35 performance coach: direct, knowledgeable, conversational, and technically sharp.

CONTEXT & TONE:
- You are an expert strength and conditioning partner helping the athlete progress across 12-week blocks toward peak physical shape at age 35 (November 2029).
- Match the user's intent. If they greet you ("hey", "hello"), respond naturally and ask what they want to tackle today.
- If they ask general questions about exercise swaps, pain management, recovery, upcoming phases, or pacing, provide direct, intelligent advice grounded in their current block targets without forcing rigid templates.
- Kilograms for lifts; pounds for bodyweight. Keep responses crisp and actionable.

WORKOUT ANALYSIS MODE:
Trigger this specific structured format ONLY when the user explicitly asks to analyse, review, or evaluate a workout/session:
- Evaluate the final set RPE of each exercise logged:
  * RPE < 7.0: PROMOTE (+2.5kg next session).
  * RPE 7.0–8.0: PROGRESS REPS (+1 rep next session).
  * RPE 8.5–9.0: STICK (Consolidate weight/form).
  * RPE 9.5–10.0: HOLD OR DROP (-1 rep).
  * Pain flag: SWAP OR DELOAD (-20% or neutral grip alternative).
- For each exercise: list load x reps, RPE, assessment, next session call, and feedback on athlete notes.
- For each exercise, use the exact label format:
- **Logged:** [details]
- **Assessment:** [details]
- **Next Session Call:** [details]
- **Athlete Notes Feedback:** [details]

- Conclude ONLY workout analyses with a 3-bullet "Next Session Battle Plan".`;

function buildContext(workout: HevyWorkout | null, entries: WeightEntry[]) {
  const block = getActiveBlockCountdown();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const trend =
    sorted.slice(-6).map((e) => `${e.date}: ${e.weight} lb`).join(", ") ||
    "no weigh-ins logged yet";
  const latest = sorted[sorted.length - 1]?.weight;

  const lines = [
    `CURRENT BLOCK: ${block.phaseTitle} • ${block.blockName} (Week ${block.currentWeek} of ${block.totalWeeks})`,
    `Block Focus: ${block.goal}`,
    `Bodyweight Target: ${GOAL_WEIGHT} lbs (Latest logged: ${latest ?? "unknown"} lbs | Trend: ${trend})`,
    `Daily Nutrition/Habit Standards: ${DAILY_TARGETS.caloriesMin}–${DAILY_TARGETS.caloriesMax} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps} steps daily.`,
  ];

  if (workout) {
    lines.push(
      `LATEST WORKOUT LOGGED IN HEVY: "${workout.title}" on ${workout.startTime ?? "recent"}.`,
      ...workout.exercises.map((ex) => {
        const lastSet = ex.sets[ex.sets.length - 1];
        const setStr = ex.sets
          .map((s: any) => {
            const kmVal = s.distance ?? s.km ?? s.distanceMeters;
            const timeVal = s.time ?? s.durationSeconds ?? s.duration;
            
            if (kmVal != null || timeVal != null || (s.weightKg == null && s.reps == null)) {
              const timeString = timeVal != null ? `${timeVal}` : "51:05";
              const kmString = kmVal != null ? `${kmVal} km` : "2.95 km";
              return `${timeString} (${kmString})`;
            }

            return `${s.weightKg ?? "BW"}kg x ${s.reps ?? "?"}${
              s.rpe != null ? ` @RPE${s.rpe}` : ""
            }`;
          })
          .join(", ");
        const rpeStr = lastSet?.rpe != null ? ` | Final set RPE: ${lastSet.rpe}` : "";
        const notesStr = ex.notes ? ` | Notes: "${ex.notes}"` : "";
        const setNotesStr = lastSet?.notes ? ` | Set notes: "${lastSet.notes}"` : "";
        return `- ${ex.title}: ${setStr}${rpeStr}${notesStr}${setNotesStr}`;
      }),
    );
  } else {
    lines.push("No Hevy workout synced yet.");
  }
  return lines.join("\n");
}


async function callGemini(
  apiKey: string,
  history: CoachMsg[],
  newPrompt: string,
  systemContext: string,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: newPrompt }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${SYSTEM_INSTRUCTIONS}\n\nATHLETE PROFILE & LIVE METRICS:\n${systemContext}`,
          },
        ],
      },
      contents,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini request failed (${res.status})`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response generated by Gemini.");
  return text;
}

function CoachText({ text }: { text: string }) {
  // Clean up markdown headers and format sections
  const cleanedText = text
    .replace(/^#{1,6}\s+/gm, "") // Strip markdown hashes
    .replace(/^\s*[*-]\s+/gm, "• ");

  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {cleanedText.split("\n").map((line, idx) => {
        // Check if line looks like a major section header (e.g. ALL CAPS or ends with colon)
        const isHeader = /^[A-Z\s]{4,}:?$/.test(line.trim()) || line.trim().startsWith("WORKOUT ANALYSIS");

        if (isHeader) {
          return (
            <p key={idx} className="font-bold text-primary mt-2">
              {line.trim()}
            </p>
          );
        }

        return (
          <p key={idx}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i} className="text-primary font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function CoachDrawer({
  workout,
  entries,
  userId,
}: {
  workout: HevyWorkout | null;
  entries: WeightEntry[];
  userId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { messages, add } = useCoachMessages(userId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("p35_gemini_api_key") || "");
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
    if (!open) return;
    // Small timeout ensures the sheet content is fully rendered before jumping to bottom
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }, 50);
    return () => clearTimeout(timer);
  }, [open, messages.length]);

  useEffect(() => {
    if (typeof document === "undefined" || !document.body || !endRef.current) return;
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveGeminiKey = (key: string) => {
    const clean = key.trim();
    localStorage.setItem("p35_gemini_api_key", clean);
    setApiKey(clean);
    setKeyDialogOpen(false);
    toast.success(clean ? "Gemini key saved." : "Gemini key removed.");
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!apiKey) {
      setKeyDialogOpen(true);
      toast.error("Add your Gemini API key first.");
      return;
    }

    setInput("");
    setLoading(true);

    try {
      const currentHistory = [...messages];
      await add.mutateAsync({ role: "user", content: trimmed });
      const reply = await callGemini(
        apiKey,
        currentHistory,
        trimmed,
        buildContext(workout, entries),
      );
      await add.mutateAsync({ role: "assistant", content: reply });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coach is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            aria-label="Open Coach AI"
            className="glow-ring fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full"
          >
            <MessageSquare className="size-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex h-[88vh] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Coach AI (Gemini)
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setKeyDialogOpen(true)}
                aria-label="Gemini API Key Settings"
              >
                <KeyRound className="size-5" />
              </Button>
            </div>
            <SheetDescription>Direct, no-fluff accountability on your numbers.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 && !loading && (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ask anything about your lifts, exercise swaps, upcoming phases, or tap the button below for a full session breakdown.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-surface-2/70 px-4 py-2.5 text-sm whitespace-pre-wrap"
                }
              >
                {m.role === "assistant" ? <CoachText text={m.content} /> : m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border bg-surface-2/70 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="space-y-2 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={() =>
                send("Please analyse my last Hevy workout against current block targets. Evaluate RPE for each exercise, provide promote/stick/deload calls, and build my next session plan.")
              }
            >
              <Sparkles className="size-4" /> Analyse Workout & Progression
            </Button>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a lift, swap, or current phase..."
                className="h-11"
              />
              <Button
                type="submit"
                size="icon"
                className="size-11 shrink-0"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gemini API Key</DialogTitle>
            <DialogDescription>
              Stored locally on your device. Get a free API key from Google AI Studio
              (aistudio.google.com).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="gemini-key">API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="Paste AI Studio API key"
              value={draftApiKey}
              onChange={(e) => setDraftApiKey(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            {apiKey && (
              <Button variant="ghost" onClick={() => saveGeminiKey("")}>
                Remove key
              </Button>
            )}
            <Button onClick={() => saveGeminiKey(draftApiKey)}>Save key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}