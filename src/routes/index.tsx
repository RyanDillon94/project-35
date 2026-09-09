import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/p35/header";
import { NonNegotiables } from "@/components/p35/non-negotiables";
import { PhotoCheckpoint } from "@/components/p35/photo-checkpoint";
import { WeightCard, type WeightEntry } from "@/components/p35/weight-card";
import { HevyCard } from "@/components/p35/hevy-card";
import { CoachDrawer } from "@/components/p35/coach-drawer";
import { Roadmap } from "@/components/p35/roadmap";
import type { HevyWorkout } from "@/lib/hevy.functions";
import { useLocalState } from "@/lib/use-local-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project 35: The Undeniable Standard" },
      {
        name: "description",
        content:
          "Dark fitness command centre: daily non-negotiables, Friday weight trend, Hevy sync, AI coach and a 3-year phase roadmap to November 2029.",
      },
      { property: "og:title", content: "Project 35: The Undeniable Standard" },
      {
        property: "og:description",
        content:
          "Track the cut, the 6:00 AM habit, weekly weight averages and every training phase on the road to 35.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [entries, setEntries] = useLocalState<WeightEntry[]>("p35.weights", []);
  const [workout, setWorkout] = useLocalState<HevyWorkout | null>("p35.hevyWorkout", null);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-5 pb-28">
      <DashboardHeader />
      <NonNegotiables />
      <PhotoCheckpoint />
      <WeightCard entries={entries} setEntries={setEntries} />
      <HevyCard workout={workout} setWorkout={setWorkout} />
      <Roadmap />
      <p className="pt-2 text-center text-xs text-muted-foreground">
        Saved on this device. Add to your home screen for a full-screen experience.
      </p>
      <CoachDrawer workout={workout} entries={entries} />
    </main>
  );
}
