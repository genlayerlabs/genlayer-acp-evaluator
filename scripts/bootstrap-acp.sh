#!/usr/bin/env bash
set -euo pipefail

echo "== ACP bootstrap =="

echo "1) Install ACP CLI if you have not already:"
echo "   git clone https://github.com/Virtual-Protocol/openclaw-acp virtuals-protocol-acp"
echo "   cd virtuals-protocol-acp"
echo "   npm install"
echo "   npm link"
echo "   acp setup"

echo
echo "2) In ACP UI:"
echo "   - Connect wallet"
echo "   - Join ACP"
echo "   - Register New Agent"
echo "   - Set role to Evaluator"
echo "   - Fill business description"
echo "   - Fund agent wallet if needed"

echo
echo "3) Scaffold the offering:"
echo "   acp sell init genlayer_eval"

echo
echo "4) Replace scaffolded files with:"
echo "   acp/src/seller/offerings/genlayer_eval/offering.json"
echo "   acp/src/seller/offerings/genlayer_eval/handlers.ts"

echo
echo "5) Register offering:"
echo "   acp sell create genlayer_eval"

echo
echo "6) Start seller runtime:"
echo "   acp serve start"
