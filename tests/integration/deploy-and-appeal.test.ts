/**
 * Integration tests for the GenLayer ACP Evaluator.
 * Run against Studio or testnet Bradbury with real LLM consensus.
 *
 * Usage:
 *   cp .env.example .env  # fill in GENLAYER_PRIVATE_KEY and GENLAYER_CHAIN
 *   npx vitest run tests/integration/ --timeout 300000
 *
 * These tests are slow (real consensus) and cost gas. Do not run in CI.
 */

import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { createClient } from "genlayer-js";
import { privateKeyToAccount } from "viem/accounts";
import { TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";

const PRIVATE_KEY = process.env.GENLAYER_PRIVATE_KEY as `0x${string}`;
const CHAIN_NAME = process.env.GENLAYER_CHAIN ?? "studionet";

const chain =
  CHAIN_NAME === "localnet" ? localnet
    : CHAIN_NAME === "studionet" ? studionet
      : testnetBradbury;

const contractCode = new Uint8Array(
  readFileSync(path.resolve(__dirname, "../../contracts/acp_evaluator.py")),
);

function getClient() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  return createClient({ chain, account });
}

describe("GenLayer ACP Evaluator — Integration", () => {
  let client: ReturnType<typeof getClient>;

  beforeAll(async () => {
    if (!PRIVATE_KEY) throw new Error("Set GENLAYER_PRIVATE_KEY in .env");
    client = getClient();
    await client.initializeConsensusSmartContract();
  });

  describe("deploy evaluation", () => {
    it("deploys a contract and stores evaluation result", async () => {
      const txHash = await client.deployContract({
        code: contractCode,
        args: [
          "Write a haiku about blockchain",
          "Blocks link in a chain\nConsensus across the net\nTrust without a king",
          "Must be a valid haiku (5-7-5 syllables). Score creativity and accuracy.",
          JSON.stringify({ rubric_version: "v1" }),
        ],
      }) as Hash;

      console.log(`Deploy tx: ${txHash}`);

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.ACCEPTED,
        retries: 200,
        interval: 5000,
      });

      const contractAddress =
        (receipt as any).data?.contract_address ??
        (receipt as any).txDataDecoded?.contractAddress;

      console.log(`Contract: ${contractAddress}`);
      expect(contractAddress).toBeTruthy();

      const result = await client.readContract({
        address: contractAddress,
        functionName: "get_result",
        args: [],
      }) as any;

      console.log(`Result:`, result);
      expect(result.success).toBe(true);
      expect(result.verdict).toMatch(/^(approve|reject|needs_review)$/);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reasoning).toBeTruthy();
      expect(result.rubric_version).toBe("v1");
    }, 120_000);

    it("stores input data and evaluates a clearly bad submission", async () => {
      const taskSpec = "Write a Python function that sorts a list of integers using merge sort. Include docstring, type hints, and handle edge cases (empty list, single element).";
      const submission = "def sort(x): return x";
      const rubric = "Correctness (40%): Must implement merge sort, not just return input. Documentation (20%): Must have docstring and type hints. Edge cases (20%): Must handle empty/single element. Code quality (20%): Clean, readable code. Minimum 70 for approval.";
      const metadata = JSON.stringify({ rubric_version: "v2", score_tolerance: 15 });

      const txHash = await client.deployContract({
        code: contractCode,
        args: [taskSpec, submission, rubric, metadata],
      }) as Hash;

      console.log(`[test2] Deploy tx: ${txHash}`);

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.ACCEPTED,
        retries: 200,
        interval: 5000,
      });

      const status = String((receipt as any).status);
      console.log(`[test2] Status: ${status} (5=ACCEPTED, 6=UNDETERMINED)`);

      const contractAddress =
        (receipt as any).data?.contract_address ??
        (receipt as any).txDataDecoded?.contractAddress;

      console.log(`[test2] Contract: ${contractAddress}`);
      expect(contractAddress).toBeTruthy();

      if (status === "6" || status === "UNDETERMINED") {
        console.log(`[test2] UNDETERMINED — skipping readContract`);
        return;
      }

      const input = await client.readContract({
        address: contractAddress,
        functionName: "get_input",
        args: [],
      }) as any;

      console.log(`[test2] Input:`, input);
      expect(input.task_spec).toBe(taskSpec);
      expect(input.submission).toBe(submission);
      expect(input.rubric).toBe(rubric);

      const result = await client.readContract({
        address: contractAddress,
        functionName: "get_result",
        args: [],
      }) as any;

      console.log(`[test2] Result:`, result);
      // "def sort(x): return x" should be clearly rejected by all validators
      expect(result.verdict).toBe("reject");
      expect(result.score).toBeLessThan(40);
    }, 300_000);
  });

  describe("appeal flow", () => {
    it("can appeal an accepted evaluation on Bradbury", async () => {
      // Deploy with a clearly rejectable submission
      const txHash = await client.deployContract({
        code: contractCode,
        args: [
          "Write a comprehensive REST API with authentication, rate limiting, and database integration using Node.js and Express.",
          "console.log('hello')",
          "Functionality (40%): Must implement REST endpoints, auth, rate limiting, DB. Code quality (30%): Clean architecture, error handling. Documentation (30%): API docs, README. Minimum 70 for approval.",
          JSON.stringify({ rubric_version: "v1" }),
        ],
      }) as Hash;

      console.log(`[appeal] Deploy tx: ${txHash}`);

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.ACCEPTED,
        retries: 200,
        interval: 5000,
      });

      const deployStatus = String((receipt as any).status);
      console.log(`[appeal] Deploy status: ${deployStatus}`);

      if (deployStatus === "6" || deployStatus === "UNDETERMINED") {
        console.log(`[appeal] Deploy UNDETERMINED — cannot appeal, skipping`);
        return;
      }

      const contractAddress =
        (receipt as any).data?.contract_address ??
        (receipt as any).txDataDecoded?.contractAddress;

      console.log(`[appeal] Contract: ${contractAddress}`);

      const resultBefore = await client.readContract({
        address: contractAddress,
        functionName: "get_result",
        args: [],
      }) as any;

      console.log(`[appeal] Result before appeal:`, resultBefore);

      // Submit appeal — auto-queries bond on chains with FeeManager, 0 otherwise
      console.log(`[appeal] Submitting appeal...`);
      const appealResult = await client.appealTransaction({
        txId: txHash,
      });
      console.log(`[appeal] appealTransaction returned:`, appealResult);

      // Wait for the appeal to resolve — poll for FINALIZED since ACCEPTED
      // returns immediately on already-decided txs
      console.log(`[appeal] Waiting for appeal consensus...`);
      const finalReceipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
        interval: 5000,
      });

      const finalStatus = String((finalReceipt as any).status);
      console.log(`[appeal] Final status: ${finalStatus}`);

      if (finalStatus !== "6" && finalStatus !== "UNDETERMINED") {
        const resultAfter = await client.readContract({
          address: contractAddress,
          functionName: "get_result",
          args: [],
        }) as any;

        console.log(`[appeal] Result after appeal:`, resultAfter);
        expect(resultAfter.success).toBe(true);
        expect(resultAfter.verdict).toMatch(/^(approve|reject|needs_review)$/);
      } else {
        console.log(`[appeal] Ended UNDETERMINED after appeal`);
      }
    }, 300_000);
  });
});
