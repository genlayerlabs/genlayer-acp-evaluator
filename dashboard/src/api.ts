import type { Job } from './types';

const API_BASE = '/api';

const MOCK_JOBS: Job[] = [
  {
    job_id: 'eval-7f3a9c',
    requester: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD08',
    task_spec: 'Write a technical blog post about zero-knowledge proofs covering fundamentals, use cases, and implementation challenges for a developer audience.',
    submission: 'Zero-Knowledge Proofs: A Developer\'s Deep Dive\n\nZero-knowledge proofs (ZKPs) are cryptographic methods allowing one party to prove knowledge of a value without revealing it. This post covers zk-SNARKs, zk-STARKs, and practical implementation patterns...',
    rubric: 'Technical accuracy (40%), Completeness (25%), Code examples (20%), Clarity (15%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1","score_tolerance":10}',
    result: { verdict: 'approve', score: 87, confidence: 92, reasoning: 'Strong technical content with comprehensive ZKP coverage. Well-structured code examples in Rust and Solidity. Minor gaps in recursive proof discussion.', rubric_version: 'v1' },
  },
  {
    job_id: 'eval-2b8e41',
    requester: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    task_spec: 'Create a Python REST API for a todo application with CRUD endpoints, authentication, and proper error handling.',
    submission: 'from flask import Flask\napp = Flask(__name__)\ntodos = []\n@app.route("/todos")\ndef get_todos():\n    return todos',
    rubric: 'Functionality (35%), Error handling (25%), Auth implementation (25%), Code quality (15%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1"}',
    result: { verdict: 'reject', score: 28, confidence: 95, reasoning: 'Submission is a minimal Flask stub with no authentication, no error handling, no CRUD operations beyond a basic GET, and no data persistence. Does not meet any rubric criteria at a satisfactory level.', rubric_version: 'v1' },
  },
  {
    job_id: 'eval-9d4f0e',
    requester: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
    task_spec: 'Design a database schema for a multi-tenant SaaS application with organizations, users, roles, and permissions.',
    submission: 'CREATE TABLE organizations (id UUID PRIMARY KEY, name VARCHAR(255), plan VARCHAR(50));\nCREATE TABLE users (id UUID PRIMARY KEY, org_id UUID REFERENCES organizations(id), email VARCHAR(255) UNIQUE, role VARCHAR(50));\nCREATE TABLE permissions (id UUID PRIMARY KEY, role VARCHAR(50), resource VARCHAR(100), action VARCHAR(50));',
    rubric: 'Schema design (30%), Multi-tenancy approach (25%), Security considerations (25%), Scalability (20%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v2","score_tolerance":15}',
    result: { verdict: 'needs_review', score: 58, confidence: 71, reasoning: 'Basic schema covers core entities but lacks row-level security, proper indexing strategy, and audit trails. Multi-tenancy via org_id foreign key is functional but simplistic. Permission model needs refinement for complex RBAC.', rubric_version: 'v2' },
  },
  {
    job_id: 'eval-4c7b23',
    requester: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
    task_spec: 'Implement a React component for a real-time cryptocurrency price ticker with WebSocket updates and sparkline charts.',
    submission: 'A full React component with WebSocket connection management, price formatting, 24h change indicators, and SVG sparkline rendering with responsive design...',
    rubric: 'Functionality (30%), Real-time handling (25%), UI/UX quality (25%), Performance (20%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1","confidence_tolerance":20}',
    result: { verdict: 'approve', score: 91, confidence: 88, reasoning: 'Excellent implementation with proper WebSocket lifecycle management, efficient re-renders using useMemo, clean sparkline SVG generation, and polished UI with smooth transitions.', rubric_version: 'v1' },
  },
  {
    job_id: 'eval-1a5d87',
    requester: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    task_spec: 'Write comprehensive unit tests for a payment processing module that handles Stripe webhooks, refunds, and subscription management.',
    submission: 'import pytest\nfrom payment_processor import PaymentProcessor\n\ndef test_webhook_received():\n    processor = PaymentProcessor()\n    result = processor.handle_webhook({"type": "payment_intent.succeeded"})\n    assert result is True',
    rubric: 'Test coverage (35%), Edge cases (25%), Mock strategy (20%), Test organization (20%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1"}',
    result: { verdict: 'reject', score: 22, confidence: 94, reasoning: 'Only one trivial test provided. No coverage of refund flows, subscription lifecycle, webhook signature verification, idempotency handling, or error scenarios. Mock strategy is absent.', rubric_version: 'v1' },
  },
  {
    job_id: 'eval-6e2f19',
    requester: '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
    task_spec: 'Audit a Solidity smart contract for security vulnerabilities. Identify reentrancy risks, integer overflow/underflow, access control issues, and gas optimization opportunities.',
    submission: 'Security Audit Report\n\n1. Critical: Reentrancy vulnerability in withdraw()\n2. High: Missing access control on setFee()\n3. Medium: Unchecked return value on token transfer\n4. Low: Gas optimization — cache storage reads in loops\n\nRecommendations provided for each finding...',
    rubric: 'Accuracy of findings (40%), Severity classification (20%), Remediation quality (25%), Report clarity (15%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1","score_tolerance":8}',
    result: { verdict: 'approve', score: 82, confidence: 85, reasoning: 'Solid audit identifying key vulnerabilities with correct severity ratings. Reentrancy and access control findings are accurate with good remediation steps. Could improve coverage of front-running and flash loan vectors.', rubric_version: 'v1' },
  },
];

export async function fetchJobs(): Promise<{ jobs: Job[]; isDemo: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/evaluations`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const jobs: Job[] = (data.jobs ?? [])
      .map((r: { job?: Job }) => r.job)
      .filter(Boolean);
    if (jobs.length === 0) throw new Error('empty');
    return { jobs, isDemo: false };
  } catch {
    return { jobs: MOCK_JOBS, isDemo: true };
  }
}
