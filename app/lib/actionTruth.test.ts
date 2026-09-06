import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_FAILURE, actionFailure, NETWORK_FAILURE_LINE } from "./actionTruth.ts";
import type { ActionArea } from "./actionTruth.ts";

const AREAS: ActionArea[] = ["load", "new", "sessions", "open", "finish", "logout", "delete"];

test("每个动作失败都有一句话：不存在按了没反应", () => {
  for (const area of AREAS) {
    const e = actionFailure(area);
    assert.ok(e.message.length > 0, `${area} 不能是空的`);
    assert.ok(e.message.length <= 60, `${area} 的话要短`);
  }
});

test("断网时说的是网络，不是「出了点问题」", () => {
  assert.equal(actionFailure("new", { networkError: true }).message, NETWORK_FAILURE_LINE);
});

test("失败的话不许把责任推给用户，也不许假装做过", () => {
  // Delete must never read as "deleted".
  assert.match(ACTION_FAILURE.delete, /^没有删除成功/);
  assert.doesNotMatch(ACTION_FAILURE.delete, /已经删除|已为你删除|稍后生效/);
  // A failed new session must not imply the current one was cleared.
  assert.match(ACTION_FAILURE.new, /还在/);
});

test("已经有按钮的地方不再放第二个按钮", () => {
  assert.equal(actionFailure("sessions").retryable, true, "列表空着时这里需要再试");
  assert.equal(actionFailure("open").retryable, false, "列表还在原地，按它就行");
  assert.equal(actionFailure("finish").retryable, false, "结束今天的面板还开着");
});
