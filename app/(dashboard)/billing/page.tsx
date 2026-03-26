export default function BillingPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
        <p className="eyebrow">Billing</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Billing is intentionally deferred, but not optional.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
          This section stays visible so the business model remains in frame while
          the foundation work lands.
        </p>
      </section>

      {/* TODO: BLOCKER for slice 3. Billing must graduate from placeholder to workflow before production clinic rollout. */}
      <section className="rounded-[2rem] border border-[var(--warning)]/20 bg-[var(--warning-soft)] px-6 py-6 md:px-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-[var(--warning)] uppercase">
          Slice 3 blocker
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--warning)] md:text-base">
          Invoices, payment collection, and follow-up automation are deferred to
          a later slice, but this is a business-critical dependency rather than a
          nice-to-have backlog item.
        </p>
      </section>
    </div>
  );
}
