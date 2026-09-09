import { useState } from "react";
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
import { useLocalState } from "@/lib/use-local-state";
import { Activity, Loader2, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

export function HevyCard({
  workout,
  setWorkout,
}: {
  workout: HevyWorkout | null;
  setWorkout: React.Dispatch<React.SetStateAction<HevyWorkout | null>>;
}) {
  const [apiKey, setApiKey] = useLocalState<string>("p35.hevyKey", "");
  const [draftKey, setDraftKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sync = async () => {
    if (!apiKey) {
      setDraftKey("");
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
        setWorkout(result.workout);
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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Hevy settings"
              onClick={() => setDraftKey(apiKey)}
            >
              <Settings className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hevy API Key</DialogTitle>
              <DialogDescription>
                Stored only on this device. Get a key from the Hevy developer settings.
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
                <Button
                  variant="ghost"
                  onClick={() => {
                    setApiKey("");
                    setDraftKey("");
                    toast.success("Key removed.");
                  }}
                >
                  Remove key
                </Button>
              )}
              <Button
                onClick={() => {
                  setApiKey(draftKey.trim());
                  setSettingsOpen(false);
                  toast.success("Hevy key saved on this device.");
                }}
              >
                Save key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4">
        {workout ? (
          <div className="rounded-lg border border-border bg-surface-2/60 p-4">
            <p className="stat-label">Latest completed workout</p>
            <h3 className="mt-1 text-base font-bold">{workout.title}</h3>
            <p className="text-xs text-muted-foreground">
              {workout.startTime ? new Date(workout.startTime).toLocaleString() : "Date unavailable"}
            </p>
            <ul className="mt-3 space-y-2">
              {workout.exercises.map((ex, i) => {
                const top = ex.sets.reduce(
                  (best, s) => ((s.weightKg ?? 0) > (best?.weightKg ?? 0) ? s : best),
                  ex.sets[0],
                );
                return (
                  <li key={`${ex.title}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{ex.title}</span>
                    <span className="shrink-0 font-display text-primary">
                      {ex.sets.length} &times; {top?.weightKg ? `${top.weightKg} kg` : "BW"}
                      {top?.reps ? ` \u00b7 ${top.reps} reps` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No workout synced yet.
          </div>
        )}
      </div>

      <Button className="mt-4 w-full" onClick={sync} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sync Hevy Workout
      </Button>
    </section>
  );
}
