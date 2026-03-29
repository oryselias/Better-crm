export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
          Billing
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Intentionally deferred, but not optional.
        </p>
      </div>

      <section className="surface rounded-[2rem] border border-outline-variant/30 px-6 py-6 md:px-8">
        <p className="max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">
          This section stays visible so the business model remains in frame while
          the foundation work lands. Invoices, payment collection, and follow-up
          automation are deferred to a later slice.
        </p>
      </section>

      <section className="rounded-[2rem] border border-amber-500/20 bg-amber-500/10 px-6 py-6 md:px-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-amber-400 uppercase">
          Slice 3 blocker
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-amber-400/80 md:text-base">
          Billing is a business-critical dependency for clinic rollout, not a
          backlog nice-to-have.
        </p>
      </section>
    </div>
  );
}
