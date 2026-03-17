import "dotenv/config";
import { createClient } from "genlayer-js";
import { privateKeyToAccount } from "viem/accounts";
import { testnetBradbury, studionet, localnet } from "genlayer-js/chains";

const privateKey = process.env.GENLAYER_PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
  throw new Error("Missing GENLAYER_PRIVATE_KEY");
}

const account = privateKeyToAccount(privateKey);

const chainName = process.env.GENLAYER_CHAIN ?? "testnetBradbury";
const chain =
  chainName === "localnet"
    ? localnet
    : chainName === "studionet"
      ? studionet
      : testnetBradbury;

export const glClient = createClient({
  chain,
  account
});
