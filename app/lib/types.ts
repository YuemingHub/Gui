export type TruthStage = "seed" | "cultivate" | "advance" | "pause" | "done";
export type ClearingType = "真事" | "假事" | "杂事" | "废事";
export type ClearingHandling = "保留" | "限制" | "降级" | "移除";
export type BoundaryCategory = "信息边界" | "社交边界" | "工作边界" | "消费边界" | "情绪边界";
export type GardenStatus = "Seed" | "Draft" | "WIP" | "Pause" | "Ship";

export type DailyState = {
  hijackedBy: string;
  trueThing: string;
  why: string;
  smallestStep: string;
  lowPowerVersion: string;
  notReceiving: string;
  takenAwayBy: string;
  didReturn: string;
  tomorrowLess: string;
  tomorrowMore: string;
};

export type TruthItem = {
  id: string;
  name: string;
  whyImportant: string;
  stage: TruthStage;
  enoughDefinition: string;
  weeklySmallStep: string;
  lowPointMaintenance: string;
  active: boolean;
};

export type ClearingItem = {
  id: string;
  name: string;
  type: ClearingType;
  givesMe: string;
  takesFromMe: string;
  handling: ClearingHandling;
  note: string;
};

export type BoundaryItem = {
  id: string;
  category: BoundaryCategory;
  content: string;
  trigger: string;
  response: string;
  enabled: boolean;
};

export type RhythmState = {
  greenCanAdvance: string;
  yellowOnlyMaintain: string;
  redOnlyProtect: string;
};

export type GardenItem = {
  id: string;
  title: string;
  status: GardenStatus;
  description: string;
  nextStep: string;
  linkedTruthId?: string;
};

export type MonthlyReviewItem = {
  id: string;
  month: string;
  hijackedBy: string;
  notWorthContinuing: string;
  truthToSeeAgain: string;
  lessNextMonth: string;
  moreNextMonth: string;
};

export type AppPreferences = {
  onboardingDismissed: boolean;
};

export type AppState = {
  daily: DailyState;
  truths: TruthItem[];
  clearings: ClearingItem[];
  boundaries: BoundaryItem[];
  rhythm: RhythmState;
  gardenItems: GardenItem[];
  monthlyReviews: MonthlyReviewItem[];
  preferences: AppPreferences;
};

export type SectionId =
  | "home"
  | "truths"
  | "clearings"
  | "boundaries"
  | "rhythm"
  | "garden"
  | "monthly";
