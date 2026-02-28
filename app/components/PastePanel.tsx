'use client';

import { FormEvent, useMemo, useState } from 'react';

type InputMode = 'paste' | 'letterboxd';

interface PastePanelProps {
  hidden: boolean;
  loading: boolean;
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onSubmitTitles: (titles: string[]) => Promise<void>;
  onSubmitLetterboxd: (url: string) => Promise<void>;
}

function parseTitles(value: string): string[] {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/[;|]/g, '\n')
    .replace(/,\s*(?=[A-Za-z0-9"'(])/g, '\n');

  return Array.from(
    new Set(
      normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
}

export default function PastePanel({
  hidden,
  loading,
  inputMode,
  onModeChange,
  onSubmitTitles,
  onSubmitLetterboxd
}: PastePanelProps): JSX.Element {
  const [pasteValue, setPasteValue] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');

  const parsedTitles = useMemo(() => parseTitles(pasteValue), [pasteValue]);
  const lineCount = useMemo(() => pasteValue.split('\n').filter((line) => line.trim().length > 0).length, [pasteValue]);

  async function handlePasteSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!parsedTitles.length || loading) {
      return;
    }
    await onSubmitTitles(parsedTitles);
  }

  async function handleLetterboxdSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!letterboxdUrl.trim() || loading) {
      return;
    }
    await onSubmitLetterboxd(letterboxdUrl.trim());
  }

  return (
    <section className={`pastePanel ${hidden ? 'hidden' : ''}`}>
      <div className="panelTabs" role="tablist" aria-label="Input modes">
        <button
          type="button"
          className={`panelTab ${inputMode === 'paste' ? 'active' : ''}`}
          role="tab"
          aria-selected={inputMode === 'paste'}
          onClick={() => onModeChange('paste')}
        >
          Paste Titles
        </button>
        <button
          type="button"
          className={`panelTab ${inputMode === 'letterboxd' ? 'active' : ''}`}
          role="tab"
          aria-selected={inputMode === 'letterboxd'}
          onClick={() => onModeChange('letterboxd')}
        >
          Letterboxd URL
        </button>
      </div>

      {inputMode === 'paste' ? (
        <form className="panelBody" onSubmit={handlePasteSubmit}>
          <textarea
            rows={12}
            value={pasteValue}
            onChange={(event) => setPasteValue(event.target.value)}
            className="titleTextarea"
            placeholder={
              'Paste movie titles here, one per line...\\n\\nExample:\\nParasite\\nThe Lighthouse\\nHereditary'
            }
          />
          <div className="panelMeta">
            <span>{pasteValue.length} chars · {lineCount} lines</span>
            <button type="submit" disabled={!parsedTitles.length || loading} className="primaryButton">
              Load {parsedTitles.length} Movies →
            </button>
          </div>
        </form>
      ) : (
        <form className="panelBody" onSubmit={handleLetterboxdSubmit}>
          <input
            type="url"
            value={letterboxdUrl}
            onChange={(event) => setLetterboxdUrl(event.target.value)}
            placeholder="https://letterboxd.com/username/watchlist/"
            className="urlInput"
          />
          <p className="panelHelper">Works with any public watchlist or list</p>
          <div className="panelMeta">
            <span>{letterboxdUrl.length} chars</span>
            <button type="submit" disabled={!letterboxdUrl.trim() || loading} className="primaryButton">
              Import List →
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
