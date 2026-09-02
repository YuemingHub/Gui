// 本地工具 persistence used to save every person's private writings under one
// browser-global key, so this is where the isolation rule is proved against a
// fake localStorage: state follows the participant, and the pre-identity blob
// can be taken over exactly once by the first known person.

import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "./defaults.ts";
import { createLocalSpaceScope } from "./localSpaceScope.ts";
import type { AppState } from "./types.ts";

const LEGACY_KEY = "huidaoziji.counterflow.v1";
const ALICE = "p-alice";
const BOB = "p-bob";
const ALICE_KEY = `${LEGACY_KEY}.${ALICE}`;
const BOB_KEY = `${LEGACY_KEY}.${BOB}`;

let failWrites = false;
const store = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string): string | null => {
    const value = store.get(key);
    return value === undefined ? null : value;
  },
  setItem: (key: string, value: string): void => {
    if (failWrites) throw new Error("QuotaExceededError");
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
};

function scope() {
  failWrites = false;
  store.clear();
  return createLocalSpaceScope({
    storage: localStorageStub,
    legacyKey: LEGACY_KEY,
    normalize: (raw) => raw as AppState,
    empty: createInitialState,
  });
}

/** What a person leaves behind after writing in 本地工具: a journal line + an entry. */
function writings(text: string): AppState {
  const initial = createInitialState();
  return {
    ...initial,
    daily: { ...initial.daily, trueThing: text },
    gardenItems: [
      { id: "garden-1", title: text, status: "Seed", description: "", nextStep: "" },
    ],
  };
}

test("阿明在本地工具写下的内容，换成小满进来时一条也看不到", () => {
  const s = scope();
  assert.equal(s.save(ALICE, writings("只有阿明知道的秘密")), true);

  const bobState = s.load(BOB);

  assert.deepEqual(bobState, createInitialState());
  assert.equal(JSON.stringify(bobState).includes("只有阿明知道的秘密"), false);
  assert.equal(store.has(ALICE_KEY), true, "阿明的那一份要留在他自己的钥匙下");
  assert.equal(store.has(BOB_KEY), false, "小满的钥匙里什么都没写过");
});

test("旧的全局那一份只被第一个已知参与者认领一次，第二个人拿不到它", () => {
  const s = scope();
  const legacy = JSON.stringify(writings("Founder 在旧版本里写的话"));
  store.set(LEGACY_KEY, legacy);

  const first = s.load(ALICE);

  assert.equal(first.daily.trueThing, "Founder 在旧版本里写的话");
  assert.equal(store.get(ALICE_KEY), legacy, "认领是非破坏性的整份搬迁");
  assert.equal(store.has(LEGACY_KEY), false, "搬完就要去掉全局那一份，否则下一个人还会读到");

  assert.deepEqual(s.load(BOB), createInitialState());
});

test("认领时新钥匙写不进去，就不删旧的全局那一份", () => {
  const s = scope();
  const legacy = JSON.stringify(writings("唯一的一份旧内容"));
  store.set(LEGACY_KEY, legacy);
  failWrites = true;

  assert.deepEqual(s.load(ALICE), createInitialState());

  assert.equal(store.get(LEGACY_KEY), legacy, "没成功落进个人钥匙之前不能删");
  assert.equal(store.has(ALICE_KEY), false);
});

test("同一个人退出再登录，他自己的本地内容还在", () => {
  const s = scope();
  s.save(ALICE, writings("阿明今天早上的一句话"));

  // 退出后身份未知：既读不到任何人的内容，也不动任何人的钥匙。
  assert.deepEqual(s.load(""), createInitialState());
  assert.equal(s.save("", writings("退出后的写入")), false);

  const again = s.load(ALICE);

  assert.equal(again.daily.trueThing, "阿明今天早上的一句话");
  assert.equal(again.gardenItems[0]?.title, "阿明今天早上的一句话");
});

test("参与者未知时不做任何迁移，全局那一份原样留着", () => {
  const s = scope();
  const legacy = JSON.stringify(writings("还没有人认领的旧内容"));
  store.set(LEGACY_KEY, legacy);

  assert.deepEqual(s.load(""), createInitialState());
  assert.equal(s.save("", createInitialState()), false);

  assert.equal(store.get(LEGACY_KEY), legacy, "没认出这个人之前，不搬也不删");
  assert.deepEqual([...store.keys()], [LEGACY_KEY], "身份未知时不许开出任何新钥匙");
});
