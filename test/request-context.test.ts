import { describe, expect, it } from "vitest";
import {
  getRequestId,
  runWithRequestContext,
  sanitizeRequestId,
} from "../src/context/request-context";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("request context", () => {
  it("зберігає requestId через await і не змішує паралельні контексти", async () => {
    const seen = await Promise.all([
      runWithRequestContext("a", async () => {
        await sleep(20);
        return getRequestId();
      }),
      runWithRequestContext("b", async () => {
        await sleep(5);
        return getRequestId();
      }),
    ]);
    expect(seen).toEqual(["a", "b"]);
  });

  it("поза run() сховище порожнє", () => {
    expect(getRequestId()).toBeUndefined();
  });
});

describe("sanitizeRequestId", () => {
  it("залишає валідний id", () => {
    expect(sanitizeRequestId("client-id_42.v1")).toBe("client-id_42.v1");
  });

  it("відкидає перенос рядка, unicode і занадто довгий id", () => {
    expect(sanitizeRequestId("ok\nbad")).toMatch(UUID);
    expect(sanitizeRequestId("id-привіт")).toMatch(UUID);
    expect(sanitizeRequestId("a".repeat(129))).toMatch(UUID);
    expect(sanitizeRequestId("  ")).toMatch(UUID);
    expect(sanitizeRequestId(undefined)).toMatch(UUID);
  });
});
