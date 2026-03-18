import { readFileSync } from "fs";
import path from "path";
import type {
  TransactionHash,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<GenLayerChain>) {
  const contractPath = path.resolve(
    process.cwd(),
    "contracts/acp_evaluator.py",
  );

  console.log(`Reading contract from ${contractPath}`);
  const contractCode = new Uint8Array(readFileSync(contractPath));

  console.log("Initializing consensus smart contract...");
  await client.initializeConsensusSmartContract();

  console.log("Deploying AcpEvaluator...");
  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
  });
  console.log(`Deploy tx: ${txHash}`);

  console.log("Waiting for ACCEPTED status...");
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  const address =
    (client.chain as GenLayerChain).id === localnet.id
      ? (receipt as any).data?.contract_address
      : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

  console.log("");
  console.log("=".repeat(60));
  console.log(`Contract deployed at: ${address}`);
  console.log("=".repeat(60));
  console.log("");
  console.log("Set this in your .env:");
  console.log(`GENLAYER_EVALUATOR_ADDRESS=${address}`);
}
