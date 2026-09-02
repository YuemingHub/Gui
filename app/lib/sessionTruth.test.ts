import assert from "node:assert/strict";
import test from "node:test";
import {
  DELETE_FAILED_MESSAGE,
  backendHasPendingTurn,
  decideDeleteAll,
  decideNetworkRetry,
} from "./sessionTruth.ts";

test("delete-all 200 deleted:true resets auth and claims deleted", () => {
  const d = decideDeleteAll({
    ok: true,
    status: 200,
    data: { deleted: true },
    networkError: false,
  });
  assert.equal(d.resetAuth, true);
  assert.equal(d.claimedDeleted, true);
  assert.equal(d.error, null);
});

test("delete-all 500 does not reset auth or claim deleted", () => {
  const d = decideDeleteAll({
    ok: false,
    status: 500,
    data: { error: "internal" },
    networkError: false,
  });
  assert.equal(d.resetAuth, false);
  assert.equal(d.claimedDeleted, false);
  assert.equal(d.error, DELETE_FAILED_MESSAGE);
});

test("delete-all network error does not reset auth or claim deleted", () => {
  const d = decideDeleteAll({
    ok: false,
    status: 0,
    data: null,
    networkError: true,
  });
  assert.equal(d.resetAuth, false);
  assert.equal(d.claimedDeleted, false);
  assert.equal(d.error, DELETE_FAILED_MESSAGE);
});

test("delete-all 401 is not treated as successful deletion", () => {
  const d = decideDeleteAll({
    ok: false,
    status: 401,
    data: { error: "unauthorized" },
    networkError: false,
  });
  assert.equal(d.resetAuth, false);
  assert.equal(d.claimedDeleted, false);
  assert.equal(d.error, DELETE_FAILED_MESSAGE);
});

test("delete-all 200 without deleted:true does not claim success", () => {
  const d = decideDeleteAll({
    ok: true,
    status: 200,
    data: {},
    networkError: false,
  });
  assert.equal(d.resetAuth, false);
  assert.equal(d.claimedDeleted, false);
  assert.equal(d.error, DELETE_FAILED_MESSAGE);
});

test("pending turn is the last user message matching the original text", () => {
  assert.equal(
    backendHasPendingTurn(
      [
        { role: "assistant", content: "opening" },
        { role: "user", content: "这句话应该留下来" },
      ],
      "这句话应该留下来",
    ),
    true,
  );
  assert.equal(
    backendHasPendingTurn(
      [
        { role: "user", content: "这句话应该留下来" },
        { role: "assistant", content: "我在" },
      ],
      "这句话应该留下来",
    ),
    false,
  );
  assert.equal(backendHasPendingTurn([], "这句话应该留下来"), false);
});

test("network retry uses retry:true when backend already has the pending turn", () => {
  const d = decideNetworkRetry(
    {
      ok: true,
      networkError: false,
      data: { messages: [{ role: "user", content: "原文" }] },
    },
    "原文",
  );
  assert.deepEqual(d, { mode: "retry" });
});

test("network retry resends original text when backend does not have the turn", () => {
  const d = decideNetworkRetry(
    {
      ok: true,
      networkError: false,
      data: { messages: [{ role: "assistant", content: "opening" }] },
    },
    "原文",
  );
  assert.deepEqual(d, { mode: "resend", text: "原文" });
});

test("network retry waits when delivery state cannot be read", () => {
  assert.deepEqual(
    decideNetworkRetry({ ok: false, networkError: true, data: null }, "原文"),
    { mode: "wait" },
  );
  assert.deepEqual(decideNetworkRetry(null, "原文"), { mode: "wait" });
  assert.deepEqual(
    decideNetworkRetry({ ok: true, networkError: false, data: { messages: [] } }, null),
    { mode: "wait" },
  );
});
