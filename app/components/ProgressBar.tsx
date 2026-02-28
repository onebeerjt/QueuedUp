interface ProgressBarProps {
  current: number;
  total: number;
  visible: boolean;
}

export default function ProgressBar({ current, total, visible }: ProgressBarProps): JSX.Element {
  const safeTotal = total > 0 ? total : 1;
  const percent = Math.max(0, Math.min(100, Math.round((current / safeTotal) * 100)));

  return (
    <div className={`progressWrap ${visible ? 'visible' : ''}`}>
      <div className="progressTrack" aria-hidden="true">
        <div className="progressFill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progressLabel">Fetching {Math.min(current, total)} of {total} movies...</p>
    </div>
  );
}
