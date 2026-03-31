import type { Job } from '../types';
import { getExplorerUrl } from '../api';
import ScoreRing from './ScoreRing';
import VerdictBadge from './VerdictBadge';

function truncAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function JobCard({
  job,
  index,
  onClick,
}: {
  job: Job;
  index: number;
  onClick: () => void;
}) {
  const explorerUrl = getExplorerUrl(job);

  return (
    <div
      className="job-card job-card-clickable"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={onClick}
    >
      <div className="job-card-header">
        <div>
          <div className="job-id">
            {job.job_id}
            <span className="rubric-tag">{job.result.rubric_version}</span>
            {job.status && (
              <span className={`status-tag ${job.status === 'FINALIZED' ? 'finalized' : job.status === 'ACCEPTED' ? 'accepted' : 'pending'}`}>
                {job.status}
              </span>
            )}
          </div>
          <div className="job-requester" title={job.requester}>
            {truncAddr(job.requester)}
            {job.network && <span className="network-tag">{job.network}</span>}
          </div>
        </div>
        <VerdictBadge verdict={job.result.verdict} />
      </div>

      <div className="scores-row">
        <ScoreRing value={job.result.score} label="Score" />
        <ScoreRing value={job.result.confidence} label="Confidence" />
      </div>

      <div className="reasoning">{job.result.reasoning}</div>

      <div className="card-footer">
        <span className="details-toggle">View details &rarr;</span>
        {explorerUrl && (
          <a
            className="explorer-link"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            View on Explorer &#x2197;
          </a>
        )}
      </div>
    </div>
  );
}
