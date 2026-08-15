import "dotenv/config";
import path from "path";
import express from "express";
import { submitEvalSchema } from "./utils/validate.js";
import { deployEvaluation, readResult, waitForFinality, appealTransaction } from "./genlayer/evaluator.js";
import { getAllRecords, getRecord, putRecord, updateRecord } from "./store/memoryStore.js";
import { startAcpListener } from "./acp/listener.js";

const app = express();
app.use(express.json());

const dashboardPath = path.resolve(import.meta.dirname, "../../dashboard/dist");
app.use(express.static(dashboardPath));

function authOk(req: express.Request) {
  const token = process.env.API_AUTH_TOKEN;
  // Security fix: Deny access if the token is not configured.
  if (!token) return false;
  return req.headers.authorization === `Bearer ${token}`;
}

app.post("/acp/evaluate", async (req, res) => {
  try {
    if (!authOk(req)) return res.status(401).json({ error: "unauthorized" });

    const parsed = submitEvalSchema.parse(req.body);
    const { txHash, contractAddress, result } = await deployEvaluation(parsed);

    putRecord(parsed.jobId, {
      txHash,
      contractAddress,
      finalized: false,
      result,
      updatedAt: new Date().toISOString(),
    });

    void waitForFinality(txHash)
      .then(async () => {
        const refreshed = await readResult(contractAddress);
        updateRecord(parsed.jobId, { finalized: true, result: refreshed });
      })
      .catch((err) => {
        // Error is not swallowed; it is logged and the record is marked as 'finality_unknown'.
        console.error(`Finality check failed for job ${parsed.jobId}, txHash ${txHash}:`, err);
        updateRecord(parsed.jobId, { finalized: false, result: "finality_unknown" });
      });

    return res.json({ txHash, contractAddress, finalized: false, result });
  } catch (err) {
    console.error("[POST /acp/evaluate] Error:", err);
    // Sensitive error details are not leaked to the client; a stable error code is returned.
    return res.status(400).json({ error: "evaluation_failed" });
  }
});

app.get("/evaluations", (_req, res) => {
  const records = getAllRecords();
  return res.json({
    jobs: records.map((r) => ({
      jobId: r.jobId,
      txHash: r.txHash,
      contractAddress: r.contractAddress,
      finalized: r.finalized,
      result: r.result,
    })),
    count: records.length,
  });
});

app.get("/evaluations/:jobId", async (req, res) => {
  try {
    const record = getRecord(req.params.jobId);
    if (!record) return res.status(404).json({ error: "not_found" });

    const result = await readResult(record.contractAddress);
    return res.json({
      jobId: req.params.jobId,
      txHash: record.txHash,
      contractAddress: record.contractAddress,
      finalized: record.finalized,
      result,
    });
  } catch (err) {
    console.error(`[GET /evaluations/${req.params.jobId}] Error:`, err);
    return res.status(404).json({ error: "not_found" });
  }
});

app.post("/evaluations/:jobId/appeal", async (req, res) => {
  try {
    if (!authOk(req)) return res.status(401).json({ error: "unauthorized" });

    const record = getRecord(req.params.jobId);
    if (!record) return res.status(404).json({ error: "unknown_job" });

    const { appealTxHash } = await appealTransaction(record.txHash);

    return res.json({
      jobId: req.params.jobId,
      txHash: record.txHash,
      appealTxHash,
      contractAddress: record.contractAddress,
    });
  } catch (err) {
    console.error(`[POST /evaluations/${req.params.jobId}/appeal] Error:`, err);
    return res.status(400).json({ error: "appeal_failed" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(dashboardPath, "index.html"), (err) => {
    if (err) res.status(404).json({ error: "not_found" });
  });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, async () => {
  console.log(`GenLayer ACP evaluator listening on :${port}`);
  await startAcpListener();
});