import { getMuscleGroupForExercise, MuscleGroup, MUSCLE_GROUPS } from "./strengthMapping";

export type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
};

export type MuscleGroupSummary = {
  strengthChange: number;
  volumeChange: number;
  currentVolume: number;
  baselineVolume: number;
};

export type ProgressReport = {
  overallStrengthChange: number;
  overallVolumeChange: number;
  muscleGroups: Record<MuscleGroup, MuscleGroupSummary>;
  weeklyTrend: any[];
};

export function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Helper to get the Monday of any given date's week (YYYY-MM-DD)
function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export function calculateTrainingProgress(
  sets: WorkoutSet[],
  windowDays = 90
): ProgressReport {
  const now = new Date().getTime();
  const windowMs = windowDays * 86_400_000;
  const cutoffTime = now - windowMs;

  const validSets = sets.filter(s => {
    if (!s || s.weight <= 0 || s.reps <= 0) return false;
    const time = new Date(s.date).getTime();
    return !isNaN(time) && time >= cutoffTime && time <= now;
  });

  const emptyGroups = {} as Record<MuscleGroup, MuscleGroupSummary>;
  MUSCLE_GROUPS.forEach(g => {
    emptyGroups[g] = { strengthChange: 0, volumeChange: 0, currentVolume: 0, baselineVolume: 0 };
  });

  if (validSets.length === 0) {
    return { overallStrengthChange: 0, overallVolumeChange: 0, muscleGroups: emptyGroups, weeklyTrend: [] };
  }

  // Group sets by active Monday-to-Sunday weekly blocks
  const weeklyBlocks = new Map<string, WorkoutSet[]>();
  validSets.forEach(s => {
    const mondayKey = getMondayKey(s.date);
    if (!weeklyBlocks.has(mondayKey)) {
      weeklyBlocks.set(mondayKey, []);
    }
    weeklyBlocks.get(mondayKey)!.push(s);
  });

  // Sort active week keys chronologically
  const sortedWeeks = Array.from(weeklyBlocks.keys()).sort();

  if (sortedWeeks.length === 0) {
    return { overallStrengthChange: 0, overallVolumeChange: 0, muscleGroups: emptyGroups, weeklyTrend: [] };
  }

  // Recent block is always the latest active week; baseline is the immediate prior active training week
  const recentWeekKey = sortedWeeks[sortedWeeks.length - 1];
  const baselineWeekKey = sortedWeeks.length >= 2 ? sortedWeeks[sortedWeeks.length - 2] : sortedWeeks[0];

  const recentSets = weeklyBlocks.get(recentWeekKey) || [];
  const baselineSets = weeklyBlocks.get(baselineWeekKey) || [];

  // If baseline and recent point to the exact same single week, we can't compare block-to-block yet
  if (sortedWeeks.length === 1) {
    const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
    let totalVol = 0;
    
    const muscleVols: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
    recentSets.forEach(s => {
      const m = getMuscleGroupForExercise(s.exerciseName);
      if (m) {
        muscleVols[m] += s.weight * s.reps;
        totalVol += s.weight * s.reps;
      }
    });

    MUSCLE_GROUPS.forEach(g => {
      muscleGroupSummaries[g] = {
        strengthChange: 0,
        volumeChange: 0,
        currentVolume: muscleVols[g],
        baselineVolume: muscleVols[g],
      };
    });

    return {
      overallStrengthChange: 0,
      overallVolumeChange: 0,
      muscleGroups: muscleGroupSummaries,
      weeklyTrend: [],
    };
  }

  // Compute metrics per exercise for baseline week vs recent week
  const exerciseComparison: Map<string, { muscle: MuscleGroup; baseE1rm: number; recentE1rm: number; baseVol: number; recentVol: number; baseSets: number; recentSets: number }> = new Map();

  // Process baseline sets
  baselineSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!exerciseComparison.has(s.exerciseName)) {
      exerciseComparison.set(s.exerciseName, { muscle, baseE1rm: 0, recentE1rm: 0, baseVol: 0, recentVol: 0, baseSets: 0, recentSets: 0 });
    }
    const entry = exerciseComparison.get(s.exerciseName)!;
    entry.baseVol += vol;
    entry.baseSets += 1;
    if (e1rm > entry.baseE1rm) entry.baseE1rm = e1rm;
  });

  // Process recent sets
  recentSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!exerciseComparison.has(s.exerciseName)) {
      exerciseComparison.set(s.exerciseName, { muscle, baseE1rm: 0, recentE1rm: 0, baseVol: 0, recentVol: 0, baseSets: 0, recentSets: 0 });
    }
    const entry = exerciseComparison.get(s.exerciseName)!;
    entry.recentVol += vol;
    entry.recentSets += 1;
    if (e1rm > entry.recentE1rm) entry.recentE1rm = e1rm;
  });

  const muscleVolumeBase: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  const muscleVolumeRecent: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  let totalVolumeBase = 0;
  let totalVolumeRecent = 0;

  const muscleStrengthChanges: Record<MuscleGroup, { totalWeightedChange: number; totalWeight: number }> = {
    Chest: { totalWeightedChange: 0, totalWeight: 0 },
    Back: { totalWeightedChange: 0, totalWeight: 0 },
    Shoulders: { totalWeightedChange: 0, totalWeight: 0 },
    Biceps: { totalWeightedChange: 0, totalWeight: 0 },
    Triceps: { totalWeightedChange: 0, totalWeight: 0 },
    Legs: { totalWeightedChange: 0, totalWeight: 0 },
  };

  exerciseComparison.forEach((data) => {
    muscleVolumeBase[data.muscle] += data.baseVol;
    muscleVolumeRecent[data.muscle] += data.recentVol;
    totalVolumeBase += data.baseVol;
    totalVolumeRecent += data.recentVol;

    if (data.baseE1rm > 0 && data.recentE1rm > 0) {
      const exChange = ((data.recentE1rm - data.baseE1rm) / data.baseE1rm) * 100;
      const weight = data.recentSets + data.baseSets;

      muscleStrengthChanges[data.muscle].totalWeightedChange += exChange * weight;
      muscleStrengthChanges[data.muscle].totalWeight += weight;
    }
  });

  const overallVolumeChange = totalVolumeBase > 0 
    ? Math.round(((totalVolumeRecent - totalVolumeBase) / totalVolumeBase) * 1000) / 10 
    : 0;

  const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
  let overallWeightedStrengthChange = 0;
  let overallStrengthWeight = 0;

  MUSCLE_GROUPS.forEach(group => {
    const mData = muscleStrengthChanges[group];
    const strengthChange = mData.totalWeight > 0 
      ? Math.round((mData.totalWeightedChange / mData.totalWeight) * 10) / 10 
      : 0;

    const vBase = muscleVolumeBase[group];
    const vRecent = muscleVolumeRecent[group];
    const volumeChange = vBase > 0 
      ? Math.round(((vRecent - vBase) / vBase) * 1000) / 10 
      : (vRecent > 0 ? 100 : 0);

    muscleGroupSummaries[group] = {
      strengthChange,
      volumeChange,
      currentVolume: vRecent,
      baselineVolume: vBase,
    };

    if (mData.totalWeight > 0 && group !== "Biceps" && group !== "Triceps") {
      overallWeightedStrengthChange += mData.totalWeightedChange;
      overallStrengthWeight += mData.totalWeight;
    }
  });

  const overallStrengthChange = overallStrengthWeight > 0 
    ? Math.round((overallWeightedStrengthChange / overallStrengthWeight) * 10) / 10 
    : 0;

  return {
    overallStrengthChange,
    overallVolumeChange,
    muscleGroups: muscleGroupSummaries,
    weeklyTrend: [],
  };
}
