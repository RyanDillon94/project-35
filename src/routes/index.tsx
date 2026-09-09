import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/p35/header";
import { NonNegotiables } from "@/components/p35/non-negotiables";
import { PhotoCheckpoint } from "@/components/p35/photo-checkpoint";
import { WeightCard } from "@/components/p35/weight-card";
import { HevyCard } from "@/components/p35/hevy-card";
import { CoachDrawer } from "@/components/p35/coach-drawer";
import { Roadmap } from "@/components/p35/roadmap";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { useUserSettings, useWeighIns } from "@/lib/p35-cloud";
import { Loader2, LogOut } from "lucide-react";

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
  const { userId, loading } = useSession();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!userId) return <SignedOut />;

  return <Dashboard userId={userId} />;
}

function SignedOut() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-4">
      <section className="panel glow-ring w-full p-6 text-center">
        <p className="stat-label">Project 35</p>
        <h1 className="mt-1 text-2xl font-bold">
          The <span className="text-primary">Undeniable Standard</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to load your weight trend, habits, photos and coach chats on this device.
        </p>
        <Button asChild className="mt-5 h-11 w-full">
          <Link to="/auth">Sign in or create an account</Link>
        </Button>
      </section>
    </main>
  );
}

function Dashboard({ userId }: { userId: string }) {
  const { entries, save } = useWeighIns(userId);
  const { hevyApiKey, workout, update } = useUserSettings(userId);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-5 pb-28">
      <DashboardHeader />
      <NonNegotiables userId={userId} />
      <HevyCard
        workout={workout}
        apiKey={hevyApiKey}
        onSaveKey={(key) => update.mutateAsync({ hevyApiKey: key })}
        onWorkout={(next) => update.mutateAsync({ workout: next })}
      />
      <WeightCard
        entries={entries}
        saving={save.isPending}
        onSave={(entry) => save.mutateAsync(entry)}
      />
      <PhotoCheckpoint userId={userId} />
      <Roadmap />
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-center text-xs text-muted-foreground">
          Synced to your account. Add to your home screen for a full-screen experience.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
      <CoachDrawer workout={workout} entries={entries} userId={userId} />
    </main>
  );
}
