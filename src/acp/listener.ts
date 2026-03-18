import AcpClient, {
  AcpContractClientV2,
  type AcpJob,
} from "@virtuals-protocol/acp-node";
import { submitJob, getJob, waitForFinality } from "../genlayer/evaluator.js";
import { putRecord, updateRecord } from "../store/memoryStore.js";

export async function startAcpListener() {
  const privateKey = process.env.ACP_WALLET_PRIVATE_KEY;
  const entityId = process.env.ACP_ENTITY_ID;
  const agentWallet = process.env.ACP_AGENT_WALLET_ADDRESS;

  if (!privateKey || !entityId || !agentWallet) {
    console.log("[ACP] Missing ACP_WALLET_PRIVATE_KEY, ACP_ENTITY_ID, or ACP_AGENT_WALLET_ADDRESS — ACP listener disabled");
    return;
  }

  const acpContractClient = await AcpContractClientV2.build(
    privateKey as `0x${string}`,
    Number(entityId),
    agentWallet as `0x${string}`,
  );

  const client = new (AcpClient as any)({
    acpContractClient,
    onEvaluate: async (job: AcpJob) => {
      console.log(`[ACP] Evaluation requested for job ${job.id}`);

      try {
        const deliverable = job.memos
          .filter((m: any) => m.content)
          .map((m: any) => typeof m.content === "string" ? m.content : JSON.stringify(m.content))
          .pop() ?? "";

        const jobId = `acp-${job.id}`;
        const taskSpec = (job as any).requirement ?? "";

        const result = await submitJob({
          jobId,
          taskSpec,
          submission: deliverable,
          rubric: "Evaluate the deliverable against the original task specification. Score quality, completeness, and accuracy.",
          metadata: { rubric_version: "v1", acp_job_id: String(job.id) },
        });

        putRecord(jobId, {
          txHash: result.txHash,
          finalized: false,
          acceptedReceipt: result.acceptedReceipt,
          latestJob: result.job,
          updatedAt: new Date().toISOString(),
        });

        const approved = result.job.result.verdict === "approve";
        const reasoning = result.job.result.reasoning;

        await job.evaluate(
          approved,
          `[Score: ${result.job.result.score}/100, Confidence: ${result.job.result.confidence}/100] ${reasoning}`,
        );

        console.log(`[ACP] Job ${job.id} evaluated: ${approved ? "APPROVED" : "REJECTED"} (score: ${result.job.result.score})`);

        void waitForFinality(result.txHash)
          .then(async () => {
            const refreshed = await getJob(jobId);
            updateRecord(jobId, { finalized: true, latestJob: refreshed });
          })
          .catch(() => {});
      } catch (err) {
        console.error(`[ACP] Evaluation failed for job ${job.id}:`, err);
        try {
          await job.evaluate(false, `Evaluation failed: ${err instanceof Error ? err.message : "unknown error"}`);
        } catch {
          // best effort
        }
      }
    },
  });

  await client.init();
  console.log("[ACP] Evaluator agent listening for jobs...");
}
