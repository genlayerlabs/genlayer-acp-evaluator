import { useEffect, useState } from 'react';

function getColor(value: number): string {
  if (value >= 70) return 'var(--approve)';
  if (value >= 40) return 'var(--review)';
  return 'var(--reject)';
}

export default function ScoreRing({
  value,
  label,
  size = 72,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const [animated, setAnimated] = useState(false);
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = animated
    ? circumference - (value / 100) * circumference
    : circumference;

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="score-ring">
      <div
        className="score-ring-inner"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(value)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </svg>
        <span className="score-ring-value" style={{ color: getColor(value) }}>
          {value}
        </span>
      </div>
      <span className="score-ring-label">{label}</span>
    </div>
  );
}
