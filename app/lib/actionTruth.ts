// One restrained place for "that did not happen" on the conversation surface.
//
// Every action a person can press has exactly one line here, so no failure can
// end as a button that simply did nothing. The lines say two things and nothing
// else: what is still safe, and what to do next. Sending a message has its own
// bar (see useReturnSession) because a turn can genuinely sit unfinished; this
// table covers everything else.

export type ActionArea =
  | "load"
  | "new"
  | "sessions"
  | "open"
  | "finish"
  | "logout"
  | "delete";

export interface ActionError {
  area: ActionArea;
  message: string;
  /** Whether this notice may offer "try again"; some failures own a button already. */
  retryable: boolean;
}

export const ACTION_FAILURE: Record<ActionArea, string> = {
  load: "没能载入你的对话。你之前说的话还在服务器上，刷新或再试一次都在。",
  new: "没能开始新的对话。手上这一段还在原地，没有被清掉。",
  sessions: "没能载入过去的对话列表。现在这一段不受影响。",
  open: "没能打开这段过去的对话。它没有被删除。",
  finish: "今天还没有真正结束。上面那两个按钮再按一次就行。",
  logout: "没有退出成功。这台浏览器还停在你的空间里，请再试一次。",
  delete: "没有删除成功。数据还在服务器上——我们没有偷偷替你删。",
};

// Some failures happen where their own controls still are (finishing the day
// keeps its panel open, history keeps its list). Those get a line, not a second
// button; the rest may offer "try again" right here.
const RETRYABLE: Record<ActionArea, boolean> = {
  load: true,
  new: true,
  sessions: true,
  open: false,
  finish: false,
  logout: true,
  delete: true,
};

export const NETWORK_FAILURE_LINE = "没有连上服务器。检查网络后再试一次。";

/** Every area always yields a line: an empty message would be a silent failure. */
export function actionFailure(area: ActionArea, result?: { networkError?: boolean }): ActionError {
  return {
    area,
    message: result?.networkError ? NETWORK_FAILURE_LINE : ACTION_FAILURE[area],
    retryable: RETRYABLE[area],
  };
}
