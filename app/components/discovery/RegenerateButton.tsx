'use client';

interface RegenerateButtonProps {
  onRegenerate: () => void;
}

export default function RegenerateButton({ onRegenerate }: RegenerateButtonProps): JSX.Element {
  return (
    <button type="button" className="primaryButton" onClick={onRegenerate}>
      Try a Different Route
    </button>
  );
}
