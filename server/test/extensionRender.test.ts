import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeToolContent } from "../src/extensionRender.ts";

describe("normalizeToolContent", () => {
  test("undefined returns empty array", () => {
    assert.deepEqual(normalizeToolContent(undefined), []);
  });

  test("empty string returns empty array", () => {
    assert.deepEqual(normalizeToolContent(""), []);
  });

  test("non-empty string wraps in text block", () => {
    assert.deepEqual(normalizeToolContent("hello"), [{ type: "text", text: "hello" }]);
  });

  test("passes through ToolContentBlock[] as-is", () => {
    const blocks = [{ type: "text", text: "hello" }, { type: "image", data: "base64...", mimeType: "image/png" }];
    assert.deepEqual(normalizeToolContent(blocks), blocks);
  });

  test("passes through empty array", () => {
    assert.deepEqual(normalizeToolContent([]), []);
  });
});
