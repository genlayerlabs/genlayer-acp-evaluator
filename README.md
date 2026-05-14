# GenLayer ACP Evaluator

Onchain AI evaluation for [Virtuals ACP](https://app.virtuals.io/acp) jobs. Every evaluation runs through GenLayer's multi-LLM consensus — independent validators re-evaluate deliverables and must agree within configurable tolerance bands before a verdict is accepted. No single-model bias. Verifiable, immutable results stored on-chain.

## Why this exists

The evaluation logic lives in a GenLayer Intelligent Contract — code deployed onchain that cannot be altered after deployment. When a job comes in, GenLayer validators independently re-execute the evaluation using different LLMs on different infrastructure run by different operators. The verdict is the result of network consensus, not any single party's decision.

This means:

- **Tamper-proof**: The evaluation logic is onchain. No one — including the operator — can override a verdict after deployment.
- **Independently verified**: Multiple validators run the same evaluation with different models. They must agree within tolerance bands before a result is accepted.
- **Fully auditable**: Every evaluation, every score, every validator vote is stored onchain and verifiable by anyone.

With self-appeal, it goes further: the evaluator pays to challenge its own result, inviting even more validators to verify. An evaluator that is economically incentivized to prove itself wrong.

## Evaluation tiers

GenLayer's appeal mechanism enables tiered trust levels. Each appeal round brings in more validators, exponentially increasing confidence — and cost.

| Tier | Strategy | Validators | Time | Price | Use case |
|------|----------|-----------|------|-------|----------|
| **Quick** | Return on ACCEPTED | ~5 | ~2 min | $0.10 | Low-stakes, speed matters |
| **Standard** | ACCEPTED + 1 self-appeal | ~15 | ~10 min | ~$0.30 | Good confidence for most jobs |
| **Adversarial** | Keep appealing until finalized | up to 1000 | ~40 min | $1-10+ | High-value, maximum trust |

### How self-appeal works

The evaluator can *proactively appeal its own result* to force additional validator rounds. This is unique — the evaluator pays to try to prove itself wrong:

- **Failed appeal** (validators agree with original verdict) → verdict gets *stronger*, appeal window shrinks. Cost: appeal fee.
- **Successful appeal** (validators disagree) → verdict was wrong, caught before returning to buyer. Cost: appeal fee, but prevented a bad evaluation.

Each appeal round roughly doubles the validator count. The cost grows exponentially, but so does certainty. A buyer picks their trust level, and the price reflects actual consensus resources consumed — not arbitrary markup.

**v1 ships with the Quick tier.** Standard and Adversarial tiers are protocol-ready (the contract and appeal mechanism already exist) and will be added as separate offerings.

## Architecture

```
ACP v2 SSE → job.submitted entry
  → Express service deploys a fresh GenLayer contract
  → Constructor runs LLM evaluation during deployment
  → Leader evaluates + validators re-evaluate (equivalence principle)
  → Consensus reached → result stored immutably at contract address
  → session.complete(txHash) / session.reject(txHash) → returned to ACP
  → Dashboard shows result at /#/job/<id>
```

Each evaluation deploys its own contract — one contract, one evaluation, one address. No shared state, no queue contention. If an appeal is filed on one evaluation, it doesn't affect any other.

Single container serves everything: Express API, ACP v2 SSE listener, and the dashboard static build.

## How the contract works

The GenLayer Intelligent Contract (`contracts/acp_evaluator.py`) runs the entire evaluation in the constructor at deploy time:

1. Receives task spec, submission, rubric, and metadata as constructor arguments
2. **Leader** generates an evaluation via LLM (verdict, score 0-100, confidence 0-100, reasoning)
3. **Validators** independently generate their own evaluation
4. Validators accept the leader's result only if:
   - Same verdict band (approve ≥70, needs_review ≥40, reject <40)
   - Score within configurable tolerance (default ±10)
   - Confidence within configurable tolerance (default ±15)
5. Result stored as contract state, readable via `get_result()`
6. Constructor never reverts — on failure, stores `verdict: "error"` with the error message

The contract is immutable after deployment. No write methods, no admin functions, no way to alter the verdict.

## Setup

### Prerequisites

- Node 20+
- Python 3.12+
- GenLayer environment (Studio / testnet)
- Registered ACP agent at https://app.virtuals.io/acp/new (Role: Evaluator)

### 1. Register on ACP

At https://app.virtuals.io/acp/new:
- Role: **Evaluator**
- Add offering: name, price ($0.10), SLA (10 min)
- Note your Agent Wallet Address, Wallet ID, and Signer Private Key

### 2. Configure and run

```bash
npm install
cp .env.example .env
# Fill in: GENLAYER_PRIVATE_KEY,
#          ACP_AGENT_WALLET_ADDRESS, ACP_WALLET_ID, ACP_SIGNER_PRIVATE_KEY
npm run dev
```

The service starts Express on `:3000` (API + dashboard) and connects to ACP via the v2 SSE stream.

### 3. Deploy with Docker

```bash
docker build -t genlayer-acp-evaluator .
# Push to registry, deploy with env vars
```

## Testing

```bash
# Contract lint
genvm-lint check contracts/acp_evaluator.py

# Contract tests (direct mode, in-memory)
gltest tests/direct/ -v -s

# TypeScript tests
npm test
```

## Dashboard

Served from the same Express process. In development:

```bash
cd dashboard && npm install && npm run dev
```

Pages:
- `/#/` — evaluation list with stats, score rings, verdict badges
- `/#/job/<id>` — full job detail (task spec, submission, rubric, reasoning)
- `/#/about` — how it works, architecture, tech stack

## Tech stack

- **GenLayer** — AI-native blockchain with multi-LLM consensus
- **Virtuals ACP** — Agent Commerce Protocol (`@virtuals-protocol/acp-node-v2`)
- **genlayer-js** — TypeScript SDK for GenLayer
- **Express** — API + static dashboard server
- **React + Vite** — dashboard frontend
