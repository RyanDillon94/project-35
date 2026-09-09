import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { askCoach } from "@/lib/coach.functions";
import type { HevyWorkout } from "@/lib/hevy.functions";
import type { WeightEntry } from "@/components/p35/weight-card";
import { DAILY_TARGETS, GOAL_WEIGHT } from "@/lib/project35";
import { useCoachMessages, type CoachMsg } from "@/lib/p35-cloud";
import { Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = CoachMsg;

function buildContext(workout: HevyWorkout | null, entries: WeightEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const trend = sorted.slice(-6).map((e) => `${e.date}: ${e.weight} lb`).join(", ") || "no weigh-ins logged yet";
  const latest = sorted[sorted.length - 1]?.weight;
  const lines = [
    `Goal weight: ${GOAL_WEIGHT} lb. Current: ${latest ?? "unknown"} lb.`,
    `Friday weekly averages: ${trend}.`,
    `Deficit target: ${DAILY_TARGETS.caloriesMin}-${DAILY_TARGETS.caloriesMax} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps} steps daily.`,
    "Phase 1, Block 1 (Weeks 1-12): establish the 6:00 AM lift and cut toward 190 lb.",
  ];
  if (workout) {
    lines.push(
      `Latest Hevy workout: "${workout.title}" on ${workout.startTime ?? "unknown date"}.`,
      ...workout.exercises.map(
        (ex) =>
          `- ${ex.title}: ${ex.sets
            .map((s) => `${s.weightKg ?? "BW"}kg x ${s.reps ?? "?"}`)
            .join(", ")}`,
      ),
    );
  } else {
    lines.push("No Hevy workout synced yet.");
  }
  return lines.join("\n");
}

function CoachText({ text }: { text: string }) {
  return (
    <>
      {text
        .replace(/^\s*[*-]\s+/gm, "\u2022 ")
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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setInput("");
    setLoading(true);
    try {
      await add.mutateAsync({ role: "user", content: trimmed });
      const { reply } = await askCoach({
        data: {
          messages: next.slice(-12),
          context: buildContext(workout, entries),
        },
      });
      await add.mutateAsync({ role: "assistant", content: reply });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coach is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Coach AI
          </SheetTitle>
          <SheetDescription>Direct, no-fluff accountability on your numbers.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !loading && (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Ask about a stalling lift, your deficit, or hit the quick action below.
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
              <Loader2 className="size-4 animate-spin" /> Reading your numbers
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="space-y-2 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            variant="secondary"
            className="w-full"
            disabled={loading}
            onClick={() => send("Analyse my last Hevy workout against my weight trend and deficit target.")}
          >
            <Sparkles className="size-4" /> Analyse Last Hevy Workout
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
              placeholder="Ask your coach"
              className="h-11"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={loading || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
