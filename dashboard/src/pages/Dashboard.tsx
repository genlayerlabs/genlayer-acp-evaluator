import type { Job } from '../types';
import JobCard from '../components/JobCard';

export default function Dashboard({
  jobs,
  isDemo,
  loading,
  onSelectJob,
}: {
  jobs: Job[];
  isDemo: boolean;
  loading: boolean;
  onSelectJob: (job: Job) => void;
}) {
  const approved = jobs.filter((j) => j.result.verdict === 'approve').length;
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + j.result.score, 0) / jobs.length)
    : 0;
  const avgConf = jobs.length
    ? Math.round(
        jobs.reduce((s, j) => s + j.result.confidence, 0) / jobs.length,
      )
    : 0;

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading evaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Evaluations</h1>
        <p>Onchain evaluation results from GenLayer Intelligent Contracts</p>
      </div>

      {isDemo && !jobs.length && (
        <div className="demo-banner">
          Connect to the evaluator service for live results.
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Total Jobs</div>
          <div className="value">{jobs.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Approval Rate</div>
          <div className="value accent">
            {jobs.length ? Math.round((approved / jobs.length) * 100) : 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Score</div>
          <div className="value">{avgScore}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Confidence</div>
          <div className="value">{avgConf}</div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <h3>No evaluations yet</h3>
          <p>Submit jobs through the ACP offering to see results here.</p>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map((job, i) => (
            <JobCard
              key={job.job_id}
              job={job}
              index={i}
              onClick={() => onSelectJob(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
