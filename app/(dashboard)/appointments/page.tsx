export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
        <p className="eyebrow">Appointments</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Scheduling is wired into the foundation, not added as an afterthought.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">
          Appointment records are linked to patients and clinics so reminders,
          report workflows, and billing follow-ups can land without reworking
          the data model later.
        </p>
      </section>

      <section className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Status states", "Scheduled, checked in, completed, and cancelled are part of the first pass."],
            ["Team ownership", "Created-by links keep operational accountability visible."],
            ["Future hooks", "WhatsApp reminders and staff workflows attach cleanly in the next slices."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-[1.5rem] border border-white/60 bg-white/60 p-5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
