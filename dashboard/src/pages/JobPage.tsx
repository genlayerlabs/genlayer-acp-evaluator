import type { Job } from '../types';
import ScoreRing from '../components/ScoreRing';
import VerdictBadge from '../components/VerdictBadge';

export default function JobPage({
  job,
  onBack,
}: {
  job: Job;
  onBack: () => void;
}) {
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
          </h1>
          <div className="job-page-requester">
            <span className="detail-label-inline">Requester</span>
            <span className="job-page-address">{job.requester}</span>
          </div>
        </div>
        <VerdictBadge verdict={job.result.verdict} />
      </div>

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
