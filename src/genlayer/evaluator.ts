import { glClient } from "./client.js";
import { TransactionStatus } from "genlayer-js/types";
import type { StoredJob, SubmitEvalRequest } from "../types.js";

const CONTRACT_ADDRESS = process.env
  .GENLAYER_EVALUATOR_ADDRESS as `0x${string}`;

if (!CONTRACT_ADDRESS) {
  throw new Error("Missing GENLAYER_EVALUATOR_ADDRESS");
}

export async function submitJob(input: SubmitEvalRequest) {
  const txHash = await glClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "submit_job",
    args: [
      input.jobId,
      input.taskSpec,
      input.submission,
      input.rubric,
      JSON.stringify(input.metadata ?? {})
    ],
    value: 0n
  });

  const acceptedReceipt = await glClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 180,
    interval: 5000
  });

  const job = (await glClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_job",
    args: [input.jobId]
  })) as StoredJob;

  return {
    txHash,
    acceptedReceipt,
    job
  };
}

export async function getJob(jobId: string) {
  return (await glClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_job",
    args: [jobId]
  })) as StoredJob;
}

export async function waitForFinality(txHash: `0x${string}`) {
  return glClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 3600,
    interval: 3000
  });
}

export async function appealTransaction(txHash: `0x${string}`) {
  const appealTxHash = await glClient.appealTransaction({
    txId: txHash
  });

  const receipt = await glClient.waitForTransactionReceipt({
    hash: appealTxHash,
    status: TransactionStatus.ACCEPTED,
    retries: 180,
    interval: 5000
  });

  return { appealTxHash, receipt };
}
