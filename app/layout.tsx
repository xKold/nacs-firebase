'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <html lang="en">
      <body>
        {/* Navigation Bar */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-surface/95 backdrop-blur-md shadow-lg shadow-black/20'
              : 'bg-transparent'
          }`}
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/icon.png"
                alt="NACS"
                width={36}
                height={36}
                className="rounded-full transition-transform duration-200 group-hover:scale-110"
              />
              <span className="text-lg font-bold tracking-wide text-text">
                NACS
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-200"
              >
                Events
              </Link>
              <Link
                href="/matches"
                className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-200"
              >
                Matches
              </Link>
            </div>
          </div>
        </nav>

        {/* Banner */}
        <div className="relative w-full h-[280px] overflow-hidden">
          <Image
            src="/bannerfix.png"
            alt="NACS Banner"
            width={3000}
            height={664}
            className="w-full h-full object-cover object-[center_40%]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-transparent to-bg" />
        </div>

        {/* Main Content */}
        <main className="relative -mt-12 z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-20 pb-8 text-center text-xs text-text-muted">
          Powered by North American Counter Strike
        </footer>
      </body>
    </html>
  );
}
