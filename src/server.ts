import "dotenv/config";
import express from "express";
import { submitEvalSchema } from "./utils/validate.js";
import { submitJob, getJob, waitForFinality, appealTransaction } from "./genlayer/evaluator.js";
import { getRecord, putRecord, updateRecord } from "./store/memoryStore.js";

const app = express();
app.use(express.json());

function authOk(req: express.Request) {
  const token = process.env.API_AUTH_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

app.post("/acp/evaluate", async (req, res) => {
  try {
    if (!authOk(req)) return res.status(401).json({ error: "unauthorized" });

    const parsed = submitEvalSchema.parse(req.body);

    const { txHash, acceptedReceipt, job } = await submitJob(parsed);

    putRecord(parsed.jobId, {
      txHash,
      finalized: false,
      acceptedReceipt,
      latestJob: job,
      updatedAt: new Date().toISOString()
    });

    void waitForFinality(txHash)
      .then(async (finalizedReceipt) => {
        const refreshedJob = await getJob(parsed.jobId);
        updateRecord(parsed.jobId, {
          finalized: true,
          finalizedReceipt,
          latestJob: refreshedJob
        });
      })
      .catch(() => {});

    return res.json({
      txHash,
      finalized: false,
      job
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: err instanceof Error ? err.message : "unknown_error"
    });
  }
});

app.get("/evaluations/:jobId", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const record = getRecord(jobId);
    const job = await getJob(jobId);

    return res.json({
      jobId,
      txHash: record?.txHash ?? null,
      finalized: record?.finalized ?? false,
      job
    });
  } catch (err) {
    console.error(err);
    return res.status(404).json({
      error: err instanceof Error ? err.message : "not_found"
    });
  }
});

app.post("/evaluations/:jobId/appeal", async (req, res) => {
  try {
    if (!authOk(req)) return res.status(401).json({ error: "unauthorized" });

    const record = getRecord(req.params.jobId);
    if (!record) return res.status(404).json({ error: "unknown_job" });

    const result = await appealTransaction(record.txHash);

    return res.json({
      jobId: req.params.jobId,
      txHash: record.txHash,
      appealTxHash: result.appealTxHash
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: err instanceof Error ? err.message : "appeal_failed"
    });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`GenLayer ACP evaluator listening on :${port}`);
});
