export type DeleteApiResult = {
  ok: boolean;
  status: number;
  data: { deleted?: boolean } | null;
  networkError: boolean;
};

export type StateApiResult = {
  ok: boolean;
  networkError: boolean;
  data: { messages?: Array<{ role?: string; content?: string }> } | null;
};

export const DELETE_FAILED_MESSAGE = "删除没有全部完成。部分数据可能已经删除，你仍可以重试完成删除。";

export function decideDeleteAll(result: DeleteApiResult): {
  resetAuth: boolean;
  claimedDeleted: boolean;
  error: string | null;
} {
  if (result.ok && result.status === 200 && result.data?.deleted === true) {
    return { resetAuth: true, claimedDeleted: true, error: null };
  }
  return {
    resetAuth: false,
    claimedDeleted: false,
    error: DELETE_FAILED_MESSAGE,
  };
}

export function backendHasPendingTurn(
  messages: Array<{ role?: string; content?: string }> | null | undefined,
  pendingText: string | null,
): boolean {
  if (!pendingText) return false;
  const list = messages || [];
  const last = list[list.length - 1];
  return Boolean(last && last.role === "user" && last.content === pendingText);
}

export function decideNetworkRetry(
  stateResult: StateApiResult | null,
  pendingText: string | null,
): { mode: "retry" } | { mode: "resend"; text: string } | { mode: "wait" } {
  if (!pendingText) return { mode: "wait" };
  if (!stateResult || stateResult.networkError || !stateResult.ok) {
    return { mode: "wait" };
  }
  if (backendHasPendingTurn(stateResult.data?.messages, pendingText)) {
    return { mode: "retry" };
  }
  return { mode: "resend", text: pendingText };
}
