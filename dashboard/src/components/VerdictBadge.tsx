import type { EvalVerdict } from '../types';

const config: Record<EvalVerdict, { label: string; cls: string }> = {
  approve: { label: 'Approved', cls: 'approve' },
  reject: { label: 'Rejected', cls: 'reject' },
  needs_review: { label: 'Needs Review', cls: 'needs_review' },
  error: { label: 'Error', cls: 'reject' },
};

export default function VerdictBadge({ verdict }: { verdict: EvalVerdict }) {
  const c = config[verdict] ?? config.needs_review;
  return (
    <span className={`verdict-badge ${c.cls}`}>
      <span className="verdict-dot" />
      {c.label}
    </span>
  );
}
