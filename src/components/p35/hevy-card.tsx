import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchLatestHevyWorkout, type HevyWorkout } from "@/lib/hevy.functions";
import { Activity, Loader2, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

export function HevyCard({
  workout,
  apiKey,
  onSaveKey,
  onWorkout,
}: {
  workout: HevyWorkout | null;
  apiKey: string;
  onSaveKey: (key: string) => Promise<void>;
  onWorkout: (workout: HevyWorkout) => Promise<void>;
}) {
  const [draftKey, setDraftKey] = useState(apiKey);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setDraftKey(apiKey), [apiKey]);

  const saveKey = async (value: string) => {
    try {
      await onSaveKey(value);
      toast.success(value ? "Hevy key saved to your account." : "Key removed.");
      setSettingsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save key.");
    }
  };

  const sync = async () => {
    if (!apiKey) {
      setSettingsOpen(true);
      toast.error("Add your Hevy API key first.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchLatestHevyWorkout({ data: { apiKey } });
      if (!result.workout) {
        toast.error("No workouts found on that Hevy account.");
      } else {
        await onWorkout(result.workout);
        toast.success("Latest Hevy workout synced.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hevy sync failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Hevy Integration</h2>
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Hevy settings">
              <Settings className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hevy API Key</DialogTitle>
              <DialogDescription>
                Saved privately to your account, so it works on every device. Get a key from the Hevy
                developer settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="hevy-key">API key</Label>
              <Input
                id="hevy-key"
                type="password"
                autoComplete="off"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="Paste your Hevy API key"
              />
            </div>
            <DialogFooter className="gap-2">
              {apiKey && (
                <Button variant="ghost" onClick={() => void saveKey("")}>
                  Remove key
                </Button>
              )}
              <Button onClick={() => void saveKey(draftKey.trim())}>Save key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {workout ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <p className="stat-label">Latest completed workout</p>
            <p className="text-sm font-semibold">{workout.title}</p>
            <p className="text-xs text-muted-foreground">
              {workout.startTime ? new Date(workout.startTime).toLocaleString() : "Date unknown"}
            </p>
          </div>
          <div className="space-y-2">
            {workout.exercises.map((ex, i) => {
              const lastSet = ex.sets[ex.sets.length - 1];
              return (
                <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{ex.title}</p>
                    <span className="stat-label shrink-0">{ex.sets.length} sets</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ex.sets
                      .map((s) => `${s.weightKg ?? "BW"}kg \u00d7 ${s.reps ?? "?"}`)
                      .join("  \u00b7  ")}
                  </p>
                  {lastSet?.rpe != null && (
                    <p className="mt-1.5 text-xs font-medium text-primary">
                      Final set RPE: {lastSet.rpe}
                    </p>
                  )}
                  {ex.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      &ldquo;{ex.notes}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No workout synced yet. Add your key and pull your latest session.
        </p>
      )}

      <Button className="mt-4 w-full" onClick={() => void sync()} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sync Hevy Workout
      </Button>
    </section>
  );
}
