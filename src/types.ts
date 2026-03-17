export type EvalVerdict = "approve" | "reject" | "needs_review";

export type EvalResult = {
  verdict: EvalVerdict;
  score: number;
  confidence: number;
  reasoning: string;
  rubric_version: string;
};

export type StoredJob = {
  job_id: string;
  requester: string;
  task_spec: string;
  submission: string;
  rubric: string;
  metadata_json: string;
  result: EvalResult;
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
  txHash: `0x${string}`;
  finalized: boolean;
  job: StoredJob;
};
