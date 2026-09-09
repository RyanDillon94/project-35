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

const SYSTEM_INSTRUCTIONS = `You are the Project 35 performance coach: direct, no-fluff, technically sharp, and focused on progressive overload and athletic longevity.

Rules:
- Celebrate only earned wins, briefly. No hype, no conversational filler, no emojis.
- Kilograms in, kilograms out for lifts; pounds for bodyweight.
- Keep answers under 300 words using tight formatting and clear bullet points.
- Always conclude with a 3-bullet "Next Session Battle Plan".

PROGRESSION MATRIX (Evaluate the final set RPE of each exercise):
- RPE < 7.0: PROMOTE WEIGHT (+2.5kg next session). Load is too light; leaving too much in the tank.
- RPE 7.0–8.0: PROGRESS REPS (+1 rep next session). Target sweet spot. Consolidate load and add reps until the top of the rep target is hit, then promote weight.
- RPE 8.5–9.0: STICK. Working ceiling. Consolidate current volume and lock in form; do not increase load.
- RPE 9.5–10.0 (Fatigue/Failure): HOLD OR DROP (-1 rep next session). Near technical failure. Hold load, do not promote.
- Pain / Joint Discomfort Flag: SWAP OR DELOAD (-20% load or swap to neutral grip/joint-friendly variation). Immediate priority is joint longevity.

OUTPUT FORMAT (When reviewing a Hevy workout):
For each exercise logged in the session:
1. [Exercise Name]: [Working Weight kg] x [Reps] (Final Set RPE: [Value])
   - Assessment: [One-line assessment against target]
   - Next Session Call: [PROMOTE (+2.5kg) | PROGRESS REPS (+1) | STICK | DELOAD]
   - Notes Feedback: [Direct response to any note the athlete left in Hevy]

End with:
### Next Session Battle Plan
- [Promoted loads]
- [Key mechanical focus or rep target]
- [Next immediate action]`;

function buildContext(workout: HevyWorkout | null, entries: WeightEntry[]) {
  const block = getActiveBlockCountdown();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const trend =
    sorted.slice(-6).map((e) => `${e.date}: ${e.weight} lb`).join(", ") ||
    "no weigh-ins logged yet";
  const latest = sorted[sorted.length - 1]?.weight;

  const lines = [
    `CURRENT BLOCK OBJECTIVE: ${block.phaseTitle} • ${block.blockName} (Week ${block.currentWeek} of ${block.totalWeeks})`,
    `Focus: ${block.goal}`,
    `Goal weight: ${GOAL_WEIGHT} lb. Current: ${latest ?? "unknown"} lb. Trend: ${trend}.`,
    `Daily Targets: ${DAILY_TARGETS.caloriesMin}–${DAILY_TARGETS.caloriesMax} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps} steps.`,
  ];

  if (workout) {
    lines.push(
      `LATEST HEVY WORKOUT: "${workout.title}" on ${workout.startTime ?? "unknown date"}.`,
      ...workout.exercises.map((ex) => {
        const lastSet = ex.sets[ex.sets.length - 1];
        const setStr = ex.sets
          .map(
            (s) =>
              `${s.weightKg ?? "BW"}kg x ${s.reps ?? "?"}${
                s.rpe != null ? ` @RPE${s.rpe}` : ""
              }`,
          )
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

async function callGemini(apiKey: string, prompt: string, systemContext: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${SYSTEM_INSTRUCTIONS}\n\nATHLETE & BLOCK CONTEXT:\n${systemContext}`,
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
  return (
    <>
      {text
        .replace(/^\s*[*-]\s+/gm, "• ")
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="text-primary">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
    </>
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
    if (typeof document === "undefined" || !document.body || !endRef.current) return;
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

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
      await add.mutateAsync({ role: "user", content: trimmed });
      const reply = await callGemini(apiKey, trimmed, buildContext(workout, entries));
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
                Ask about a stalling lift, progressive overload calls, or tap the quick action below.
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
                <Loader2 className="size-4 animate-spin" /> Evaluating progression matrix...
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
                send("Analyse my last Hevy workout against current block targets. Evaluate RPE for each exercise, provide promote/stick/deload calls, and build my next session plan.")
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
                placeholder="Ask about a lift, RPE, or progression..."
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
