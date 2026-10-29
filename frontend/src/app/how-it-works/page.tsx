import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works | Smart Examination Seating",
  description:
    "Learn how Smart Examination Seating creates conflict-free hall plans for exam cell coordinators in three steps.",
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
      <div className="max-w-3xl space-y-10">
        <div className="space-y-3">
        <h1
          id="main-content"
          tabIndex={-1}
          className="text-3xl sm:text-4xl font-serif text-[var(--color-text)]"
        >
          How it works
        </h1>
        <p className="text-lg text-[var(--color-text-muted)]">
          Upload your students, pick a hall, and get a conflict-free exam seating plan in seconds.
        </p>
      </div>

      <ol role="list" className="space-y-6">
        <li className="surface-card p-6 space-y-2">
          <div className="text-sm font-semibold text-[var(--color-accent)]">Step 1 &middot; Students</div>
          <h2 className="text-xl font-serif">Add your student roster</h2>
          <p className="text-base text-[var(--color-text-muted)]">
            Upload a CSV spreadsheet exported from your student records, or explore one of five ready-made exam scenarios. Each row lists a student&apos;s ID, name, section, exam subject, and whether they need an accessible seat.
          </p>
        </li>

        <li className="surface-card p-6 space-y-2">
          <div className="text-sm font-semibold text-[var(--color-accent)]">Step 2 &middot; Hall</div>
          <h2 className="text-xl font-serif">Set your room dimensions</h2>
          <p className="text-base text-[var(--color-text-muted)]">
            Enter the number of rows, benches per row, and seats per bench. A live room diagram updates immediately so you can confirm seat capacity against your student count before generating. Multi-hall setups, accessible-seat locations, diagonal spacing, and invigilator ratios live neatly under Advanced options.
          </p>
        </li>

        <li className="surface-card p-6 space-y-2">
          <div className="text-sm font-semibold text-[var(--color-accent)]">Step 3 &middot; Seating plan</div>
          <h2 className="text-xl font-serif">Review, print, or export</h2>
          <p className="text-base text-[var(--color-text-muted)]">
            Students who require accessible seating are placed first into designated front-row or aisle desks. Everyone else is arranged so students from the same section do not sit side-by-side or directly in front of each other, while also avoiding same-subject neighbors wherever room capacity allows.
          </p>
          <p className="text-base text-[var(--color-text-muted)] pt-1">
            If a crowded hall makes a few shared-subject or shared-section neighbors unavoidable, the plan clearly flags those exact seats so invigilators know where to pay extra attention. When you are ready, download the CSV list or print clean, one-hall-per-page charts.
          </p>
        </li>
      </ol>

      <div className="surface-card p-6 space-y-3">
        <h2 className="text-xl font-serif">Preparing your CSV file</h2>
        <p className="text-base text-[var(--color-text-muted)]">
          Your spreadsheet only needs four or five simple columns: <strong>ID</strong>, <strong>Name</strong> (optional), <strong>Section</strong>, <strong>Subject</strong>, and <strong>Accessible</strong> (<code>Yes</code> or <code>No</code>). You can download a ready-to-fill sample CSV directly on Step 1.
        </p>
      </div>

        <div>
          <Link href="/" className="btn-primary">
            Create a seating plan
          </Link>
        </div>
      </div>
    </div>
  );
}
