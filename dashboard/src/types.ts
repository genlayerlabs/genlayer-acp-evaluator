export type EvalVerdict = 'approve' | 'reject' | 'needs_review';

export type EvalResult = {
  verdict: EvalVerdict;
  score: number;
  confidence: number;
  reasoning: string;
  rubric_version: string;
};

export type Job = {
  job_id: string;
  requester: string;
  task_spec: string;
  submission: string;
  rubric: string;
  metadata_json: string;
  result: EvalResult;
};
