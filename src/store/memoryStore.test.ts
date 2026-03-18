import { describe, it, expect, beforeEach } from "vitest";
import type { Hash } from "genlayer-js/types";

// Re-import fresh module per test to reset state
let store: typeof import("./memoryStore.js");

beforeEach(async () => {
  // vitest module cache reset
  const mod = await import("./memoryStore.js");
  store = mod;
});

const fakeHash = ("0x" + "ab".repeat(32)) as Hash;
const fakeAddr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
const fakeResult = { verdict: "approve", score: 85, confidence: 90, reasoning: "ok", rubric_version: "v1", success: true };

describe("memoryStore", () => {
  it("putRecord and getRecord round-trip", () => {
    store.putRecord("job-1", {
      txHash: fakeHash,
      contractAddress: fakeAddr,
      finalized: false,
      result: fakeResult,
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const record = store.getRecord("job-1");
    expect(record).toBeDefined();
    expect(record!.txHash).toBe(fakeHash);
    expect(record!.finalized).toBe(false);
  });

  it("getRecord returns undefined for unknown job", () => {
    expect(store.getRecord("nonexistent")).toBeUndefined();
  });

  it("updateRecord merges partial fields", () => {
    store.putRecord("job-2", {
      txHash: fakeHash,
      contractAddress: fakeAddr,
      finalized: false,
      result: fakeResult,
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    store.updateRecord("job-2", { finalized: true });

    const record = store.getRecord("job-2");
    expect(record!.finalized).toBe(true);
    expect(record!.txHash).toBe(fakeHash);
  });

  it("updateRecord is no-op for unknown job", () => {
    store.updateRecord("ghost", { finalized: true });
    expect(store.getRecord("ghost")).toBeUndefined();
  });
});
