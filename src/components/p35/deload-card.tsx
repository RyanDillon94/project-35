import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Umbrella } from "lucide-react";
import { getDeloadOffset, toggleDeloadWeek } from "@/utils/dateUtils";

export function DeloadCard() {
  const [isDeload, setIsDeload] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      setIsDeload(getDeloadOffset() > 0);
    } catch {}
  }, []);

  const toggleDeload = () => {
    startTransition(() => {
      try {
        toggleDeloadWeek();
        const activeNow = getDeloadOffset() > 0;
        setIsDeload(activeNow);

        if (activeNow) {
          setNotification("Deload Week Activated (+7d Shift)");
        } else {
          setNotification("Deload Week Deactivated");
        }

        setTimeout(() => {
          setNotification(null);
        }, 4000);
      } catch {
        setNotification("Failed to update deload state");
      }
    });
  };

  return (
    <div className="flex flex-col w-full rounded-lg border border-border bg-surface-2/60 p-3.5 gap-2">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">Deload / Holiday Mode</p>
            <p className="text-xs text-muted-foreground truncate">
              {isDeload ? "Active — Deload Week" : "Standard mode active"}
            </p>
          </div>
        </div>

        <Button
          variant={isDeload ? "default" : "outline"}
          size="sm"
          onClick={toggleDeload}
          className={`gap-1.5 shrink-0 ${isDeload ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : ""}`}
        >
          <Umbrella className="size-4" />
          {isDeload ? "Active" : "Enable"}
        </Button>
      </div>

      {notification && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-400 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="size-4 shrink-0 text-amber-400" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
