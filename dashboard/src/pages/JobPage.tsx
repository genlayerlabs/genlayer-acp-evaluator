import type { Job } from '../types';
import { getExplorerUrl } from '../api';
import ScoreRing from '../components/ScoreRing';
import VerdictBadge from '../components/VerdictBadge';

function truncHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
}

export default function JobPage({
  job,
  onBack,
}: {
  job: Job;
  onBack: () => void;
}) {
  const explorerUrl = getExplorerUrl(job);

  return (
    <div className="container">
      <div className="job-page-nav">
        <button className="back-btn" onClick={onBack}>
          &larr; All Evaluations
        </button>
      </div>

      <div className="job-page-header">
        <div>
          <h1 className="job-page-id">
            {job.job_id}
            <span className="rubric-tag">{job.result.rubric_version}</span>
            {job.status && (
              <span className={`status-tag ${job.status === 'FINALIZED' ? 'finalized' : job.status === 'ACCEPTED' ? 'accepted' : 'pending'}`}>
                {job.status}
              </span>
            )}
          </h1>
          <div className="job-page-requester">
            <span className="detail-label-inline">Requester</span>
            <span className="job-page-address">{job.requester}</span>
          </div>
        </div>
        <VerdictBadge verdict={job.result.verdict} />
      </div>

      {(job.tx_hash || job.contract_address) && (
        <div className="onchain-info">
          {job.tx_hash && (
            <div className="onchain-row">
              <span className="detail-label-inline">Transaction</span>
              {explorerUrl ? (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="onchain-link">
                  {truncHash(job.tx_hash)} &#x2197;
                </a>
              ) : (
                <span className="job-page-address">{truncHash(job.tx_hash)}</span>
              )}
            </div>
          )}
          {job.contract_address && (
            <div className="onchain-row">
              <span className="detail-label-inline">Contract</span>
              <span className="job-page-address">{truncHash(job.contract_address)}</span>
            </div>
          )}
          {job.network && (
            <div className="onchain-row">
              <span className="detail-label-inline">Network</span>
              <span className="network-tag">{job.network}</span>
            </div>
          )}
          {job.appeal_round !== undefined && job.appeal_round > 0 && (
            <div className="onchain-row">
              <span className="detail-label-inline">Appeal Round</span>
              <span className="appeal-round-badge">{job.appeal_round}</span>
            </div>
          )}
        </div>
      )}

      <div className="job-page-scores">
        <ScoreRing value={job.result.score} label="Score" size={96} />
        <ScoreRing value={job.result.confidence} label="Confidence" size={96} />
      </div>

      <div className="job-page-section">
        <h2>Reasoning</h2>
        <div className="reasoning">{job.result.reasoning}</div>
      </div>

      <div className="job-page-grid">
        <div className="job-page-section">
          <h2>Task Specification</h2>
          <div className="detail-block">
            <div className="detail-text">{job.task_spec}</div>
          </div>
        </div>

        <div className="job-page-section">
          <h2>Submission</h2>
          <div className="detail-block">
            <div className="detail-text">{job.submission}</div>
          </div>
        </div>
      </div>

      <div className="job-page-section">
        <h2>Rubric</h2>
        <div className="detail-block">
          <div className="detail-text">{job.rubric}</div>
        </div>
      </div>

      {job.metadata_json && job.metadata_json !== '{}' && (
        <div className="job-page-section">
          <h2>Metadata</h2>
          <div className="detail-block">
            <pre className="detail-text mono">{job.metadata_json}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
