import { useState, useCallback, useEffect } from 'react';
import type { Job } from './types';
import { fetchJobs } from './api';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import JobPage from './pages/JobPage';

type Route =
  | { page: 'dashboard' }
  | { page: 'about' }
  | { page: 'job'; jobId: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'about') return { page: 'about' };
  if (hash.startsWith('job/')) {
    const jobId = decodeURIComponent(hash.slice(4));
    if (jobId) return { page: 'job', jobId };
  }
  return { page: 'dashboard' };
}

function setHash(path: string) {
  window.history.pushState(null, '', `#/${path}`);
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs().then(({ jobs, isDemo }) => {
      setJobs(jobs);
      setIsDemo(isDemo);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    if (r.page === 'dashboard') setHash('');
    else if (r.page === 'about') setHash('about');
    else setHash(`job/${encodeURIComponent(r.jobId)}`);
  }, []);

  const goHome = useCallback(() => navigate({ page: 'dashboard' }), [navigate]);
  const goAbout = useCallback(() => navigate({ page: 'about' }), [navigate]);
  const goJob = useCallback(
    (job: Job) => navigate({ page: 'job', jobId: job.job_id }),
    [navigate],
  );

  const activeJob =
    route.page === 'job'
      ? jobs.find((j) => j.job_id === route.jobId) ?? null
      : null;

  return (
    <>
      <nav className="nav">
        <button className="nav-brand" onClick={goHome}>
          <img src="/logo.svg" alt="GenLayer" />
          <span>GenLayer ACP Evaluator</span>
        </button>
        <div className="nav-links">
          <button
            className={`nav-link${route.page === 'dashboard' || route.page === 'job' ? ' active' : ''}`}
            onClick={goHome}
          >
            Dashboard
          </button>
          <button
            className={`nav-link${route.page === 'about' ? ' active' : ''}`}
            onClick={goAbout}
          >
            About
          </button>
        </div>
      </nav>
      <main>
        {route.page === 'dashboard' && (
          <Dashboard
            jobs={jobs}
            isDemo={isDemo}
            loading={loading}
            onSelectJob={goJob}
          />
        )}
        {route.page === 'about' && <About />}
        {route.page === 'job' && activeJob && (
          <JobPage job={activeJob} onBack={goHome} />
        )}
        {route.page === 'job' && !activeJob && !loading && (
          <div className="container">
            <div className="empty-state">
              <h3>Job not found</h3>
              <p>
                <button className="back-btn" onClick={goHome}>
                  &larr; Back to evaluations
                </button>
              </p>
            </div>
          </div>
        )}
        {route.page === 'job' && !activeJob && loading && (
          <div className="container">
            <div className="loading">
              <div className="loading-spinner" />
              <p>Loading...</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
