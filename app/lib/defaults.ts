import type {
  AppPreferences,
  AppState,
  BoundaryCategory,
  BoundaryItem,
  ClearingHandling,
  ClearingType,
  DailyState,
  GardenStatus,
  RhythmState,
  TruthStage,
} from "./types";

export const STORAGE_KEY = "huidaoziji.counterflow.v1";

export const TRUTH_STAGES: TruthStage[] = ["seed", "cultivate", "advance", "pause", "done"];
export const CLEARING_TYPES: ClearingType[] = ["真事", "假事", "杂事", "废事"];
export const CLEARING_HANDLINGS: ClearingHandling[] = ["保留", "限制", "降级", "移除"];
export const BOUNDARY_CATEGORIES: BoundaryCategory[] = ["信息边界", "社交边界", "工作边界", "消费边界", "情绪边界"];
export const GARDEN_STATUSES: GardenStatus[] = ["Seed", "Draft", "WIP", "Pause", "Ship"];

export const defaultDailyState = (): DailyState => ({
  hijackedBy: "",
  trueThing: "",
  why: "",
  smallestStep: "",
  lowPowerVersion: "",
  notReceiving: "",
  takenAwayBy: "",
  didReturn: "",
  tomorrowLess: "",
  tomorrowMore: "",
});

export const defaultRhythmState = (): RhythmState => ({
  greenCanAdvance: "当我状态平稳时，我愿意推进真正重要的那一小步。",
  yellowOnlyMaintain: "状态一般时，只维护基本秩序、回复必要信息、保住真事的连接。",
  redOnlyProtect:
    "不做重大人生判断\n不复盘人生意义\n不拿自己和别人比较\n只保护睡眠、饮食、身体、基本秩序\n真事降级为最低维护",
});

export const defaultPreferences = (): AppPreferences => ({
  onboardingDismissed: false,
});

const createDefaultBoundaries = (): BoundaryItem[] => [
  {
    id: "boundary-default-1",
    category: "信息边界",
    content: "我不在早上第一小时刷信息流。",
    trigger: "起床后手已经摸到手机时",
    response: "先喝水、洗漱，再决定要不要看信息。",
    enabled: true,
  },
  {
    id: "boundary-default-2",
    category: "工作边界",
    content: "我不把别人的紧急，自动变成我的紧急。",
    trigger: "消息语气很急、但并不改变真实优先级时",
    response: "先确认是否真的必须现在处理，再决定回应方式。",
    enabled: true,
  },
  {
    id: "boundary-default-3",
    category: "社交边界",
    content: "我不默认秒回。",
    trigger: "看到消息就想立刻回复时",
    response: "允许自己先完成手上的事，再回复。",
    enabled: true,
  },
  {
    id: "boundary-default-4",
    category: "消费边界",
    content: "我不为了证明自己过得好而消费。",
    trigger: "想通过购买缓解自我怀疑时",
    response: "把想买的东西先放 24 小时，再决定。",
    enabled: true,
  },
];

export const createInitialState = (): AppState => ({
  daily: defaultDailyState(),
  truths: [],
  clearings: [],
  boundaries: createDefaultBoundaries(),
  rhythm: defaultRhythmState(),
  gardenItems: [],
  monthlyReviews: [],
  preferences: defaultPreferences(),
});
