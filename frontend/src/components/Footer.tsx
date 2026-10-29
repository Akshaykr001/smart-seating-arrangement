import Link from "next/link";

export function Footer() {
  return (
    <footer className="no-print border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
        <p>Smart Examination Seating &middot; Built for university exam cell coordinators.</p>
        <Link href="/how-it-works" className="text-link">
          How it works
        </Link>
      </div>
    </footer>
  );
}

