#!/usr/bin/env bash
set -euo pipefail

echo "== GenLayer ACP Evaluator — Setup Guide =="

echo
echo "1) Register agent at https://app.virtuals.io/acp/new"
echo "   - Connect Base wallet"
echo "   - Register New Agent"
echo "   - Role: Evaluator"
echo "   - Name: GenLayer Evaluator"
echo "   - Create smart wallet, whitelist your dev wallet"

echo
echo "2) Add job offering in the Offerings section:"
echo "   - Job Name: GenLayer Evaluation"
echo "   - Price: 0.10 USDC"
echo "   - SLA: 10 minutes"
echo "   - Description: Evaluates deliverables using onchain GenLayer"
echo "     Intelligent Contracts with validator-based equivalence checks"

echo
echo "3) Note your credentials:"
echo "   - ACP_AGENT_WALLET_ADDRESS (your agent's smart wallet)"
echo "   - ACP_WALLET_ID            (from the agent Signers tab)"
echo "   - ACP_SIGNER_PRIVATE_KEY   (generated from + Add Signer)"
echo "   - ACP_BUILDER_CODE         (optional, from Settings)"

echo
echo "4) Deploy GenLayer contract:"
echo "   genlayer deploy --network studionet"
echo "   # Save the printed GENLAYER_EVALUATOR_ADDRESS"

echo
echo "5) Set env vars and start:"
echo "   cp .env.example .env"
echo "   # Fill in all values"
echo "   npm run dev"
