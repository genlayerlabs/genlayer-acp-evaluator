import type { Job } from './types';

const API_BASE = '';

const MOCK_JOBS: Job[] = [
  {
    job_id: 'bradbury-haiku',
    requester: '0xA8920A32ed2D1b9b6c537Ec5220cbcF408Ce5730',
    task_spec: 'Write a haiku about blockchain. Must be a valid 5-7-5 syllable haiku that captures core blockchain concepts.',
    submission: 'Blocks link in a chain\nConsensus across the net\nTrust without a king',
    rubric: 'Must be a valid haiku (5-7-5 syllables). Score creativity and accuracy.',
    metadata_json: '{"rubric_version":"v1"}',
    result: { verdict: 'approve', score: 85, confidence: 90, reasoning: 'Submission is a valid 5-7-5 syllable haiku that accurately and creatively captures core blockchain concepts (blocks, chain, consensus, decentralized trust).', rubric_version: 'v1' },
    tx_hash: '0x4e2328d21e99e5b1be56587995a4e57640201852dd20afcc55a3e6b971246d1a',
    contract_address: '0xDe7A0D68028191A478fBA7e96F702f9C2C09F850',
    network: 'bradbury',
    status: 'FINALIZED',
  },
  {
    job_id: 'bradbury-bad-sort',
    requester: '0xA8920A32ed2D1b9b6c537Ec5220cbcF408Ce5730',
    task_spec: 'Write a Python function that sorts a list of integers using merge sort. Include docstring, type hints, and handle edge cases (empty list, single element).',
    submission: 'def sort(x): return x',
    rubric: 'Correctness (40%): Must implement merge sort, not just return input. Documentation (20%): Must have docstring and type hints. Edge cases (20%): Must handle empty/single element. Code quality (20%): Clean, readable code. Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v2","score_tolerance":15}',
    result: { verdict: 'reject', score: 0, confidence: 100, reasoning: 'Submission returns input unchanged — does not implement merge sort or any sorting algorithm. No docstring, no type hints, no edge case handling. Fails all rubric criteria.', rubric_version: 'v2' },
    tx_hash: '0x6feb068f9b77d964b00487176ed9e247d85c8c82601748c6b4c44072ffa6225e',
    contract_address: '0x7956dAf1F10b3cC2fA065E2564D7652ce52C9ACc',
    network: 'bradbury',
    status: 'FINALIZED',
  },
  {
    job_id: 'bradbury-rest-api',
    requester: '0xA8920A32ed2D1b9b6c537Ec5220cbcF408Ce5730',
    task_spec: 'Write a comprehensive REST API with authentication, rate limiting, and database integration using Node.js and Express.',
    submission: 'console.log("hello")',
    rubric: 'Functionality (40%): Must implement REST endpoints, auth, rate limiting, DB. Code quality (30%): Clean architecture, error handling. Documentation (30%): API docs, README. Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1"}',
    result: { verdict: 'reject', score: 5, confidence: 100, reasoning: 'Submission is a single console.log statement. It lacks all required components: REST API, authentication, rate limiting, and any documentation. It fails all rubric categories.', rubric_version: 'v1' },
    tx_hash: '0xcf68d9a3a04b491fca335b739ae857aacd7e46e11810000921573fd6d5f84de9',
    contract_address: '0x968939682b29C1BC9e66b1Cc1ef61eDd62bE6421',
    network: 'bradbury',
    status: 'APPEAL_COMMITTING',
    appeal_round: 3,
  },
  {
    job_id: 'bradbury-code-review',
    requester: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    task_spec: 'Evaluate this code review. Must provide specific feedback on code quality, test coverage, and potential bugs. One-line approvals score below 30.',
    submission: 'LGTM, ship it',
    rubric: 'Must provide specific feedback on code quality, test coverage, and potential bugs. One-line approvals score below 30.',
    metadata_json: '{"rubric_version":"v1"}',
    result: { verdict: 'reject', score: 0, confidence: 100, reasoning: 'The submission is a one-line approval (\"LGTM, ship it\") that provides no specific feedback on code quality, test coverage, or potential bugs. The rubric explicitly states that one-line approvals score below 30. Fails all evaluation criteria.', rubric_version: 'v1' },
    tx_hash: '0x54409f3b54755bf00cc76286b4d8ea7dc728363b4e8f50de70cc64a4997b098a',
    contract_address: '0x968939682b29C1BC9e66b1Cc1ef61eDd62bE6421',
    network: 'bradbury',
    status: 'FINALIZED',
    appeal_round: 1,
  },
  {
    job_id: 'bradbury-security-audit',
    requester: '0xA8920A32ed2D1b9b6c537Ec5220cbcF408Ce5730',
    task_spec: 'Audit a Solidity smart contract for security vulnerabilities. Identify reentrancy risks, integer overflow/underflow, access control issues, and gas optimization opportunities.',
    submission: 'Security Audit Report\n\n1. Critical: Reentrancy vulnerability in withdraw() — state update after external call\n2. High: Missing access control on setFee() — any address can modify protocol fees\n3. Medium: Unchecked return value on token transfer\n4. Low: Gas optimization — cache storage reads in loops\n\nRecommendations provided for each finding with code examples.',
    rubric: 'Accuracy of findings (40%), Severity classification (20%), Remediation quality (25%), Report clarity (15%). Minimum 70 for approval.',
    metadata_json: '{"rubric_version":"v1","score_tolerance":8}',
    result: { verdict: 'approve', score: 82, confidence: 85, reasoning: 'Solid audit identifying key vulnerabilities with correct severity ratings. Reentrancy and access control findings are accurate with good remediation steps. Could improve coverage of front-running and flash loan vectors.', rubric_version: 'v1' },
    tx_hash: '0x4e2328d21e99e5b1be56587995a4e57640201852dd20afcc55a3e6b971246d1a',
    contract_address: '0xDe7A0D68028191A478fBA7e96F702f9C2C09F850',
    network: 'bradbury',
    status: 'ACCEPTED',
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

export function getExplorerUrl(job: Job): string | null {
  if (!job.tx_hash) return null;
  if (job.network === 'bradbury') return `https://explorer-bradbury.genlayer.com/tx/${job.tx_hash}`;
  if (job.network === 'studionet') return `https://explorer-studio.genlayer.com/transactions/${job.tx_hash}`;
  return null;
}
