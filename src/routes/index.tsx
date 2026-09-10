import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/p35/header";
import { NonNegotiables } from "@/components/p35/non-negotiables";
import { PhotoCheckpoint } from "@/components/p35/photo-checkpoint";
import { WeightCard } from "@/components/p35/weight-card";
import { HevyCard } from "@/components/p35/hevy-card";
import { CoachDrawer } from "@/components/p35/coach-drawer";
import { Roadmap } from "@/components/p35/roadmap";
import { DataBackupCard } from "@/components/p35/data-backup-card";
import { DeloadCard } from "@/components/p35/deload-card";
import { FinaliseWeekBanner } from "@/components/p35/finalise-week-banner";
import { useUserSettings, useWeighIns } from "@/lib/p35-cloud";
import { TestModePanel } from '../components/TestModePanel';
import { WeeklyTrendsAnalytics } from "@/components/p35/weekly-trends-analytics";


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
  return <Dashboard userId="local-user" />;
}

function Dashboard({ userId }: { userId: string }) {
  const { entries, save } = useWeighIns(userId);
  const { hevyApiKey, workout, update } = useUserSettings(userId);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-5 pb-28">
      <TestModePanel />
      
      <FinaliseWeekBanner userId={userId} />

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
        <p className="text-center text-xs italic tracking-wide text-muted-foreground/70">
          &ldquo;Only cunts drink on weekdays... Don&apos;t be a cunt.&rdquo;
        </p>
      </div>

      {/* Footer Management Section */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
        <DeloadCard />
<WeeklyTrendsAnalytics/>
        <DataBackupCard />
      </div>

      <CoachDrawer workout={workout} entries={entries} userId={userId} />
    </main>
  );
}
