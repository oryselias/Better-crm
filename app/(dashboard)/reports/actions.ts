"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "lab-reports";

export async function uploadReport(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("No clinic profile");

  const file = formData.get("file") as File;
  const patientId = (formData.get("patient_id") as string) || null;

  if (!file || file.size === 0) throw new Error("No file provided");

  // Ensure bucket exists
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false });
  }

  const bytes = await file.arrayBuffer();
  const checksum = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const storagePath = `${profile.clinic_id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase.from("lab_reports").insert({
    clinic_id: profile.clinic_id,
    patient_id: patientId,
    source_file_path: storagePath,
    source_file_name: file.name,
    source_file_checksum: checksum,
    parser_version: "stub-v1",
    review_state: "pending",
    created_by: user.id,
  });

  if (dbError) throw new Error(dbError.message);
  revalidatePath("/reports");
}

export async function updateReviewState(id: string, state: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("lab_reports")
    .update({ review_state: state, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}

export async function triggerReportParsing(id: string) {
  const response = await fetch(`/api/reports/${id}/parse`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to parse report");
  }
  
  revalidatePath("/reports");
  return response.json();
}

export async function generateReportPDF(id: string) {
  const response = await fetch(`/api/reports/${id}/pdf`, {
    method: "POST",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate PDF");
  }
  
  revalidatePath("/reports");
  return response.json();
}

export async function downloadReportPDF(id: string) {
  const response = await fetch(`/api/reports/${id}/pdf`);
  
  if (!response.ok) {
    throw new Error("Failed to download PDF");
  }
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lab-report-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
