import { getMuscleGroupForExercise, MuscleGroup, MUSCLE_GROUPS } from "./strengthMapping";

export type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
};

export type ExerciseDetail = {
  exerciseName: string;
  currentE1RM: number;
  baselineE1RM: number;
  percentChange: number;
  currentVolume: number;
};

export type MuscleGroupSummary = {
  strengthChange: number;
  volumeChange: number;
  currentVolume: number;
  baselineVolume: number;
  topExercises: ExerciseDetail[];
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
    emptyGroups[g] = { strengthChange: 0, volumeChange: 0, currentVolume: 0, baselineVolume: 0, topExercises: [] };
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

  // Recent block is always the latest active week; baseline is look back 4 active training blocks (or earliest)
  const recentWeekKey = sortedWeeks[sortedWeeks.length - 1];
  const baselineWeekKey = sortedWeeks.length >= 4 
    ? sortedWeeks[sortedWeeks.length - 4] 
    : sortedWeeks[0];

  const recentSets = weeklyBlocks.get(recentWeekKey) || [];
  const baselineSets = weeklyBlocks.get(baselineWeekKey) || [];

  if (sortedWeeks.length === 1) {
    const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
    const muscleVols: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
    recentSets.forEach(s => {
      const m = getMuscleGroupForExercise(s.exerciseName);
      if (m) muscleVols[m] += s.weight * s.reps;
    });

    MUSCLE_GROUPS.forEach(g => {
      muscleGroupSummaries[g] = {
        strengthChange: 0,
        volumeChange: 0,
        currentVolume: muscleVols[g],
        baselineVolume: muscleVols[g],
        topExercises: [],
      };
    });

    return {
      overallStrengthChange: 0,
      overallVolumeChange: 0,
      muscleGroups: muscleGroupSummaries,
      weeklyTrend: [],
    };
  }

  // Track metrics separately for baseline and recent to avoid cross-contamination
  const baselineExerciseMap: Map<string, { muscle: MuscleGroup; maxE1rm: number; totalVol: number; setsCount: number }> = new Map();
  const recentExerciseMap: Map<string, { muscle: MuscleGroup; maxE1rm: number; totalVol: number; setsCount: number }> = new Map();

  baselineSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!baselineExerciseMap.has(s.exerciseName)) {
      baselineExerciseMap.set(s.exerciseName, { muscle, maxE1rm: 0, totalVol: 0, setsCount: 0 });
    }
    const entry = baselineExerciseMap.get(s.exerciseName)!;
    entry.totalVol += vol;
    entry.setsCount += 1;
    if (e1rm > entry.maxE1rm) entry.maxE1rm = e1rm;
  });

  recentSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!recentExerciseMap.has(s.exerciseName)) {
      recentExerciseMap.set(s.exerciseName, { muscle, maxE1rm: 0, totalVol: 0, setsCount: 0 });
    }
    const entry = recentExerciseMap.get(s.exerciseName)!;
    entry.totalVol += vol;
    entry.setsCount += 1;
    if (e1rm > entry.maxE1rm) entry.maxE1rm = e1rm;
  });

  const muscleVolumeBase: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  const muscleVolumeRecent: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  let totalVolumeBase = 0;
  let totalVolumeRecent = 0;

  baselineExerciseMap.forEach((data, exerciseName) => {
    muscleVolumeBase[data.muscle] += data.totalVol;
    totalVolumeBase += data.totalVol;
  });

  const muscleStrengthChanges: Record<MuscleGroup, { totalWeightedChange: number; totalWeight: number }> = {
    Chest: { totalWeightedChange: 0, totalWeight: 0 },
    Back: { totalWeightedChange: 0, totalWeight: 0 },
    Shoulders: { totalWeightedChange: 0, totalWeight: 0 },
    Biceps: { totalWeightedChange: 0, totalWeight: 0 },
    Triceps: { totalWeightedChange: 0, totalWeight: 0 },
    Legs: { totalWeightedChange: 0, totalWeight: 0 },
  };

  const muscleExercises: Record<MuscleGroup, ExerciseDetail[]> = {
    Chest: [], Back: [], Shoulders: [], Biceps: [], Triceps: [], Legs: []
  };

  recentExerciseMap.forEach((recentData, exerciseName) => {
    muscleVolumeRecent[recentData.muscle] += recentData.totalVol;
    totalVolumeRecent += recentData.totalVol;

    const baseData = baselineExerciseMap.get(exerciseName);
    const baseE1rm = baseData ? baseData.maxE1rm : 0;
    const recentE1rm = recentData.maxE1rm;

    let exStrengthChange = 0;
    if (baseE1rm > 0 && recentE1rm > 0) {
      exStrengthChange = Math.round(((recentE1rm - baseE1rm) / baseE1rm) * 1000) / 10;
      const weight = recentData.setsCount + (baseData ? baseData.setsCount : 0);
      muscleStrengthChanges[recentData.muscle].totalWeightedChange += exStrengthChange * weight;
      muscleStrengthChanges[recentData.muscle].totalWeight += weight;
    }

    muscleExercises[recentData.muscle].push({
      exerciseName,
      currentE1RM: recentE1rm,
      baselineE1RM: baseE1rm,
      percentChange: exStrengthChange,
      currentVolume: recentData.totalVol,
    });
  });

  const overallVolumeChange = totalVolumeBase > 0 
    ? Math.round(((totalVolumeRecent - totalVolumeBase) / totalVolumeBase) * 1000) / 10 
    : 0;

  const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
  let overallWeightedStrengthChange = 0;
  let overallStrengthWeight = 0;

  MUSCLE_GROUPS.forEach(group => {
    muscleExercises[group].sort((a, b) => b.currentVolume - a.currentVolume);

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
      topExercises: muscleExercises[group].slice(0, 2),
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
