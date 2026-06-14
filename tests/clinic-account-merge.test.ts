import {
  mergeClinicAccounts,
  pickPrimaryProfile,
  isOrphanUsedInvite,
} from "../lib/admin/clinic-account-merge";

function runTests() {
  console.log("Running clinic-account merge unit tests...\n");

  const primary = pickPrimaryProfile([
    { id: "u2", clinic_id: "c1", role: "lab_staff" },
    { id: "u1", clinic_id: "c1", role: "admin" },
  ]);

  if (primary?.id === "u1") {
    console.log("✅ picks admin profile as primary");
  } else {
    console.error("❌ primary profile selection failed");
    process.exit(1);
  }

  const merged = mergeClinicAccounts({
    clinics: [{ id: "c1", name: "Aether", status: "active", created_at: "2026-01-01T00:00:00Z" }],
    profiles: [{ id: "u1", clinic_id: "c1", role: "admin" }],
    invites: [
      {
        id: "i1",
        email: "owner@clinic.com",
        clinic_id: "c1",
        clinic_name: null,
        role: "admin",
        used_at: "2026-01-02T00:00:00Z",
        used_by: "u1",
      },
    ],
    emailsByUserId: new Map([["u1", "owner@clinic.com"]]),
  });

  if (merged.length === 1 && merged[0].email === "owner@clinic.com" && merged[0].clinicName === "Aether") {
    console.log("✅ merges clinics with invite + profile data");
  } else {
    console.error("❌ clinic account merge failed", merged);
    process.exit(1);
  }

  const orphan = isOrphanUsedInvite(
    {
      id: "i2",
      email: "stuck@clinic.com",
      clinic_id: "c2",
      clinic_name: null,
      role: "admin",
      used_at: "2026-01-02T00:00:00Z",
      used_by: null,
    },
    0,
  );

  if (orphan) {
    console.log("✅ detects orphan used invite");
  } else {
    console.error("❌ orphan invite detection failed");
    process.exit(1);
  }

  console.log("\nAll clinic-account merge tests passed.");
}

runTests();
