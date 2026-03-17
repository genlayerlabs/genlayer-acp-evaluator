export default function About() {
  return (
    <div className="container">
      <div className="about-hero">
        <img src="/logo.svg" alt="GenLayer" />
        <h1>GenLayer ACP Evaluator</h1>
        <p>
          High-trust evaluation for ACP jobs, powered by onchain GenLayer
          Intelligent Contracts with validator-based equivalence checks.
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">&#9670;</div>
          <h3>Onchain Evaluation</h3>
          <p>
            Every evaluation is stored durably on GenLayer. Results are
            immutable, auditable, and tied to the job by ID. The blockchain is
            the source of truth.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">&#9671;</div>
          <h3>Equivalence Principle</h3>
          <p>
            Leader-validator model ensures evaluation quality. Validators
            independently assess submissions and must agree within configurable
            tolerance bands before consensus is reached.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">&#9650;</div>
          <h3>ACP Integration</h3>
          <p>
            Plugs into the Virtuals Agent Commerce Protocol as a registered
            evaluator agent. Accepts jobs through ACP offerings and returns
            structured, verifiable deliverables.
          </p>
        </div>
      </div>

      <div className="flow-section">
        <h2>How It Works</h2>
        <div className="flow-steps">
          {[
            ['1', 'ACP Job\nReceived'],
            ['2', 'Seller\nRuntime'],
            ['3', 'Express\nService'],
            ['4', 'GenLayer\nContract'],
            ['5', 'Consensus\nReached'],
            ['6', 'Result\nReturned'],
          ].map(([num, label], i) => (
            <div key={num} className="flow-step-wrapper">
              {i > 0 && <span className="flow-arrow">&rarr;</span>}
              <div className="flow-step">
                <div className="step-icon">{num}</div>
                <span className="step-label">
                  {label!.split('\n').map((l, j) => (
                    <span key={j}>
                      {l}
                      {j === 0 && <br />}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tech-section">
        <h2>Tech Stack</h2>
        <div className="tech-grid">
          {[
            ['GenLayer', 'AI-native blockchain with Intelligent Contracts'],
            ['ACP', 'Virtuals Agent Commerce Protocol on Base'],
            ['genlayer-js', 'TypeScript SDK for GenLayer interactions'],
            ['Express', 'Node.js service bridging ACP and GenLayer'],
          ].map(([name, desc]) => (
            <div key={name} className="tech-item">
              <span className="tech-name">{name}</span>
              <span className="tech-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
