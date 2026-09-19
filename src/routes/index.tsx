function Dashboard({ userId }: { userId: string }) {
  const { entries, save } = useWeighIns(userId);
  const { hevyApiKey, workout, update } = useUserSettings(userId);
  const [isFinalised, setIsFinalised] = useState(false);
  
  // Track the currently viewed date from local storage/navigator
  const [currentDate, setCurrentDate] = useState(() => localStorage.getItem("p35_active_date") || todayKey());

  // 1. Wake-up Hook: Forces a hard refresh if the actual day changes while the app is in the background
  useEffect(() => {
    const mountDate = todayKey();
    const handleWakeUp = () => {
      if (document.visibilityState === "visible") {
        const realToday = todayKey();
        if (realToday !== mountDate) {
          localStorage.removeItem("p35_active_date");
          window.location.reload();
        }
      }
    };
    document.addEventListener("visibilitychange", handleWakeUp);
    return () => document.removeEventListener("visibilitychange", handleWakeUp);
  }, []);

  // 2. Existing Hook: State and event tracking for date/finalise changes
  useEffect(() => {
    const updateDateAndStatus = () => {
      const active = localStorage.getItem("p35_active_date") || todayKey();
      setCurrentDate(active);

      const weekKey = `p35_finalised_week_${active}`;
      setIsFinalised(localStorage.getItem(weekKey) !== null);
    };

    updateDateAndStatus();

    window.addEventListener("p35-week-finalised", updateDateAndStatus);
    window.addEventListener("storage", updateDateAndStatus);
    window.addEventListener("p35-date-changed", updateDateAndStatus as EventListener);
    
    const interval = setInterval(updateDateAndStatus, 300);

    return () => {
      window.removeEventListener("p35-week-finalised", updateDateAndStatus);
      window.removeEventListener("storage", updateDateAndStatus);
      window.removeEventListener("p35-date-changed", updateDateAndStatus as EventListener);
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-5 pb-28">

  {/* Hide test panel 
      <TestModePanel />*/}
      
      {/* Top Banner (Only if NOT finalised) */}
      {!isFinalised && <FinaliseWeekBanner userId={userId} key={`top-${currentDate}`} />}

      <DashboardHeader />
      <NonNegotiables userId={userId} />
      
      {/* Pass the active navigated date down to the protocol card */}
      <WeeklyProtocolCard currentDate={currentDate} />

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

      {/* Footer Management Section */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
        <WeeklyTrendsAnalytics/>
        <DeloadCard />
        <DataBackupCard />
      </div>

      {/* Bottom Banner (Only AFTER finalised) */}
      {isFinalised && <FinaliseWeekBanner userId={userId} key={`bot-${currentDate}`} />}

      <CoachDrawer workout={workout} entries={entries} userId={userId} />
    </main>
  );
}
