import {
  ACP_SERVER_URL,
  ACP_TESTNET_SERVER_URL,
  AcpAgent,
  AcpApiClient,
  SseTransport,
  TESTNET_PRIVY_APP_ID,
  PrivyAlchemyEvmProviderAdapter,
  type JobRoomEntry,
  type JobSession,
} from "@virtuals-protocol/acp-node-v2";
import { base, baseSepolia, bscTestnet } from "@account-kit/infra";
import type { Address, Chain } from "viem";
import { deployEvaluation, readResult, waitForFinality } from "../genlayer/evaluator.js";
import { putRecord, updateRecord } from "../store/memoryStore.js";

const DEFAULT_RUBRIC =
  "Evaluate the deliverable against the original task specification. Score quality, completeness, and accuracy.";

const supportedAcpChains = [base, baseSepolia, bscTestnet] as const;
const evaluatedJobs = new Set<string>();

function resolveAcpChain(): Chain {
  const chainId = Number(process.env.ACP_CHAIN_ID ?? base.id);
  const chain = supportedAcpChains.find((candidate) => candidate.id === chainId);

  if (!chain) {
    throw new Error(
      `Unsupported ACP_CHAIN_ID ${chainId}. Supported values: ${supportedAcpChains
        .map((candidate) => candidate.id)
        .join(", ")}`,
    );
  }

  return chain;
}

function resolveAcpServerUrl(chain: Chain) {
  if (process.env.ACP_SERVER_URL) return process.env.ACP_SERVER_URL;
  return chain.id === base.id ? ACP_SERVER_URL : ACP_TESTNET_SERVER_URL;
}

function resolvePrivyAppId(chain: Chain) {
  if (process.env.ACP_PRIVY_APP_ID) return process.env.ACP_PRIVY_APP_ID;
  return chain.id === base.id ? undefined : TESTNET_PRIVY_APP_ID;
}

function contentToText(content: string) {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function findLatestMessage(session: JobSession, contentType: string) {
  return [...session.entries]
    .reverse()
    .find((entry) => entry.kind === "message" && entry.contentType === contentType);
}

function getTaskSpec(session: JobSession) {
  const requirement = findLatestMessage(session, "requirement");
  if (requirement?.kind === "message" && requirement.content) {
    return contentToText(requirement.content);
  }

  return session.job?.description ?? "";
}

function getDeliverable(session: JobSession, entry: JobRoomEntry) {
  if (entry.kind === "system" && entry.event.type === "job.submitted" && entry.event.deliverable) {
    return contentToText(entry.event.deliverable);
  }

  if (session.job?.deliverable) {
    return contentToText(session.job.deliverable);
  }

  const deliverable = findLatestMessage(session, "deliverable");
  if (deliverable?.kind === "message" && deliverable.content) {
    return contentToText(deliverable.content);
  }

  return "";
}

function getJobKey(session: JobSession) {
  return `${session.chainId}-${session.jobId}`;
}

async function evaluateSubmittedJob(session: JobSession, entry: JobRoomEntry) {
  const jobKey = getJobKey(session);
  if (evaluatedJobs.has(jobKey)) return;
  evaluatedJobs.add(jobKey);

  console.log(`[ACP] Evaluation requested for job ${jobKey}`);

  try {
    const taskSpec = getTaskSpec(session);
    const deliverable = getDeliverable(session, entry);

    if (!taskSpec) {
      throw new Error("ACP job is missing a requirement message");
    }

    if (!deliverable) {
      throw new Error("ACP job is missing a deliverable");
    }

    const { txHash, contractAddress, result } = await deployEvaluation({
      jobId: `acp-${jobKey}`,
      taskSpec,
      submission: deliverable,
      rubric: DEFAULT_RUBRIC,
      metadata: {
        rubric_version: "v1",
        acp_chain_id: session.chainId,
        acp_job_id: session.jobId,
        acp_client_address: session.job?.clientAddress,
        acp_provider_address: session.job?.providerAddress,
        acp_evaluator_address: session.job?.evaluatorAddress,
        acp_deliverable_hash:
          entry.kind === "system" && entry.event.type === "job.submitted"
            ? entry.event.deliverableHash
            : undefined,
      },
    });

    putRecord(`acp-${jobKey}`, {
      txHash,
      contractAddress,
      finalized: false,
      result,
      updatedAt: new Date().toISOString(),
    });

    const approved = result.verdict === "approve";
    const reason = txHash;

    if (approved) {
      await session.complete(reason);
    } else {
      await session.reject(reason);
    }

    console.log(
      `[ACP] Job ${jobKey} evaluated: ${approved ? "APPROVED" : "REJECTED"} (score: ${result.score})`,
    );

    void waitForFinality(txHash)
      .then(async () => {
        const refreshed = await readResult(contractAddress);
        updateRecord(`acp-${jobKey}`, { finalized: true, result: refreshed });
      })
      .catch(() => {});
  } catch (err) {
    console.error(`[ACP] Evaluation failed for job ${jobKey}:`, err);
    try {
      await session.reject("evaluation_failed");
    } catch {
      // best effort
    }
  }
}

export async function startAcpListener() {
  const agentWallet = process.env.ACP_AGENT_WALLET_ADDRESS;
  const walletId = process.env.ACP_WALLET_ID;
  const signerPrivateKey = process.env.ACP_SIGNER_PRIVATE_KEY;

  if (!agentWallet || !walletId || !signerPrivateKey) {
    console.log(
      "[ACP] Missing ACP_AGENT_WALLET_ADDRESS, ACP_WALLET_ID, or ACP_SIGNER_PRIVATE_KEY - ACP listener disabled",
    );
    return;
  }

  const chain = resolveAcpChain();
  const serverUrl = resolveAcpServerUrl(chain);
  const privyAppId = resolvePrivyAppId(chain);

  const provider = await PrivyAlchemyEvmProviderAdapter.create({
    walletAddress: agentWallet as Address,
    walletId,
    signerPrivateKey,
    chains: [chain],
    serverUrl,
    privyAppId,
    builderCode: process.env.ACP_BUILDER_CODE,
  });

  const agent = await AcpAgent.create({
    provider,
    api: new AcpApiClient({ serverUrl }),
    transport: new SseTransport({ serverUrl }),
  });

  agent.on("entry", async (session, entry) => {
    if (entry.kind !== "system" || entry.event.type !== "job.submitted") return;
    await evaluateSubmittedJob(session, entry);
  });

  await agent.start();
  console.log(`[ACP] Evaluator agent listening for jobs on chain ${chain.id}...`);
}
