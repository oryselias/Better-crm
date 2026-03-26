export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
        <p className="eyebrow">Lab Reports</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Report ingestion is designed for review, not mystery.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
          The current slice stores raw source references, parsed JSON, parser
          metadata, and review state so OCR and extraction can arrive without
          changing the contract.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
          <p className="text-lg font-semibold tracking-[-0.03em]">
            First-slice ingestion contract
          </p>
          <div className="mt-5 space-y-4">
            {[
              "Store source file path, display name, and checksum.",
              "Persist parsed payloads as JSONB for structured extraction output.",
              "Track parser version, confidence, and reviewer metadata.",
              "Emit audit events for every report mutation.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/60 bg-white/60 p-5 text-sm leading-6 text-[var(--muted)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
          <p className="text-lg font-semibold tracking-[-0.03em]">
            Next ingestion milestones
          </p>
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--muted)]">
            <p>1. Storage upload flow for raw PDF files.</p>
            <p>2. OCR and extraction pipeline with parser versioning.</p>
            <p>3. Clinician review workflow before patient-facing delivery.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
