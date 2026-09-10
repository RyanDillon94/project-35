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
  workout: initialWorkout,
  apiKey: initialApiKey,
  onSaveKey,
  onWorkout,
}: {
  workout: HevyWorkout | null;
  apiKey: string;
  onSaveKey?: (key: string) => Promise<void>;
  onWorkout?: (workout: HevyWorkout) => Promise<void>;
}) {
  const [activeKey, setActiveKey] = useState(() => {
    return localStorage.getItem("p35_hevy_api_key") || initialApiKey || "";
  });
  const [draftKey, setDraftKey] = useState(activeKey);
  const [currentWorkout, setCurrentWorkout] = useState<HevyWorkout | null>(() => {
    const cached = localStorage.getItem("p35_cached_workout");
    return cached ? JSON.parse(cached) : initialWorkout;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialApiKey && !activeKey) {
      setActiveKey(initialApiKey);
      setDraftKey(initialApiKey);
    }
  }, [initialApiKey]);

  const saveKey = async (value: string) => {
    try {
      const cleanKey = value.trim();
      localStorage.setItem("p35_hevy_api_key", cleanKey);
      setActiveKey(cleanKey);
      
      // Attempt cloud update in background if available, but never block
      if (onSaveKey) {
        onSaveKey(cleanKey).catch(() => {});
      }

      toast.success(cleanKey ? "Hevy key saved locally." : "Key removed.");
      setSettingsOpen(false);
    } catch {
      toast.error("Could not save key to device storage.");
    }
  };

  const sync = async () => {
    const keyToUse = activeKey.trim();
    if (!keyToUse) {
      setSettingsOpen(true);
      toast.error("Add your Hevy API key first.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchLatestHevyWorkout({ data: { apiKey: keyToUse } });
      if (!result.workout) {
        toast.error("No workouts found on that Hevy account.");
      } else {
        setCurrentWorkout(result.workout);
        localStorage.setItem("p35_cached_workout", JSON.stringify(result.workout));
        if (onWorkout) {
          onWorkout(result.workout).catch(() => {});
        }
        toast.success("Latest Hevy workout synced.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hevy sync failed.");
    } finally {
      setLoading(false);
    }
  };

  const displayWorkout = currentWorkout || initialWorkout;

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Latest Workout</h2>
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
                Saved privately to your phone's browser. Get your key from the Hevy developer settings.
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
              {activeKey && (
                <Button variant="ghost" onClick={() => void saveKey("")}>
                  Remove key
                </Button>
              )}
              <Button onClick={() => void saveKey(draftKey)}>Save key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {displayWorkout ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <p className="text-sm font-semibold text-primary">{displayWorkout.title}</p>
            <p className="text-xs text-muted-foreground">
              {displayWorkout.startTime ? new Date(displayWorkout.startTime).toLocaleString() : "Date unknown"}
            </p>
          </div>
          <div className="space-y-2">
            {displayWorkout.exercises.map((ex, i) => {
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
