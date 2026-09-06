import assert from "node:assert/strict";
import test from "node:test";
import { isPublicSeo, publicOrigin } from "./site.ts";

const KEY = "NEXT_PUBLIC_SITE_ORIGIN";

function withOrigin(value: string | undefined, fn: () => void) {
  const previous = process.env[KEY];
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env[KEY];
    else process.env[KEY] = previous;
  }
}

test("没有配置公开域名时，这个 build 不声称自己是某个网站", () => {
  withOrigin(undefined, () => {
    assert.equal(publicOrigin(), "");
    assert.equal(isPublicSeo(), false);
  });
});

test("写错的、相对的、没有协议的域名都不算公开来源", () => {
  for (const value of ["/gui", "ymai.fun", "https://", "self.example.com/path", "javascript:alert(1)"]) {
    withOrigin(value, () => {
      assert.equal(publicOrigin(), "", `${value} 不该被当成 origin`);
    });
  }
});

test("真实来源才算，并且去掉尾斜杠", () => {
  withOrigin("https://self.example.com/", () => {
    assert.equal(publicOrigin(), "https://self.example.com");
    assert.equal(isPublicSeo(), true);
  });
});
