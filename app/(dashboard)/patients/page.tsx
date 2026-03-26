export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
        <p className="eyebrow">Patients</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Clinic-scoped patient records start simple and stay extensible.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
          Slice one establishes the patient table, clinic isolation, audit-ready
          mutations, and the minimum fields needed for identity and contact.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {[
          ["Identity", "Full name, DOB, sex, external ID, and patient notes."],
          ["Contact", "WhatsApp number and email stay close to the patient record for future outreach."],
          ["Compliance", "Every mutation is clinic-scoped and ready to emit an audit event."],
        ].map(([title, copy]) => (
          <div
            key={title}
            className="surface rounded-[1.75rem] border border-[var(--line)] px-5 py-5"
          >
            <p className="text-lg font-semibold tracking-[-0.03em]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
