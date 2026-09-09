import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { usePhotos, type PhotoSlot } from "@/lib/p35-cloud";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PhotoCheckpoint({ userId }: { userId: string | null }) {
  const { photos, upload } = usePhotos(userId);
  const pending = useRef<PhotoSlot>("baseline");
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (slot: PhotoSlot) => {
    pending.current = slot;
    inputRef.current?.click();
  };

  const onFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10_000_000) {
      toast.error("Image too large. Use one under 10 MB.");
      return;
    }
    upload.mutate(
      { slot: pending.current, file },
      {
        onSuccess: () => toast.success("Photo checkpoint saved to your account."),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Upload failed."),
      },
    );
  };

  const slots: Array<{ slot: PhotoSlot; label: string }> = [
    { slot: "baseline", label: "Phase 1 Baseline" },
    { slot: "current", label: "Current Phase Photo" },
  ];

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <Camera className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Photo Checkpoint</h2>
        {upload.isPending && <Loader2 className="size-4 animate-spin text-primary" />}
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

      <Button
        variant="secondary"
        className="mt-4 w-full"
        disabled={upload.isPending}
        onClick={() => pick("current")}
      >
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
