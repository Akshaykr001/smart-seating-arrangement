"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isHowItWorks = pathname === "/how-it-works";

  return (
    <header className="no-print bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[var(--color-text)] hover:opacity-90 transition-opacity"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 flex items-center justify-center bg-[var(--color-accent)] text-white"
            style={{ borderRadius: "var(--radius)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="7" height="6" rx="1" />
              <rect x="14" y="4" width="7" height="6" rx="1" />
              <rect x="3" y="14" width="7" height="6" rx="1" />
              <rect x="14" y="14" width="7" height="6" rx="1" />
            </svg>
          </span>
          <span className="font-serif text-lg sm:text-xl font-medium tracking-tight">
            Smart Examination Seating
          </span>
        </Link>

        <nav aria-label="Primary">
          <Link
            href="/how-it-works"
            aria-current={isHowItWorks ? "page" : undefined}
            className={`text-base px-3 py-2 transition-colors ${
              isHowItWorks
                ? "text-[var(--color-accent)] font-semibold underline underline-offset-4"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-medium"
            }`}
            style={{ borderRadius: "var(--radius)" }}
          >
            How it works
          </Link>
        </nav>
      </div>
    </header>
  );
}

