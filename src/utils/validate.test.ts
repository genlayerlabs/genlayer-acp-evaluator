import { describe, it, expect } from "vitest";
import { submitEvalSchema } from "./validate.js";

describe("submitEvalSchema", () => {
  const valid = {
    jobId: "job-1",
    taskSpec: "Write a poem",
    submission: "Roses are red...",
    rubric: "Must rhyme"
  };

  it("accepts valid input without metadata", () => {
    expect(submitEvalSchema.parse(valid)).toEqual(valid);
  });

  it("accepts valid input with metadata", () => {
    const input = {
      ...valid,
      metadata: {
        rubric_version: "v2",
        score_tolerance: 10,
        confidence_tolerance: 15
      }
    };
    expect(submitEvalSchema.parse(input)).toEqual(input);
  });

  it("rejects empty jobId", () => {
    expect(() => submitEvalSchema.parse({ ...valid, jobId: "" })).toThrow();
  });

  it("rejects missing taskSpec", () => {
    const { taskSpec, ...rest } = valid;
    expect(() => submitEvalSchema.parse(rest)).toThrow();
  });

  it("rejects missing submission", () => {
    const { submission, ...rest } = valid;
    expect(() => submitEvalSchema.parse(rest)).toThrow();
  });

  it("rejects missing rubric", () => {
    const { rubric, ...rest } = valid;
    expect(() => submitEvalSchema.parse(rest)).toThrow();
  });

  it("rejects score_tolerance > 100", () => {
    expect(() =>
      submitEvalSchema.parse({
        ...valid,
        metadata: { score_tolerance: 101 }
      })
    ).toThrow();
  });

  it("allows extra metadata fields via passthrough", () => {
    const input = {
      ...valid,
      metadata: { custom_field: "hello" }
    };
    const parsed = submitEvalSchema.parse(input);
    expect((parsed.metadata as any).custom_field).toBe("hello");
  });
});
