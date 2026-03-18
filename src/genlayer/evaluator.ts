import { readFileSync } from "fs";
import path from "path";
import { glClient } from "./client.js";
import { TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import type { SubmitEvalRequest } from "../types.js";

const contractCode = new Uint8Array(
  readFileSync(path.resolve(import.meta.dirname, "../../../contracts/acp_evaluator.py")),
);

let consensusInitialized = false;

async function ensureConsensus() {
  if (!consensusInitialized) {
    await glClient.initializeConsensusSmartContract();
    consensusInitialized = true;
  }
}

export type EvalDeployResult = {
  txHash: Hash;
  contractAddress: `0x${string}`;
  result: {
    verdict: string;
    score: number;
    confidence: number;
    reasoning: string;
    rubric_version: string;
    success: boolean;
  };
};

export async function deployEvaluation(input: SubmitEvalRequest): Promise<EvalDeployResult> {
  await ensureConsensus();

  const txHash = await glClient.deployContract({
    code: contractCode,
    args: [
      input.taskSpec,
      input.submission,
      input.rubric,
      JSON.stringify(input.metadata ?? {}),
    ],
  }) as Hash;

  const receipt = await glClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 180,
    interval: 5000,
  });

  const contractAddress =
    (receipt as any).data?.contract_address ??
    (receipt as any).txDataDecoded?.contractAddress;

  if (!contractAddress) {
    throw new Error("Failed to extract contract address from deploy receipt");
  }

  const result = await glClient.readContract({
    address: contractAddress,
    functionName: "get_result",
    args: [],
  }) as EvalDeployResult["result"];

  return { txHash, contractAddress, result };
}

export async function readResult(contractAddress: `0x${string}`) {
  return glClient.readContract({
    address: contractAddress,
    functionName: "get_result",
    args: [],
  }) as Promise<EvalDeployResult["result"]>;
}

export async function readInput(contractAddress: `0x${string}`) {
  return glClient.readContract({
    address: contractAddress,
    functionName: "get_input",
    args: [],
  });
}

export async function waitForFinality(txHash: Hash) {
  return glClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 3600,
    interval: 3000,
  });
}

export async function appealTransaction(txHash: Hash) {
  const appealTxHash = await glClient.appealTransaction({
    txId: txHash,
  });

  const receipt = await glClient.waitForTransactionReceipt({
    hash: appealTxHash as Hash,
    status: TransactionStatus.ACCEPTED,
    retries: 360,
    interval: 5000,
  });

  return { appealTxHash, receipt };
}
