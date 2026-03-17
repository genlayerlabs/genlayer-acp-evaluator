import type { Job } from '../types';
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
          </div>
          <div className="job-requester" title={job.requester}>
            {truncAddr(job.requester)}
          </div>
        </div>
        <VerdictBadge verdict={job.result.verdict} />
      </div>

      <div className="scores-row">
        <ScoreRing value={job.result.score} label="Score" />
        <ScoreRing value={job.result.confidence} label="Confidence" />
      </div>

      <div className="reasoning">{job.result.reasoning}</div>

      <span className="details-toggle">View details &rarr;</span>
    </div>
  );
}
