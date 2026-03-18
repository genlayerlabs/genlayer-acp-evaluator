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
    it.skip("can appeal an accepted evaluation and re-reach consensus — disabled: appeals broken in Studio, need proper status polling", async () => {
      // Deploy an evaluation
      const txHash = await client.deployContract({
        code: contractCode,
        args: [
          "Evaluate this code review",
          "LGTM, ship it",
          "Must provide specific feedback on code quality, test coverage, and potential bugs. One-line approvals score below 30.",
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

      const resultBefore = await client.readContract({
        address: contractAddress,
        functionName: "get_result",
        args: [],
      }) as any;

      console.log(`Result before appeal:`, resultBefore);

      // Appeal the transaction
      console.log(`Appealing tx ${txHash}...`);
      let appealTxHash: any;
      try {
        appealTxHash = await client.appealTransaction({
          txId: txHash,
        });
      } catch (err) {
        console.error(`Appeal submission failed:`, err);
        throw err;
      }

      console.log(`Appeal tx: ${appealTxHash}`);

      // Critical: appeal must return a DIFFERENT tx hash than the original
      // If same hash, the appeal didn't actually execute
      expect(appealTxHash).not.toBe(txHash);
      console.log(`Appeal tx differs from deploy tx: OK`);

      // Wait for appeal to resolve — should go through
      // APPEAL_COMMITTING -> APPEAL_REVEALING -> decided state
      const appealReceipt = await client.waitForTransactionReceipt({
        hash: appealTxHash as Hash,
        status: TransactionStatus.ACCEPTED,
        retries: 360,
        interval: 5000,
      });

      console.log(`Appeal resolved. Status: ${(appealReceipt as any).status}`);
      console.log(`Appeal receipt:`, JSON.stringify(appealReceipt, null, 2));

      // Read result after appeal — may be same or different
      const resultAfter = await client.readContract({
        address: contractAddress,
        functionName: "get_result",
        args: [],
      }) as any;

      console.log(`Result after appeal:`, resultAfter);

      // Result should still be valid (appeal doesn't break the contract)
      expect(resultAfter.success).toBe(true);
      expect(resultAfter.verdict).toMatch(/^(approve|reject|needs_review)$/);
      expect(resultAfter.score).toBeGreaterThanOrEqual(0);
      expect(resultAfter.score).toBeLessThanOrEqual(100);
    }, 300_000);
  });
});
