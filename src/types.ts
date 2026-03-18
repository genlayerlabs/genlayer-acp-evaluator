import type { Hash } from "genlayer-js/types";

export type EvalVerdict = "approve" | "reject" | "needs_review" | "error";

export type EvalResult = {
  verdict: string;
  score: number;
  confidence: number;
  reasoning: string;
  rubric_version: string;
  success: boolean;
};

export type SubmitEvalRequest = {
  jobId: string;
  taskSpec: string;
  submission: string;
  rubric: string;
  metadata?: {
    rubric_version?: string;
    score_tolerance?: number;
    confidence_tolerance?: number;
    [key: string]: unknown;
  };
};

export type SubmitEvalResponse = {
  txHash: Hash;
  contractAddress: `0x${string}`;
  finalized: boolean;
  result: EvalResult;
};
