type ExecuteJobResult = {
  deliverable: string | { type: string; value: unknown };
  payableDetail?: {
    tokenAddress: string;
    amount: number;
  };
};

export function validateRequirements(request: any): { valid: boolean; reason?: string } {
  if (!request.jobId) return { valid: false, reason: "Missing jobId" };
  if (!request.taskSpec) return { valid: false, reason: "Missing taskSpec" };
  if (!request.submission) return { valid: false, reason: "Missing submission" };
  if (!request.rubric) return { valid: false, reason: "Missing rubric" };
  return { valid: true };
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const baseUrl = process.env.GENLAYER_EVAL_SERVICE_URL ?? "http://localhost:3000";
  const authToken = process.env.API_AUTH_TOKEN;

  const resp = await fetch(`${baseUrl}/acp/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify({
      jobId: request.jobId,
      taskSpec: request.taskSpec,
      submission: request.submission,
      rubric: request.rubric,
      metadata: {
        rubric_version: request.rubricVersion ?? "v1",
        score_tolerance: request.scoreTolerance ?? 10,
        confidence_tolerance: request.confidenceTolerance ?? 15
      }
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Evaluator service failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();

  return {
    deliverable: {
      type: "genlayer_evaluation",
      value: {
        jobId: request.jobId,
        txHash: data.txHash,
        status: data.finalized ? "finalized" : "provisional",
        result: data.job.result
      }
    }
  };
}
