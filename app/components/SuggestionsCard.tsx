'use client';

import { useState } from 'react';

const EMAIL = 'xKold7@gmail.com';

export default function SuggestionsCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / no clipboard permission — silently fail
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h2 className="text-lg font-bold text-white">Have a Suggestion?</h2>
      <p className="text-sm text-text-muted mt-1.5">
        Send ideas, bug reports, or feature requests to my inbox.
      </p>

      <div className="mt-4">
        <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
          Email
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-surface-hover rounded text-sm text-accent font-mono truncate select-all">
            {EMAIL}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-2 rounded text-xs font-semibold transition-colors flex-shrink-0 ${
              copied
                ? 'bg-success/20 text-success'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <a
        href={`mailto:${EMAIL}?subject=NACS%20Suggestion`}
        className="mt-4 block text-center text-sm py-2 rounded bg-surface-hover hover:bg-surface-hover/70 text-text-secondary hover:text-accent transition-colors"
      >
        Or open in mail app →
      </a>
    </div>
  );
}
