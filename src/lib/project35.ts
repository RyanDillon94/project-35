export const TARGET_DATE = new Date("2029-11-01T00:00:00Z");

export const DAILY_TARGETS = {
  caloriesMin: 2000,
  caloriesMax: 2400,
  protein: 200,
  steps: 12500,
  routine: "6:00 AM Iron \u2192 7:00 AM Dog Walk",
};

export const GOAL_WEIGHT = 190;
export const START_WEIGHT = 220;

export type BlockDef = {
  name: string;
  window: string;
  start: string;
  end: string;
  focus: string[];
  bullets: string[];
};

export type PhaseDef = {
  id: number;
  title: string;
  window: string;
  status: "active" | "upcoming";
  summary: string;
  badges: string[];
  blocks: BlockDef[];
};

export const PHASES: PhaseDef[] = [
  {
    id: 1,
    title: "The Cut & The Clock",
    window: "Sep 2026 \u2013 Feb 2027",
    status: "active",
    summary: "Establish the 6:00 AM habit and drop 30 lbs toward 190 lbs.",
    badges: ["Fat Loss", "Discipline"],
    blocks: [
      {
        name: "Block 1: The Clock",
        window: "Weeks 1\u201312",
        start: "2026-09-07",
        end: "2026-11-29",
        focus: ["Habit", "Deficit"],
        bullets: [
          "Non-negotiable 6:00 AM lift, seven days a week of showing up",
          "2,000\u20132,400 kcal, 200g+ protein, 12,500 steps daily",
          "Friday weekly average weight is the only scale number that counts",
        ],
      },
      {
        name: "Block 2: The Cut Deepens",
        window: "Weeks 13\u201324",
        start: "2026-11-30",
        end: "2027-02-21",
        focus: ["Fat Loss", "Strength Retention"],
        bullets: [
          "Hold strength on the big four while the deficit continues",
          "Add one conditioning finisher twice per week",
          "Land at or under 190 lbs by the end of the block",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "The Foundation Build",
    window: "May 2027 \u2013 Oct 2027",
    status: "upcoming",
    summary: "Lean bulk with heavy compound hypertrophy.",
    badges: ["Hypertrophy", "Strength"],
    blocks: [
      {
        name: "Block 1: Reverse Diet",
        window: "Weeks 1\u201312",
        start: "2027-04-20",
        end: "2027-07-12",
        focus: ["Hypertrophy"],
        bullets: [
          "Calories back to maintenance, then a slow surplus",
          "Compound volume up: squat, bench, deadlift, press",
        ],
      },
      {
        name: "Block 2: Heavy Accumulation",
        window: "Weeks 13\u201324",
        start: "2027-07-13",
        end: "2027-10-04",
        focus: ["Strength"],
        bullets: [
          "Progressive overload on 5\u20138 rep top sets",
          "Bodyweight climbs no faster than 2 lbs per month",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Athletic Performance",
    window: "Nov 2027 \u2013 Apr 2028",
    status: "upcoming",
    summary: "Work capacity and upper yoke development.",
    badges: ["Conditioning", "Hypertrophy"],
    blocks: [
      {
        name: "Block 1: Engine Work",
        window: "Weeks 1\u201312",
        start: "2027-10-05",
        end: "2027-12-27",
        focus: ["Conditioning"],
        bullets: ["Zone 2 base plus weekly intervals", "Carries and sled work every session"],
      },
      {
        name: "Block 2: Yoke Build",
        window: "Weeks 13\u201324",
        start: "2027-12-28",
        end: "2028-03-20",
        focus: ["Hypertrophy"],
        bullets: ["Traps, delts, upper back triple frequency", "Overhead strength benchmarks"],
      },
    ],
  },
  {
    id: 4,
    title: "Hybrid Balance",
    window: "May 2028 \u2013 Oct 2028",
    status: "upcoming",
    summary: "Conditioning and functional strength held together.",
    badges: ["Conditioning", "Strength"],
    blocks: [
      {
        name: "Block 1: Strength + Engine",
        window: "Weeks 1\u201312",
        start: "2028-03-21",
        end: "2028-06-12",
        focus: ["Strength"],
        bullets: ["Two heavy days, two hybrid days", "Rucking and loaded carries weekly"],
      },
      {
        name: "Block 2: Field Test",
        window: "Weeks 13\u201324",
        start: "2028-06-13",
        end: "2028-09-04",
        focus: ["Conditioning"],
        bullets: ["Benchmark events every four weeks", "Hold body fat in single-to-low teens"],
      },
    ],
  },
  {
    id: 5,
    title: "Peak Density",
    window: "Nov 2028 \u2013 Apr 2029",
    status: "upcoming",
    summary: "Maximum muscle maturity and leanness.",
    badges: ["Hypertrophy", "Strength"],
    blocks: [
      {
        name: "Block 1: Density Volume",
        window: "Weeks 1\u201312",
        start: "2028-09-05",
        end: "2028-11-27",
        focus: ["Hypertrophy"],
        bullets: ["Highest tolerable volume with clean technique", "Weak-point specialisation"],
      },
      {
        name: "Block 2: Final Lean",
        window: "Weeks 13\u201324",
        start: "2028-11-28",
        end: "2029-02-19",
        focus: ["Fat Loss"],
        bullets: ["Slow controlled cut, zero strength loss", "Full photo and lift audit"],
      },
    ],
  },
  {
    id: 6,
    title: "Project 35",
    window: "May 2029 \u2013 Nov 2029",
    status: "upcoming",
    summary: "Permanent identity, peak physique at 35.",
    badges: ["Strength", "Conditioning"],
    blocks: [
      {
        name: "Block 1: Sharpen",
        window: "Weeks 1\u201312",
        start: "2029-02-20",
        end: "2029-05-15",
        focus: ["Peaking"],
        bullets: ["Peak conditioning with full strength intact", "Photo checkpoint every four weeks"],
      },
      {
        name: "Block 2: Arrive",
        window: "Weeks 13\u201324",
        start: "2029-05-16",
        end: "2029-11-01",
        focus: ["Identity"],
        bullets: ["Maintain the standard indefinitely", "Arrive at 35 in undeniable shape"],
      },
    ],
  },
];

export function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export const LONG_TERM_TARGET = "Target: November 2029 — Age 35";

export function getActiveBlockCountdown(now = new Date()) {
  const nowMs = now.getTime();

  let activePhase = PHASES[0];
  let activeBlock = PHASES[0].blocks[0];

  for (const phase of PHASES) {
    for (const block of phase.blocks) {
      const startMs = new Date(`${block.start}T00:00:00Z`).getTime();
      const endMs = new Date(`${block.end}T23:59:59Z`).getTime();
      if (nowMs >= startMs && nowMs <= endMs) {
        activePhase = phase;
        activeBlock = block;
        break;
      }
    }
  }

  const lastPhase = PHASES[PHASES.length - 1];
  const lastBlock = lastPhase.blocks[lastPhase.blocks.length - 1];
  if (nowMs > new Date(`${lastBlock.end}T23:59:59Z`).getTime()) {
    activePhase = lastPhase;
    activeBlock = lastBlock;
  }

  const start = new Date(`${activeBlock.start}T00:00:00Z`);
  const end = new Date(`${activeBlock.end}T23:59:59Z`);

  const total = Math.max(1, daysBetween(start, end));
  const daysLeft = Math.max(0, daysBetween(now, end));
  const elapsed = Math.min(total, Math.max(0, total - daysLeft));

  const totalWeeks = Math.max(1, Math.round(total / 7));
  const currentWeek = Math.min(totalWeeks, Math.floor(elapsed / 7) + 1);
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return {
    phaseTitle: `Phase ${activePhase.id}: ${activePhase.title}`,
    blockName: activeBlock.name,
    window: activeBlock.window,
    goal: activeBlock.bullets[0] || activePhase.summary,
    dateRange: `${formatDate(activeBlock.start)} — ${formatDate(activeBlock.end)}`,
    currentWeek,
    totalWeeks,
    daysLeft,
    progress,
    longTermTarget: LONG_TERM_TARGET,
  };
}

export function countdownTo(target: Date, now = new Date()) {
  const days = Math.max(0, daysBetween(now, target));
  return {
    days,
    weeks: Math.floor(days / 7),
    months: Math.max(0, Math.round(days / 30.44)),
  };
}

export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function lastFridayKey(now = new Date()) {
  const d = new Date(now);
  const diff = (d.getUTCDay() + 2) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
