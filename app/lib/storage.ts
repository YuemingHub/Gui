import {
  BOUNDARY_CATEGORIES,
  CLEARING_HANDLINGS,
  CLEARING_TYPES,
  createInitialState,
  defaultDailyState,
  defaultPreferences,
  defaultRhythmState,
  GARDEN_STATUSES,
  STORAGE_KEY,
  TRUTH_STAGES,
} from "./defaults";
import type {
  AppPreferences,
  AppState,
  BoundaryItem,
  ClearingItem,
  DailyState,
  GardenItem,
  MonthlyReviewItem,
  RhythmState,
  TruthItem,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const asBoolean = (value: unknown): boolean => value === true;
const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const asId = (value: unknown): string => {
  const raw = asString(value).trim();
  return raw || createId();
};

const normalizeDaily = (value: unknown): DailyState => {
  const defaults = defaultDailyState();
  if (!isRecord(value)) return defaults;

  return {
    hijackedBy: asString(value.hijackedBy),
    trueThing: asString(value.trueThing),
    why: asString(value.why),
    smallestStep: asString(value.smallestStep),
    lowPowerVersion: asString(value.lowPowerVersion),
    notReceiving: asString(value.notReceiving) || defaults.notReceiving,
    takenAwayBy: asString(value.takenAwayBy),
    didReturn: asString(value.didReturn),
    tomorrowLess: asString(value.tomorrowLess),
    tomorrowMore: asString(value.tomorrowMore),
  };
};

const normalizeRhythm = (value: unknown): RhythmState => {
  const defaults = defaultRhythmState();
  if (!isRecord(value)) return defaults;

  return {
    greenCanAdvance: asString(value.greenCanAdvance) || defaults.greenCanAdvance,
    yellowOnlyMaintain: asString(value.yellowOnlyMaintain) || defaults.yellowOnlyMaintain,
    redOnlyProtect: asString(value.redOnlyProtect) || defaults.redOnlyProtect,
  };
};

const normalizePreferences = (value: unknown): AppPreferences => {
  const defaults = defaultPreferences();
  if (!isRecord(value)) return defaults;

  return {
    onboardingDismissed: asBoolean(value.onboardingDismissed),
  };
};

const normalizeTruth = (value: unknown): TruthItem | null => {
  if (!isRecord(value)) return null;

  const stage = TRUTH_STAGES.includes(value.stage as TruthItem["stage"])
    ? (value.stage as TruthItem["stage"])
    : "seed";

  return {
    id: asId(value.id),
    name: asString(value.name),
    whyImportant: asString(value.whyImportant),
    stage,
    enoughDefinition: asString(value.enoughDefinition),
    weeklySmallStep: asString(value.weeklySmallStep),
    lowPointMaintenance: asString(value.lowPointMaintenance),
    active: asBoolean(value.active),
  };
};

const normalizeClearing = (value: unknown): ClearingItem | null => {
  if (!isRecord(value)) return null;

  const type = CLEARING_TYPES.includes(value.type as ClearingItem["type"])
    ? (value.type as ClearingItem["type"])
    : "杂事";

  const handling = CLEARING_HANDLINGS.includes(value.handling as ClearingItem["handling"])
    ? (value.handling as ClearingItem["handling"])
    : "限制";

  return {
    id: asId(value.id),
    name: asString(value.name),
    type,
    givesMe: asString(value.givesMe),
    takesFromMe: asString(value.takesFromMe),
    handling,
    note: asString(value.note),
  };
};

const normalizeBoundary = (value: unknown): BoundaryItem | null => {
  if (!isRecord(value)) return null;

  const category = BOUNDARY_CATEGORIES.includes(value.category as BoundaryItem["category"])
    ? (value.category as BoundaryItem["category"])
    : "信息边界";

  return {
    id: asId(value.id),
    category,
    content: asString(value.content),
    trigger: asString(value.trigger),
    response: asString(value.response),
    enabled: asBoolean(value.enabled),
  };
};

const normalizeGardenItem = (value: unknown): GardenItem | null => {
  if (!isRecord(value)) return null;

  const status = GARDEN_STATUSES.includes(value.status as GardenItem["status"])
    ? (value.status as GardenItem["status"])
    : "Seed";

  const linkedTruthId = asString(value.linkedTruthId).trim();

  return {
    id: asId(value.id),
    title: asString(value.title),
    status,
    description: asString(value.description),
    nextStep: asString(value.nextStep),
    ...(linkedTruthId ? { linkedTruthId } : {}),
  };
};

const normalizeMonthlyReview = (value: unknown): MonthlyReviewItem | null => {
  if (!isRecord(value)) return null;

  return {
    id: asId(value.id),
    month: asString(value.month),
    hijackedBy: asString(value.hijackedBy),
    notWorthContinuing: asString(value.notWorthContinuing),
    truthToSeeAgain: asString(value.truthToSeeAgain),
    lessNextMonth: asString(value.lessNextMonth),
    moreNextMonth: asString(value.moreNextMonth),
  };
};

export const normalizeState = (raw: unknown): AppState => {
  const initial = createInitialState();
  if (!isRecord(raw)) return initial;

  return {
    daily: normalizeDaily(raw.daily),
    truths: Array.isArray(raw.truths)
      ? raw.truths.map(normalizeTruth).filter((item): item is TruthItem => item !== null)
      : initial.truths,
    clearings: Array.isArray(raw.clearings)
      ? raw.clearings
          .map(normalizeClearing)
          .filter((item): item is ClearingItem => item !== null)
      : initial.clearings,
    boundaries: Array.isArray(raw.boundaries)
      ? raw.boundaries
          .map(normalizeBoundary)
          .filter((item): item is BoundaryItem => item !== null)
      : initial.boundaries,
    rhythm: normalizeRhythm(raw.rhythm),
    gardenItems: Array.isArray(raw.gardenItems)
      ? raw.gardenItems
          .map(normalizeGardenItem)
          .filter((item): item is GardenItem => item !== null)
      : initial.gardenItems,
    monthlyReviews: Array.isArray(raw.monthlyReviews)
      ? raw.monthlyReviews
          .map(normalizeMonthlyReview)
          .filter((item): item is MonthlyReviewItem => item !== null)
      : initial.monthlyReviews,
    preferences: normalizePreferences(raw.preferences),
  };
};

export const loadStateFromStorage = (): AppState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
};

export const saveStateToStorage = (state: AppState): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

export const exportStateToJson = (state: AppState): string =>
  JSON.stringify(normalizeState(state), null, 2);

export const importStateFromJson = (raw: string): AppState =>
  normalizeState(JSON.parse(raw));

export const resetStoredState = (): AppState => {
  const initial = createInitialState();
  saveStateToStorage(initial);
  return initial;
};

