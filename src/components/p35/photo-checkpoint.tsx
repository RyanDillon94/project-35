import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLocalState } from "@/lib/use-local-state";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

type Slot = "baseline" | "current";

export function PhotoCheckpoint() {
  const [photos, setPhotos] = useLocalState<Partial<Record<Slot, string>>>("p35.photos", {});
  const pending = useRef<Slot>("baseline");
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (slot: Slot) => {
    pending.current = slot;
    inputRef.current?.click();
  };

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 4_000_000) {
      toast.error("Image too large. Use one under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => ({ ...prev, [pending.current]: String(reader.result) }));
      toast.success("Photo checkpoint saved.");
    };
    reader.readAsDataURL(file);
  };

  const slots: Array<{ slot: Slot; label: string }> = [
    { slot: "baseline", label: "Phase 1 Baseline" },
    { slot: "current", label: "Current Phase Photo" },
  ];

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <Camera className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Photo Checkpoint</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {slots.map(({ slot, label }) => (
          <div key={slot} className="space-y-2">
            <button
              type="button"
              onClick={() => pick(slot)}
              className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-2/50 transition-colors active:border-primary"
            >
              {photos[slot] ? (
                <img src={photos[slot]} alt={label} className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="size-6" />
                  Tap to upload
                </span>
              )}
            </button>
            <p className="stat-label text-center">{label}</p>
          </div>
        ))}
      </div>

      <Button variant="secondary" className="mt-4 w-full" onClick={() => pick("current")}>
        <ImagePlus className="size-4" /> Upload current photo
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
