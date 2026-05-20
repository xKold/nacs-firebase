'use client';

import { useState } from 'react';

const DISCORD_USERNAME = 'xKold';
const TWITTER_URL = 'https://x.com/xKoldcs';
const TWITTER_HANDLE = '@xKoldcs';

export default function SocialsCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(DISCORD_USERNAME);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / no clipboard permission — silently fail
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h2 className="text-lg font-bold text-white">Or DM Me Here</h2>
      <p className="text-sm text-text-muted mt-1.5">
        Skip the email and reach out directly:
      </p>

      <div className="mt-4 space-y-3">
        {/* Discord */}
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <DiscordIcon /> Discord
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-surface-hover rounded text-sm text-accent font-mono truncate select-all">
              {DISCORD_USERNAME}
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

        {/* Twitter / X */}
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
            <TwitterIcon /> Twitter / X
          </p>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded bg-surface-hover hover:bg-surface-hover/70 text-sm text-accent hover:text-accent/90 font-mono transition-colors"
          >
            <span className="truncate">{TWITTER_HANDLE}</span>
            <span className="text-text-muted flex-shrink-0 ml-2">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-text-muted"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-text-muted"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
